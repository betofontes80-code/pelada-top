// Pelada Top - Painel de Diagnóstico do Servidor, SSE & Simulação Geofence 500m

// Estado da Aplicação
const state = {
  athletes: [],
  selectedAthleteId: null,
  activeDistance: 120, // metros inicial
  isAdminAuthenticated: false,
  gpsRuleActive: true,
  matchStatus: 'EM ESPERA',
  sseConnected: false,
  pingHistory: [],
  eventSource: null
};

// Atletas mockados padrão para caso a API esteja vazia
const DEFAULT_MOCK_ATHLETES = [
  { id: 1, nome: 'Lucas Silva', apelido: 'Lucas', posicao: 'MEI', idade: 24, peso: 76, condicaoFisica: '100% Fit', email: 'lucas.silva@peladatop.internal', statusPresenca: 'confirmado', distanciaMetros: 120 },
  { id: 2, nome: 'Matheus Santos', apelido: 'Theus', posicao: 'ATA', idade: 26, peso: 80, condicaoFisica: '100% Fit', email: 'matheus.santos@peladatop.internal', statusPresenca: 'pendente', distanciaMetros: 1800 },
  { id: 3, nome: 'Rodrigo Faro', apelido: 'Faro', posicao: 'ZAG', idade: 29, peso: 84, condicaoFisica: '80% Boa', email: 'rodrigo.faro@peladatop.internal', statusPresenca: 'confirmado', distanciaMetros: 350 },
  { id: 4, nome: 'Gabriel Medina', apelido: 'Biel', posicao: 'LAT', idade: 23, peso: 72, condicaoFisica: '100% Fit', email: 'gabriel.medina@peladatop.internal', statusPresenca: 'pendente', distanciaMetros: 2200 },
  { id: 5, nome: 'Diego Cavalieri', apelido: 'Diego', posicao: 'GOL', idade: 31, peso: 88, condicaoFisica: '100% Fit', email: 'diego.cav@peladatop.internal', statusPresenca: 'confirmado', distanciaMetros: 80 }
];

// Helper de log no terminal
function logTerminal(source, message, type = 'info') {
  const terminalEl = document.getElementById('terminalLog');
  if (!terminalEl) return;

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

  let colorClass = 'text-slate-300';
  if (type === 'success') colorClass = 'text-emerald-400';
  if (type === 'warning') colorClass = 'text-amber-400';
  if (type === 'error') colorClass = 'text-red-400';
  if (type === 'sse') colorClass = 'text-cyan-400';

  const entry = document.createElement('div');
  entry.className = 'py-0.5 leading-relaxed break-all';
  entry.innerHTML = `<span class="text-slate-500">[${timeStr}]</span> <span class="font-bold text-slate-400">[${source}]</span> <span class="${colorClass}">${message}</span>`;
  
  terminalEl.appendChild(entry);
  terminalEl.scrollTop = terminalEl.scrollHeight;
}

// Inicialização da conexão SSE
function initSSE() {
  if (state.eventSource) {
    state.eventSource.close();
  }

  const sseBadge = document.getElementById('sseStatusBadge');
  const sseChannels = document.getElementById('sseChannels');

  try {
    const sseUrl = '/events/match-stream';
    state.eventSource = new EventSource(sseUrl);

    state.eventSource.onopen = () => {
      state.sseConnected = true;
      if (sseBadge) {
        sseBadge.textContent = 'CONECTADO';
        sseBadge.className = 'px-2 py-0.5 text-xs font-mono font-bold rounded bg-emerald-100 text-emerald-700 border border-emerald-300';
      }
      if (sseChannels) sseChannels.textContent = 'Canais: 4 ativos';
      logTerminal('SSE', 'Conexão aberta com /events/match-stream via HTTP/2 Keep-Alive', 'success');
    };

    state.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleSSEEvent(data);
      } catch (e) {
        logTerminal('SSE_RAW', event.data, 'sse');
      }
    };

    state.eventSource.onerror = (err) => {
      state.sseConnected = false;
      if (sseBadge) {
        sseBadge.textContent = 'RECONECTANDO';
        sseBadge.className = 'px-2 py-0.5 text-xs font-mono font-bold rounded bg-amber-100 text-amber-700 border border-amber-300';
      }
      logTerminal('SSE_WARN', 'Conexão SSE oscilou. Reestabelecendo stream...', 'warning');
    };
  } catch (err) {
    console.error('Erro ao iniciar SSE:', err);
    logTerminal('SSE_ERROR', 'Falha ao inicializar EventSource: ' + err.message, 'error');
  }
}

// Manipulador de eventos recebidos via SSE
function handleSSEEvent(data) {
  if (!data) return;
  const tipo = data.type || 'EVENT';

  if (tipo === 'PING') {
    // Heartbeat silencioso
    return;
  }

  if (tipo === 'CONNECTED') {
    logTerminal('SSE', `Handshake de sincronização recebido (versão: ${data.version || Date.now()})`, 'sse');
    return;
  }

  if (tipo === 'GEOFENCE') {
    const statusText = data.dentroRaio ? 'DENTRO DO RAIO (≤500m)' : 'FORA DO RAIO (>500m)';
    const statusColor = data.dentroRaio ? 'success' : 'error';
    logTerminal('GEOFENCE', `Atleta ID #${data.athleteId} registrou ${data.distanceMeters}m -> ${statusText}`, statusColor);
    return;
  }

  if (tipo === 'CHECK_IN') {
    logTerminal('CHECK_IN', `Check-in confirmado com sucesso para ${data.atleta || 'Atleta'}! Distância: ${data.distanciaMetros || 0}m`, 'success');
    carregarAtletas();
    return;
  }

  if (tipo === 'ATHLETE_ADDED' || tipo === 'ATHLETE_UPDATED') {
    logTerminal('DB_SYNC', `Base de atletas atualizada: ${data.nome || 'Atleta'}`, 'info');
    carregarAtletas();
    return;
  }

  logTerminal('SSE', `Evento [${tipo}]: ${JSON.stringify(data)}`, 'sse');
}

// Carregar lista de atletas da API
async function carregarAtletas() {
  try {
    const res = await fetch('/api/atletas');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    if (Array.isArray(data) && data.length > 0) {
      state.athletes = data;
    } else {
      // Usa atletas mockados padrão se o banco estiver vazio
      state.athletes = DEFAULT_MOCK_ATHLETES;
    }
  } catch (err) {
    console.warn('Usando atletas mockados de fallback:', err.message);
    if (!state.athletes.length) {
      state.athletes = DEFAULT_MOCK_ATHLETES;
    }
  }

  renderAtletasDropdown();
  atualizarKpis();
}

// Renderiza dropdown de atletas
function renderAtletasDropdown() {
  const select = document.getElementById('selectAtleta');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '';

  state.athletes.forEach((atleta, idx) => {
    const opt = document.createElement('option');
    const id = atleta.id || (idx + 1);
    opt.value = id;
    
    const cond = atleta.condicaoFisica || atleta.condicao || '100% Fit';
    const pos = atleta.posicao || 'MEI';
    const idade = atleta.idade || 25;
    const peso = atleta.peso || 75;
    
    opt.textContent = `${atleta.nome || atleta.apelido} — ${pos} | ${idade} anos, ${peso}kg (${cond})`;
    select.appendChild(opt);
  });

  if (currentVal && state.athletes.some(a => String(a.id) === String(currentVal))) {
    select.value = currentVal;
    state.selectedAthleteId = currentVal;
  } else if (state.athletes.length > 0) {
    select.value = state.athletes[0].id || 1;
    state.selectedAthleteId = select.value;
  }

  preencherFormularioAtleta();
}

// Preenche formulário com dados do atleta selecionado
function preencherFormularioAtleta() {
  const atleta = getAtletaSelecionado();
  if (!atleta) return;

  document.getElementById('inputNome').value = atleta.nome || '';
  document.getElementById('inputApelido').value = atleta.apelido || atleta.nome || '';
  document.getElementById('selectPosicao').value = atleta.posicao || 'MEI';
  document.getElementById('inputEmail').value = atleta.email || `${(atleta.nome || 'atleta').toLowerCase().replace(/\s+/g, '.')}@peladatop.internal`;
  document.getElementById('inputIdade').value = atleta.idade || 25;
  document.getElementById('inputPeso').value = atleta.peso || 75;
  document.getElementById('selectCondicao').value = atleta.condicaoFisica || atleta.condicao || '100% Fit';

  // Atualiza banner de simulação de presença
  atualizarSimulacaoView();
}

// Retorna atleta atualmente selecionado no select
function getAtletaSelecionado() {
  const select = document.getElementById('selectAtleta');
  const selId = select ? select.value : state.selectedAthleteId;
  return state.athletes.find(a => String(a.id) === String(selId)) || state.athletes[0];
}

// Atualiza cartões de KPIs
function atualizarKpis() {
  const totalEl = document.getElementById('kpiTotalAtletas');
  const confirmadosEl = document.getElementById('kpiConfirmados');
  if (totalEl) totalEl.textContent = state.athletes.length;

  const confirmados = state.athletes.filter(a => a.statusPresenca === 'confirmado' || a.chegadaConfirmada === true).length;
  if (confirmadosEl) confirmadosEl.textContent = `/ ${confirmados} Confirmados`;
}

// Teste de Ping e RTT
async function testarPing() {
  const btn = document.getElementById('btnTestarPing');
  const pingDisplay = document.getElementById('kpiPingDisplay');
  const jitterDisplay = document.getElementById('kpiJitterDisplay');
  const pingTerminal = document.getElementById('pingTerminalLog');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> TESTANDO...';
  }

  const start = performance.now();
  try {
    const res = await fetch('/api/v2/ping?t=' + Date.now());
    const rtt = Math.round(performance.now() - start);
    const data = await res.json();

    state.pingHistory.push(rtt);
    if (state.pingHistory.length > 10) state.pingHistory.shift();

    const min = Math.min(...state.pingHistory);
    const max = Math.max(...state.pingHistory);
    const avg = Math.round(state.pingHistory.reduce((a, b) => a + b, 0) / state.pingHistory.length);
    const jitter = (Math.abs(rtt - avg) / 2).toFixed(1);

    if (pingDisplay) pingDisplay.textContent = `${rtt} ms avg`;
    if (jitterDisplay) jitterDisplay.textContent = `<${jitter}ms`;

    const logEntry = document.createElement('div');
    logEntry.className = 'py-0.5 text-xs font-mono';
    logEntry.innerHTML = `<span class="text-emerald-400">HTTP/2 200 OK</span> | RTT: <span class="font-bold text-white">${rtt}ms</span> | min/avg/max: ${min}/${avg}/${max}ms | server_time: ${data.time || Date.now()}`;
    if (pingTerminal) {
      pingTerminal.appendChild(logEntry);
      pingTerminal.scrollTop = pingTerminal.scrollHeight;
    }

    logTerminal('PING', `Round-trip concluído: ${rtt}ms (status: ${data.status || 'ok'})`, 'success');
  } catch (err) {
    logTerminal('PING_ERROR', 'Falha na requisição de ping: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons text-sm mr-1.5 align-middle">speed</span> TESTAR PING AGORA';
    }
  }
}

// Testar login simulado como jogador
function testarLoginJogador() {
  const atleta = getAtletaSelecionado();
  if (!atleta) return;

  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + btoa(JSON.stringify({
    sub: atleta.id || 1,
    nome: atleta.nome,
    posicao: atleta.posicao,
    role: 'jogador',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  })) + '.simulatedSignatureMockKey';

  logTerminal('JWT_AUTH', `Token emitido para Jogador [${atleta.nome}]: Bearer ${mockToken.slice(0, 32)}...`, 'success');
  
  // Feedback visual no botão
  const btn = document.getElementById('btnLoginJogador');
  if (btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="text-emerald-300 font-bold">✓ TOKEN GERADO COM SUCESSO!</span>';
    setTimeout(() => { btn.innerHTML = originalText; }, 2000);
  }
}

// Cadastrar novo jogador via POST /api/v2/athletes
async function cadastrarNovoJogador() {
  const nome = document.getElementById('inputNome').value.trim();
  const apelido = document.getElementById('inputApelido').value.trim() || nome;
  const posicao = document.getElementById('selectPosicao').value;
  const email = document.getElementById('inputEmail').value.trim();
  const idade = parseInt(document.getElementById('inputIdade').value, 10) || 25;
  const peso = parseFloat(document.getElementById('inputPeso').value) || 75;
  const condicaoFisica = document.getElementById('selectCondicao').value;

  if (!nome) {
    alert('Informe o nome do atleta para cadastrar.');
    return;
  }

  const payload = {
    nome,
    apelido,
    posicao,
    email,
    idade,
    peso,
    condicaoFisica,
    statusPresenca: 'pendente',
    distanciaMetros: 2500
  };

  const btn = document.getElementById('btnCadastrarJogador');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> SALVANDO...';
  }

  try {
    const res = await fetch('/api/v2/athletes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    logTerminal('CADASTRO', `Atleta [${nome} (${posicao})] cadastrado com sucesso! ID: ${data.id || data.atleta?.id || 'Novo'}`, 'success');

    // Recarrega lista
    await carregarAtletas();

    // Seleciona o novo atleta cadastrado
    const select = document.getElementById('selectAtleta');
    if (select && select.lastChild) {
      select.value = select.lastChild.value;
      preencherFormularioAtleta();
    }
  } catch (err) {
    logTerminal('CADASTRO_ERRO', 'Erro ao cadastrar atleta: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons text-sm mr-1.5 align-middle">person_add</span> 2. CADASTRAR NOVO JOGADOR';
    }
  }
}

// Autenticar como Superadmin
function autenticarAdmin() {
  const email = document.getElementById('adminEmail').value.trim();
  const token = document.getElementById('adminToken').value.trim();

  if (!token) {
    alert('Insira o Token Master ADM para autenticar.');
    return;
  }

  state.isAdminAuthenticated = true;
  logTerminal('SUPERADMIN', `Credenciais validadas para [${email}]. Role: SUPERADMIN #1 ativado.`, 'warning');

  const badge = document.getElementById('adminAuthStatus');
  if (badge) {
    badge.textContent = 'AUTENTICADO';
    badge.className = 'px-2 py-0.5 text-xs font-mono font-bold rounded bg-emerald-100 text-emerald-700 border border-emerald-300';
  }

  const btn = document.getElementById('btnAutenticarAdmin');
  if (btn) {
    btn.innerHTML = '✓ SUPERADMIN AUTORIZADO';
    btn.className = 'w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-sm';
  }
}

// Alternar status da regra de GPS 500m
function toggleGpsRule() {
  state.gpsRuleActive = !state.gpsRuleActive;
  const btn = document.getElementById('btnToggleGps');
  if (btn) {
    btn.textContent = state.gpsRuleActive ? 'ATIVO (500m)' : 'DESATIVADO';
    btn.className = state.gpsRuleActive
      ? 'px-3 py-1.5 text-xs font-bold rounded bg-emerald-100 text-emerald-700 border border-emerald-300'
      : 'px-3 py-1.5 text-xs font-bold rounded bg-slate-100 text-slate-700 border border-slate-300';
  }
  logTerminal('ADMIN_RULE', `Regra de Check-in GPS 500m agora está: ${state.gpsRuleActive ? 'ATIVA' : 'DESATIVADA'}`, 'warning');
}

// Alternar status da partida
function toggleMatchStatus() {
  const statuses = ['EM ESPERA', 'EM ANDAMENTO', 'FINALIZADA'];
  const nextIdx = (statuses.indexOf(state.matchStatus) + 1) % statuses.length;
  state.matchStatus = statuses[nextIdx];

  const btn = document.getElementById('btnToggleMatch');
  if (btn) {
    btn.textContent = state.matchStatus;
    if (state.matchStatus === 'EM ANDAMENTO') {
      btn.className = 'px-3 py-1.5 text-xs font-bold rounded bg-brand-red text-white';
    } else if (state.matchStatus === 'FINALIZADA') {
      btn.className = 'px-3 py-1.5 text-xs font-bold rounded bg-slate-800 text-white';
    } else {
      btn.className = 'px-3 py-1.5 text-xs font-bold rounded bg-amber-100 text-amber-800 border border-amber-300';
    }
  }
  logTerminal('MATCH', `Status da partida alterado para: ${state.matchStatus}`, 'info');
}

// Sorteio de times simulado
function sortearTimes() {
  logTerminal('ALGORITMO', 'Executando balanceamento dinâmico de times (Equilíbrio de posições e notas)...', 'info');
  setTimeout(() => {
    logTerminal('ALGORITMO', 'Times balanceados com sucesso! Time Vermelho vs Time Branco definidos.', 'success');
  }, 400);
}

// Salvar alterações rápidas do atleta
async function salvarAlteracoesAtleta() {
  const atleta = getAtletaSelecionado();
  if (!atleta) return;

  const nome = document.getElementById('inputNome').value.trim();
  const apelido = document.getElementById('inputApelido').value.trim();
  const posicao = document.getElementById('selectPosicao').value;
  const email = document.getElementById('inputEmail').value.trim();
  const idade = parseInt(document.getElementById('inputIdade').value, 10) || atleta.idade;
  const peso = parseFloat(document.getElementById('inputPeso').value) || atleta.peso;
  const condicaoFisica = document.getElementById('selectCondicao').value;

  atleta.nome = nome;
  atleta.apelido = apelido;
  atleta.posicao = posicao;
  atleta.email = email;
  atleta.idade = idade;
  atleta.peso = peso;
  atleta.condicaoFisica = condicaoFisica;

  logTerminal('ATLETA_UPDATE', `Dados de [${nome}] atualizados com sucesso.`, 'success');
  renderAtletasDropdown();
}

// Excluir atleta
function excluirAtleta() {
  const atleta = getAtletaSelecionado();
  if (!atleta) return;

  if (confirm(`Deseja remover ${atleta.nome} da base de testes?`)) {
    state.athletes = state.athletes.filter(a => a !== atleta);
    logTerminal('ATLETA_DELETE', `Atleta [${atleta.nome}] removido da base de dados.`, 'warning');
    renderAtletasDropdown();
  }
}

// Simulação de Geofence: Envia POST /api/v2/geofence-test
async function simularDistancia(metros, label) {
  state.activeDistance = metros;
  const atleta = getAtletaSelecionado();
  const athleteId = atleta ? (atleta.id || 1) : 1;

  logTerminal('SIMULACAO_GPS', `Alterando posição do atleta #${athleteId} para: ${metros === null ? 'Reset' : metros + 'm'} (${label})`, 'info');

  try {
    const res = await fetch('/api/v2/geofence-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athleteId, distanceMeters: metros })
    });

    const data = await res.json();
    if (atleta) {
      atleta.distanciaMetros = metros;
    }
  } catch (err) {
    console.warn('Erro ao disparar simulação no backend:', err);
  }

  atualizarSimulacaoView();
}

// Atualiza a visualização do card de Simulação GPS
function atualizarSimulacaoView() {
  const atleta = getAtletaSelecionado();
  const nomeAtleta = atleta ? (atleta.nome || 'Atleta') : 'Atleta';
  const posAtleta = atleta ? (atleta.posicao || 'MEI') : 'MEI';
  const dist = state.activeDistance;

  const labelAtletaEl = document.getElementById('simAtletaLabel');
  const badgeFaixaEl = document.getElementById('simFaixaBadge');
  const btnConfirmarEl = document.getElementById('btnExecutarConfirmacao');

  if (labelAtletaEl) {
    labelAtletaEl.textContent = `${nomeAtleta} (${posAtleta}) — ${dist === null ? 'Sem GPS' : dist + ' metros'}`;
  }

  // Avaliação das 3 Faixas
  if (dist === null || dist > 1500) {
    // Faixa 1: Longe (> 1.5 km)
    if (badgeFaixaEl) {
      badgeFaixaEl.textContent = '🔴 FAIXA 1: LONGE (> 1.5 km) — Check-in bloqueado';
      badgeFaixaEl.className = 'p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold';
    }
    if (btnConfirmarEl) {
      btnConfirmarEl.disabled = true;
      btnConfirmarEl.className = 'w-full py-3 px-4 bg-slate-200 text-slate-400 font-bold text-xs uppercase tracking-wider rounded-lg cursor-not-allowed';
      btnConfirmarEl.textContent = '1. EXECUTAR 1ª CONFIRMAÇÃO (BLOQUEADO: FORA DO RAIO DE 500m)';
    }
  } else if (dist > 500) {
    // Faixa 2: Próximo (501m - 1500m)
    if (badgeFaixaEl) {
      badgeFaixaEl.textContent = '🟡 FAIXA 2: PRÓXIMO (501m - 1500m) — A caminho da Arena';
      badgeFaixaEl.className = 'p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold';
    }
    if (btnConfirmarEl) {
      btnConfirmarEl.disabled = true;
      btnConfirmarEl.className = 'w-full py-3 px-4 bg-slate-200 text-slate-400 font-bold text-xs uppercase tracking-wider rounded-lg cursor-not-allowed';
      btnConfirmarEl.textContent = '1. EXECUTAR 1ª CONFIRMAÇÃO (BLOQUEADO: A CAMINHO DA ARENA)';
    }
  } else {
    // Faixa 3: No Campo (≤ 500m)
    if (badgeFaixaEl) {
      badgeFaixaEl.textContent = '🟢 FAIXA 3: NO CAMPO (≤ 500m) — Chegada Autorizada!';
      badgeFaixaEl.className = 'p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold shadow-sm';
    }
    if (btnConfirmarEl) {
      btnConfirmarEl.disabled = false;
      btnConfirmarEl.className = 'w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md';
      btnConfirmarEl.textContent = '⚽ 1. EXECUTAR 1ª CONFIRMAÇÃO (ENTRAR NA LISTA)';
    }
  }
}

// Executar confirmação de presença (Check-in)
async function executarConfirmacaoPresenca() {
  const atleta = getAtletaSelecionado();
  if (!atleta) return;

  if (state.activeDistance > 500) {
    alert('Check-in bloqueado: Você está fora do raio de 500 metros do campo!');
    return;
  }

  const btn = document.getElementById('btnExecutarConfirmacao');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> PROCESSANDO CHECK-IN...';
  }

  try {
    atleta.statusPresenca = 'confirmado';
    atleta.chegadaConfirmada = true;
    atleta.distanciaMetros = state.activeDistance;

    logTerminal('CHECK_IN', `Check-in confirmado com sucesso para [${atleta.nome}]! Registrado na lista oficial de presença.`, 'success');
    atualizarKpis();
    renderAtletasDropdown();

    if (btn) {
      btn.innerHTML = '✓ CONFIRMAÇÃO REALIZADA COM SUCESSO!';
      setTimeout(() => { atualizarSimulacaoView(); }, 2500);
    }
  } catch (e) {
    logTerminal('CHECK_IN_ERROR', 'Falha ao confirmar presença: ' + e.message, 'error');
  }
}

// Copiar link público com toast feedback
function copiarLinkPublico() {
  const input = document.getElementById('inputPublicLink');
  const toast = document.getElementById('toastCopiado');
  if (!input) return;

  navigator.clipboard.writeText(input.value).then(() => {
    if (toast) {
      toast.classList.remove('opacity-0', 'pointer-events-none');
      toast.classList.add('opacity-100');
      setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0', 'pointer-events-none');
      }, 2000);
    }
    logTerminal('CLIPBOARD', 'Link de acesso à pelada copiado para área de transferência: ' + input.value, 'info');
  }).catch(() => {
    input.select();
    document.execCommand('copy');
    alert('Link copiado!');
  });
}

// Limpar terminal
function limparTerminal() {
  const terminalEl = document.getElementById('terminalLog');
  if (terminalEl) {
    terminalEl.innerHTML = '';
    logTerminal('SISTEMA', 'Terminal limpo pelo operador.', 'info');
  }
}

// Event Listeners e Inicialização Robusta
function bootApp() {
  // Ajusta o link de acesso público para o host atual da máquina / rede
  const publicLinkEl = document.getElementById('inputPublicLink');
  if (publicLinkEl && window.location && window.location.origin) {
    publicLinkEl.value = `${window.location.origin}/teste`;
  }

  // Inicializa componentes
  initSSE();
  carregarAtletas();
  testarPing();

  // Dropdown de atleta
  const selectAtleta = document.getElementById('selectAtleta');
  if (selectAtleta) {
    selectAtleta.addEventListener('change', preencherFormularioAtleta);
  }

  // Ping button
  const btnPing = document.getElementById('btnTestarPing');
  if (btnPing) btnPing.addEventListener('click', testarPing);

  // Login Jogador
  const btnLogin = document.getElementById('btnLoginJogador');
  if (btnLogin) btnLogin.addEventListener('click', testarLoginJogador);

  // Cadastro Jogador
  const btnCadastrar = document.getElementById('btnCadastrarJogador');
  if (btnCadastrar) btnCadastrar.addEventListener('click', cadastrarNovoJogador);

  // Superadmin
  const btnAdmin = document.getElementById('btnAutenticarAdmin');
  if (btnAdmin) btnAdmin.addEventListener('click', autenticarAdmin);

  const btnToggleGps = document.getElementById('btnToggleGps');
  if (btnToggleGps) btnToggleGps.addEventListener('click', toggleGpsRule);

  const btnToggleMatch = document.getElementById('btnToggleMatch');
  if (btnToggleMatch) btnToggleMatch.addEventListener('click', toggleMatchStatus);

  const btnSortear = document.getElementById('btnSortearTimes');
  if (btnSortear) btnSortear.addEventListener('click', sortearTimes);

  const btnSalvar = document.getElementById('btnSalvarAtleta');
  if (btnSalvar) btnSalvar.addEventListener('click', salvarAlteracoesAtleta);

  const btnExcluir = document.getElementById('btnExcluirAtleta');
  if (btnExcluir) btnExcluir.addEventListener('click', excluirAtleta);

  // Simulação de GPS
  document.getElementById('btnGpsLonge')?.addEventListener('click', () => simularDistancia(3800, 'Longe 3.8 km'));
  document.getElementById('btnGpsProximo')?.addEventListener('click', () => simularDistancia(850, 'Próximo 850 m'));
  document.getElementById('btnGpsChegou')?.addEventListener('click', () => simularDistancia(120, 'No Campo 120 m'));
  document.getElementById('btnGpsReset')?.addEventListener('click', () => simularDistancia(null, 'Resetar GPS'));

  // Confirmação
  document.getElementById('btnExecutarConfirmacao')?.addEventListener('click', executarConfirmacaoPresenca);

  // Copiar link
  document.getElementById('btnCopiarLink')?.addEventListener('click', copiarLinkPublico);

  // Limpar terminal
  document.getElementById('btnLimparTerminal')?.addEventListener('click', limparTerminal);

  // Atualizar status header
  document.getElementById('btnAtualizarStatus')?.addEventListener('click', () => {
    testarPing();
    carregarAtletas();
    logTerminal('SISTEMA', 'Status e dados sincronizados com o servidor.', 'info');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
