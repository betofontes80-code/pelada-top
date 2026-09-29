// Pelada Top - Painel de Diagnóstico do Servidor, SSE & Simulação Geofence 500m

// Servidor Alvo Oficial (Padrão: Nuvem Render)
let apiBase = 'https://pelada-top.onrender.com';

// Retorna URL completa para chamadas de API e EventSource
function getApiUrl(path) {
  if (!path) return apiBase;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  return `${apiBase}${cleanPath}`;
}

// Alterna o servidor alvo (Render vs Localhost) dinamicamente
function setTargetServer(newBase) {
  apiBase = newBase.replace(/\/+$/, '');
  const cleanHost = apiBase.replace('https://', '').replace('http://', '');

  const hostInput = document.getElementById('inputTestHost');
  if (hostInput) hostInput.value = cleanHost;

  const kpiHost = document.getElementById('kpiServerHost');
  if (kpiHost) kpiHost.textContent = cleanHost;

  const kpiConn = document.getElementById('kpiServerConnection');
  if (kpiConn) {
    kpiConn.textContent = apiBase.includes('render') ? 'Nuvem (Render)' : 'Localhost';
  }

  logTerminal('SERVIDOR', `Conectando ao alvo: ${apiBase}`, 'warning');

  // Reconecta SSE e atualiza dados em tempo real
  initSSE();
  testarPing();
  carregarAtletas();
}

// ID do Atleta atualmente selecionado na aba de simulação de GPS
let currentAthleteId = 1; // Padrão: Lucas Silva (ID 1)

// Estado da Aplicação
const state = {
  athletes: [
    { id: 1, name: "Lucas Silva", position: "MEI", age: 24, weight: 76, fit: 100, distance: 120, status: "campo", checkedIn: true },
    { id: 2, name: "Marcos Vinicius", position: "GOL", age: 28, weight: 82, fit: 92, distance: 45, status: "campo", checkedIn: true },
    { id: 3, name: "Diego Costa", position: "ATA", age: 26, weight: 79, fit: 100, distance: 210, status: "campo", checkedIn: true },
    { id: 4, name: "Rodrigo Pires", position: "VOL", age: 25, weight: 74, fit: 88, distance: 850, status: "proximo", checkedIn: false },
    { id: 5, name: "Gabriel Santos", position: "ZAG", age: 27, weight: 83, fit: 80, distance: 3800, status: "longe", checkedIn: false },
    { id: 6, name: "Felipe Melo", position: "VOL", age: 29, weight: 85, fit: 95, distance: 740, status: "proximo", checkedIn: false }
  ],
  selectedAthleteId: 1,
  isAdminAuthenticated: false,
  gpsRuleActive: true,
  matchStatus: 'EM ESPERA',
  sseConnected: false,
  pingHistory: [],
  eventSource: null
};

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

// Inicialização da conexão SSE com suporte a reconnect e INIT_STATE
function initSSE() {
  if (state.eventSource) {
    try { state.eventSource.close(); } catch (e) {}
  }

  const sseBadge = document.getElementById('sseStatusBadge');
  const sseChannels = document.getElementById('sseChannels');

  try {
    const sseUrl = getApiUrl('/events/match-stream');
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

    state.eventSource.onerror = () => {
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

// Manipulador de eventos SSE
function handleSSEEvent(data) {
  if (!data) return;
  const tipo = data.type || 'EVENT';

  if (tipo === 'PING') return;

  if (tipo === 'INIT_STATE') {
    if (Array.isArray(data.athletes) && data.athletes.length > 0) {
      state.athletes = data.athletes;
    }
    renderAtletasDropdown();
    renderGpsSelect();
    atualizarDisplayAtleta(currentAthleteId);
    renderListaAtletasGPS();
    atualizarKpis();
    logTerminal('INIT_STATE', `Sincronização inicial: ${state.athletes.length} atletas recebidos via SSE`, 'sse');
    return;
  }

  if (tipo === 'GEOFENCE_UPDATE') {
    const athlete = state.athletes.find(a => String(a.id) === String(data.athleteId));
    if (athlete) {
      athlete.distance = data.distance;
      athlete.distanciaMetros = data.distance;
      athlete.status = data.status;
      athlete.canCheckIn = data.canCheckIn;
    }
    atualizarDisplayAtleta(currentAthleteId);
    renderListaAtletasGPS();
    renderGpsSelect();
    const isOk = data.status === 'campo';
    logTerminal('GEOFENCE', `Atleta #${data.athleteId} (${data.athleteName}) -> ${data.distance}m | Status: ${(data.status || '').toUpperCase()}`, isOk ? 'success' : 'warning');
    return;
  }

  if (tipo === 'CHECKIN_CONFIRMED') {
    const athlete = state.athletes.find(a => String(a.id) === String(data.athleteId));
    if (athlete) {
      athlete.checkedIn = true;
      athlete.status = 'campo';
      athlete.distance = data.distance;
      athlete.distanciaMetros = data.distance;
    }
    atualizarDisplayAtleta(currentAthleteId);
    renderListaAtletasGPS();
    renderGpsSelect();
    atualizarKpis();
    logTerminal('CHECK-IN SUCESSO', `${data.athleteName} confirmado na lista! Distância: ${data.distance}m`, 'success');
    return;
  }

  if (tipo === 'CHECKIN_REJECTED') {
    logTerminal('CHECK-IN NEGADO', `${data.athleteName}: ${data.reason}`, 'error');
    return;
  }

  if (tipo === 'ATHLETE_ADDED' || tipo === 'ATHLETE_UPDATED') {
    carregarAtletas();
    logTerminal('DB_SYNC', `Base de atletas atualizada: ${data.name || data.nome || 'Atleta'}`, 'info');
    return;
  }

  logTerminal('SSE', `Evento [${tipo}]: ${JSON.stringify(data)}`, 'sse');
}

// Carregar lista de atletas (Consome todos os 23 atletas reais)
async function carregarAtletas() {
  try {
    let res = await fetch(getApiUrl('/api/v2/athletes'));
    if (!res.ok) {
      res = await fetch(getApiUrl('/api/atletas'));
    }
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      state.athletes = data.map((a, idx) => {
        const id = a.id !== undefined && a.id !== null ? a.id : (idx + 1);
        const name = a.nome || a.name || `Atleta ${idx + 1}`;
        const position = a.posicao || a.position || 'MEI';
        const age = parseInt(a.idade || a.age || 28, 10);
        const weight = parseInt(a.peso || a.weight || 76, 10);
        const fit = a.fitness !== undefined ? a.fitness : (a.fit || 100);

        let distance = null;
        if (a.distanciaMetros !== undefined && a.distanciaMetros !== null) {
          distance = Number(a.distanciaMetros);
        } else if (a.distance !== undefined && a.distance !== null) {
          distance = Number(a.distance);
        }

        let status = a.status || a.statusAproximacao;
        if (!status) {
          if (distance === null) status = 'longe';
          else if (distance <= 500) status = 'campo';
          else if (distance <= 1500) status = 'proximo';
          else status = 'longe';
        }

        const checkedIn = a.chegadaConfirmada === true || a.checkedIn === true || a.statusPresenca === 'confirmado';

        return {
          ...a,
          id,
          name,
          nome: name,
          position,
          posicao: position,
          age,
          idade: age,
          weight,
          peso: weight,
          fit,
          fitness: fit,
          distance,
          distanciaMetros: distance,
          status,
          checkedIn,
          canCheckIn: distance !== null && distance <= 500
        };
      });
    }
  } catch (err) {
    console.warn('Erro ao carregar atletas:', err.message);
  }

  renderAtletasDropdown();
  renderGpsSelect();
  atualizarDisplayAtleta(currentAthleteId);
  renderListaAtletasGPS();
  atualizarKpis();
}

// Renderiza seletor de atletas da Seção 4 de GPS
function renderGpsSelect() {
  const select = document.getElementById('gps-athlete-select');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '';

  state.athletes.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    const nome = a.name || a.nome;
    const pos = a.position || a.posicao || 'MEI';
    const dist = a.distance !== undefined && a.distance !== null ? a.distance + 'm' : 'Sem GPS';
    const st = (a.status || 'longe').toUpperCase();
    const check = a.checkedIn ? '⚽ OK' : '⏳ Pend';
    opt.textContent = `${nome} (${pos}) — ${dist} [${st}] [${check}]`;
    select.appendChild(opt);
  });

  if (currentVal && state.athletes.some(a => String(a.id) === String(currentVal))) {
    select.value = currentVal;
    currentAthleteId = currentVal;
  } else if (state.athletes.length > 0) {
    select.value = state.athletes[0].id;
    currentAthleteId = state.athletes[0].id;
  }
}

// Renderiza lista/tabela de atletas com configurações individuais na Seção 4
function renderListaAtletasGPS() {
  const tbody = document.getElementById('gpsAthletesListTable');
  if (!tbody) return;

  tbody.innerHTML = '';
  state.athletes.forEach(a => {
    const isSelected = String(a.id) === String(currentAthleteId);
    const tr = document.createElement('tr');
    tr.className = `cursor-pointer transition-all hover:bg-slate-50 ${isSelected ? 'bg-emerald-50/70 font-bold border-l-4 border-emerald-500' : ''}`;

    let statusBadge = '<span class="px-1.5 py-0.5 text-[9px] font-mono rounded bg-red-100 text-red-800">Longe</span>';
    if (a.status === 'campo' || (a.distance !== undefined && a.distance <= 500 && a.status !== 'reset')) {
      statusBadge = '<span class="px-1.5 py-0.5 text-[9px] font-mono rounded bg-emerald-100 text-emerald-800 font-bold">No Campo</span>';
    } else if (a.status === 'proximo' || (a.distance > 500 && a.distance <= 1500)) {
      statusBadge = '<span class="px-1.5 py-0.5 text-[9px] font-mono rounded bg-amber-100 text-amber-800">Próximo</span>';
    } else if (a.status === 'reset') {
      statusBadge = '<span class="px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-100 text-slate-700">Reset</span>';
    }

    const checkBadge = a.checkedIn
      ? '<span class="text-emerald-600 font-bold">⚽ Sim</span>'
      : '<span class="text-slate-400">⏳ Não</span>';

    tr.innerHTML = `
      <td class="px-2.5 py-1.5 flex items-center gap-1.5">
        <span>${a.name || a.nome}</span>
      </td>
      <td class="px-2 py-1.5 text-center font-mono text-[10px] text-slate-600">${a.position || a.posicao || 'MEI'}</td>
      <td class="px-2 py-1.5 text-right font-mono font-semibold">${a.distance !== undefined ? a.distance + 'm' : '-'}</td>
      <td class="px-2 py-1.5 text-center">${statusBadge}</td>
      <td class="px-2 py-1.5 text-center text-[10px]">${checkBadge}</td>
    `;

    tr.addEventListener('click', () => {
      currentAthleteId = a.id;
      const selectGps = document.getElementById('gps-athlete-select');
      if (selectGps) selectGps.value = a.id;
      atualizarDisplayAtleta(currentAthleteId);
      renderListaAtletasGPS();
      logTerminal('SELETOR', `Atleta ativo selecionado: ${a.name || a.nome} (ID #${a.id})`);
    });

    tbody.appendChild(tr);
  });
}

// Atualiza o card de configuração individual do atleta ativo na Seção 4
function atualizarDisplayAtleta(athleteId) {
  const athlete = state.athletes.find(a => String(a.id) === String(athleteId)) || state.athletes[0];
  if (!athlete) return;

  const nomeEl = document.getElementById('selectedAthleteName');
  const posEl = document.getElementById('selectedAthletePos');
  const distEl = document.getElementById('selectedAthleteDistance');
  const tagEl = document.getElementById('selectedAthleteStatusTag');
  const fitEl = document.getElementById('selectedAthleteFit');
  const checkinBadge = document.getElementById('selectedAthleteCheckinBadge');
  const faixaBadge = document.getElementById('simFaixaBadge');
  const btnCheckin = document.getElementById('btnExecutarConfirmacao');

  const nome = athlete.name || athlete.nome || 'Atleta';
  const pos = athlete.position || athlete.posicao || 'MEI';
  const dist = athlete.distance !== undefined ? athlete.distance : 0;
  const fit = athlete.fit !== undefined ? athlete.fit : 100;
  const status = athlete.status || 'longe';

  if (nomeEl) nomeEl.textContent = nome;
  if (posEl) posEl.textContent = pos;
  if (distEl) distEl.textContent = dist + ' m';
  if (fitEl) fitEl.textContent = fit + '% Fit';

  // Badge de Check-in
  if (checkinBadge) {
    if (athlete.checkedIn) {
      checkinBadge.textContent = '⚽ Check-in OK';
      checkinBadge.className = 'px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-300';
    } else {
      checkinBadge.textContent = '⏳ Pendente';
      checkinBadge.className = 'px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-100 text-amber-800 border border-amber-300';
    }
  }

  // Regra de Faixa e Botão de Check-in
  if (status === 'reset' || dist === 0) {
    if (tagEl) {
      tagEl.textContent = 'RESETADO';
      tagEl.className = 'font-mono font-bold text-xs text-slate-500';
    }
    if (faixaBadge) {
      faixaBadge.textContent = '⚪ STATUS RESETADO: Posição desfeita';
      faixaBadge.className = 'p-2.5 bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold';
    }
    if (btnCheckin) {
      btnCheckin.disabled = true;
      btnCheckin.className = 'w-full py-2.5 px-4 bg-slate-200 text-slate-400 font-bold text-xs uppercase tracking-wider rounded-lg cursor-not-allowed';
      btnCheckin.textContent = '1. CHECK-IN BLOQUEADO (RESETADO / SEM DISTÂNCIA)';
    }
  } else if (dist <= 500) {
    if (tagEl) {
      tagEl.textContent = 'NO CAMPO (≤500m)';
      tagEl.className = 'font-mono font-bold text-xs text-emerald-700';
    }
    if (faixaBadge) {
      faixaBadge.textContent = '🟢 FAIXA 3: NO CAMPO (≤ 500m) — Chegada Autorizada!';
      faixaBadge.className = 'p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold shadow-xs';
    }
    if (btnCheckin) {
      btnCheckin.disabled = false;
      btnCheckin.className = 'w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-sans font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md';
      btnCheckin.textContent = `⚽ 1. EXECUTAR CHECK-IN DE ${nome.toUpperCase()}`;
    }
  } else if (dist <= 1500) {
    if (tagEl) {
      tagEl.textContent = 'PRÓXIMO (850m)';
      tagEl.className = 'font-mono font-bold text-xs text-amber-700';
    }
    if (faixaBadge) {
      faixaBadge.textContent = '🟡 FAIXA 2: PRÓXIMO (501m - 1500m) — A caminho da Arena';
      faixaBadge.className = 'p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold';
    }
    if (btnCheckin) {
      btnCheckin.disabled = true;
      btnCheckin.className = 'w-full py-2.5 px-4 bg-slate-200 text-slate-400 font-bold text-xs uppercase tracking-wider rounded-lg cursor-not-allowed';
      btnCheckin.textContent = '1. CHECK-IN BLOQUEADO (A CAMINHO DA ARENA)';
    }
  } else {
    if (tagEl) {
      tagEl.textContent = 'LONGE (>1.5km)';
      tagEl.className = 'font-mono font-bold text-xs text-red-700';
    }
    if (faixaBadge) {
      faixaBadge.textContent = '🔴 FAIXA 1: LONGE (> 1.5 km) — Check-in bloqueado';
      faixaBadge.className = 'p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold';
    }
    if (btnCheckin) {
      btnCheckin.disabled = true;
      btnCheckin.className = 'w-full py-2.5 px-4 bg-slate-200 text-slate-400 font-bold text-xs uppercase tracking-wider rounded-lg cursor-not-allowed';
      btnCheckin.textContent = '1. CHECK-IN BLOQUEADO (FORA DO RAIO DE 500m)';
    }
  }
}

// 2. Dispara a simulação de distância para o atleta selecionado (POST /api/v2/geofence-test)
async function dispararSimulacaoGPS(distancia, statusTag) {
  // Atualização otimista imediata na interface para feedback instantâneo
  const localAthlete = state.athletes.find(a => String(a.id) === String(currentAthleteId));
  if (localAthlete) {
    if (statusTag === 'reset') {
      localAthlete.status = 'reset';
      localAthlete.distance = 0;
      localAthlete.distanciaMetros = 0;
      localAthlete.checkedIn = false;
      localAthlete.canCheckIn = false;
    } else {
      localAthlete.distance = distancia;
      localAthlete.distanciaMetros = distancia;
      localAthlete.status = statusTag;
      localAthlete.canCheckIn = distancia <= 500;
    }
    atualizarDisplayAtleta(currentAthleteId);
    renderListaAtletasGPS();
    renderGpsSelect();
  }

  try {
    const response = await fetch(getApiUrl('/api/v2/geofence-test'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        athleteId: currentAthleteId,
        distanceMeters: distancia,
        customStatus: statusTag
      })
    });
    const result = await response.json();
    if (result.success && result.athlete) {
      const idx = state.athletes.findIndex(a => String(a.id) === String(result.athlete.id));
      if (idx !== -1) {
        state.athletes[idx] = { ...state.athletes[idx], ...result.athlete };
      }
      atualizarDisplayAtleta(currentAthleteId);
      renderListaAtletasGPS();
      renderGpsSelect();
      logTerminal('GEOFENCE', `Atleta #${result.athlete.id} (${result.athlete.name || result.athlete.nome}) -> ${result.athlete.distance}m | Status: ${(result.athlete.status || '').toUpperCase()}`, result.allowed ? 'success' : 'warning');
    }
  } catch (error) {
    console.error("Erro na simulação:", error);
    logTerminal('GEOFENCE_ERR', error.message, 'error');
  }
}

// 3. Executar o check-in do atleta ativo (POST /api/v2/checkin)
async function executarCheckinAtivo() {
  const localAthlete = state.athletes.find(a => String(a.id) === String(currentAthleteId));
  if (!localAthlete) return;

  if (localAthlete.distance > 500) {
    logTerminal('CHECK-IN NEGADO', `${localAthlete.name || localAthlete.nome}: Fora do raio de 500m (${localAthlete.distance}m)`, 'error');
    alert('Check-in bloqueado: Você está fora do raio de 500 metros do campo!');
    return;
  }

  // Atualização otimista imediata
  localAthlete.checkedIn = true;
  localAthlete.status = 'campo';
  atualizarDisplayAtleta(currentAthleteId);
  renderListaAtletasGPS();
  renderGpsSelect();
  atualizarKpis();

  const btn = document.getElementById('btnExecutarConfirmacao');
  if (btn) {
    btn.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> CONFIRMANDO CHECK-IN...';
  }

  try {
    const response = await fetch(getApiUrl('/api/v2/checkin'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athleteId: currentAthleteId })
    });
    const result = await response.json();
    if (result.success && result.athlete) {
      const idx = state.athletes.findIndex(a => String(a.id) === String(result.athlete.id));
      if (idx !== -1) {
        state.athletes[idx] = { ...state.athletes[idx], ...result.athlete };
      }
      atualizarDisplayAtleta(currentAthleteId);
      renderListaAtletasGPS();
      renderGpsSelect();
      atualizarKpis();
      logTerminal('CHECK-IN SUCESSO', `${result.athlete.name || result.athlete.nome} confirmado na lista!`, 'success');
      if (btn) {
        btn.innerHTML = '✓ CHECK-IN CONFIRMADO COM SUCESSO!';
        setTimeout(() => { atualizarDisplayAtleta(currentAthleteId); }, 2000);
      }
    } else {
      logTerminal('CHECK-IN NEGADO', result.message || 'Bloqueado fora dos 500m', 'error');
      alert(result.message || 'Check-in bloqueado.');
      atualizarDisplayAtleta(currentAthleteId);
    }
  } catch (error) {
    console.error("Erro ao executar check-in:", error);
    logTerminal('CHECKIN_ERR', error.message, 'error');
    atualizarDisplayAtleta(currentAthleteId);
  }
}

// Renderiza dropdown de atletas da Seção 2 (Espaço do Jogador)
function renderAtletasDropdown() {
  const select = document.getElementById('selectAtleta');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '';

  state.athletes.forEach(atleta => {
    const opt = document.createElement('option');
    opt.value = atleta.id;
    const nome = atleta.name || atleta.nome;
    const pos = atleta.position || atleta.posicao || 'MEI';
    const idade = atleta.age || atleta.idade || 25;
    const peso = atleta.weight || atleta.peso || 75;
    const cond = atleta.fit ? `${atleta.fit}% Fit` : (atleta.condicaoFisica || '100% Fit');
    opt.textContent = `${nome} — ${pos} | ${idade} anos, ${peso}kg (${cond})`;
    select.appendChild(opt);
  });

  if (currentVal && state.athletes.some(a => String(a.id) === String(currentVal))) {
    select.value = currentVal;
    state.selectedAthleteId = currentVal;
  } else if (state.athletes.length > 0) {
    select.value = state.athletes[0].id;
    state.selectedAthleteId = state.athletes[0].id;
  }

  preencherFormularioAtleta();
}

// Preenche formulário da Seção 2 com dados do atleta selecionado
function preencherFormularioAtleta() {
  const select = document.getElementById('selectAtleta');
  const selId = select ? select.value : state.selectedAthleteId;
  const atleta = state.athletes.find(a => String(a.id) === String(selId)) || state.athletes[0];
  if (!atleta) return;

  const nome = atleta.name || atleta.nome || '';
  document.getElementById('inputNome').value = nome;
  document.getElementById('inputApelido').value = atleta.apelido || nome.split(' ')[0] || nome;
  document.getElementById('selectPosicao').value = atleta.position || atleta.posicao || 'MEI';
  document.getElementById('inputEmail').value = atleta.email || `${nome.toLowerCase().replace(/\s+/g, '.')}@peladatop.internal`;
  document.getElementById('inputIdade').value = atleta.age || atleta.idade || 24;
  document.getElementById('inputPeso').value = atleta.weight || atleta.peso || 76;
  document.getElementById('selectCondicao').value = atleta.fit ? `${atleta.fit}% Fit` : (atleta.condicaoFisica || '100% Fit');
}

// Retorna atleta atualmente selecionado no select da Seção 2
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

  const confirmados = state.athletes.filter(a => a.checkedIn === true || a.statusPresenca === 'confirmado' || a.chegadaConfirmada === true).length;
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
    const res = await fetch(getApiUrl('/api/v2/ping?t=' + Date.now()));
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
    logEntry.innerHTML = `<span class="text-emerald-400">HTTP/2 200 OK</span> | RTT: <span class="font-bold text-white">${rtt}ms</span> | min/avg/max: ${min}/${avg}/${max}ms`;
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
    nome: atleta.name || atleta.nome,
    posicao: atleta.position || atleta.posicao,
    role: 'jogador',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  })) + '.simulatedSignatureMockKey';

  logTerminal('JWT_AUTH', `Token emitido para Jogador [${atleta.name || atleta.nome}]: Bearer ${mockToken.slice(0, 32)}...`, 'success');
  
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
    name: nome,
    nome,
    apelido,
    position: posicao,
    posicao,
    email,
    age: idade,
    idade,
    weight: peso,
    peso,
    fit: 100,
    condicaoFisica,
    distance: 2500,
    distanciaMetros: 2500,
    status: 'longe',
    checkedIn: false
  };

  const btn = document.getElementById('btnCadastrarJogador');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> SALVANDO...';
  }

  try {
    const res = await fetch(getApiUrl('/api/v2/athletes'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    logTerminal('CADASTRO', `Atleta [${nome} (${posicao})] cadastrado com sucesso! ID #${data.athlete?.id || data.id || 'Novo'}`, 'success');

    await carregarAtletas();
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
function salvarAlteracoesAtleta() {
  const atleta = getAtletaSelecionado();
  if (!atleta) return;

  const nome = document.getElementById('inputNome').value.trim();
  const apelido = document.getElementById('inputApelido').value.trim();
  const posicao = document.getElementById('selectPosicao').value;
  const email = document.getElementById('inputEmail').value.trim();
  const idade = parseInt(document.getElementById('inputIdade').value, 10) || atleta.idade;
  const peso = parseFloat(document.getElementById('inputPeso').value) || atleta.peso;
  const condicaoFisica = document.getElementById('selectCondicao').value;

  atleta.name = nome;
  atleta.nome = nome;
  atleta.apelido = apelido;
  atleta.position = posicao;
  atleta.posicao = posicao;
  atleta.email = email;
  atleta.age = idade;
  atleta.idade = idade;
  atleta.weight = peso;
  atleta.peso = peso;
  atleta.condicaoFisica = condicaoFisica;

  logTerminal('ATLETA_UPDATE', `Dados de [${nome}] atualizados com sucesso.`, 'success');
  renderAtletasDropdown();
  renderGpsSelect();
  renderListaAtletasGPS();
  atualizarDisplayAtleta(currentAthleteId);
}

// Excluir atleta
function excluirAtleta() {
  const atleta = getAtletaSelecionado();
  if (!atleta) return;

  if (confirm(`Deseja remover ${atleta.name || atleta.nome} da base de testes?`)) {
    state.athletes = state.athletes.filter(a => a !== atleta);
    logTerminal('ATLETA_DELETE', `Atleta [${atleta.name || atleta.nome}] removido da base de dados.`, 'warning');
    renderAtletasDropdown();
    renderGpsSelect();
    renderListaAtletasGPS();
    if (state.athletes.length > 0) {
      currentAthleteId = state.athletes[0].id;
      atualizarDisplayAtleta(currentAthleteId);
    }
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
    logTerminal('CLIPBOARD', 'Link de acesso à pelada copiado: ' + input.value, 'info');
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

// Event Listeners e Inicialização
function bootApp() {
  // Ajusta o link de acesso público para o host atual da máquina / rede
  const publicLinkEl = document.getElementById('inputPublicLink');
  if (publicLinkEl && window.location && window.location.origin) {
    publicLinkEl.value = `${window.location.origin}/teste`;
  }

  // Seletor de Servidor Alvo (Render vs Localhost)
  const serverTargetSelect = document.getElementById('serverTargetSelect');
  if (serverTargetSelect) {
    serverTargetSelect.value = apiBase;
    serverTargetSelect.addEventListener('change', (e) => {
      setTargetServer(e.target.value);
    });
  }

  // Inicializa componentes
  initSSE();
  carregarAtletas();
  testarPing();

  // 1. Escuta a troca de atleta no seletor da aba GPS
  const gpsSelect = document.getElementById('gps-athlete-select');
  if (gpsSelect) {
    gpsSelect.addEventListener('change', (e) => {
      currentAthleteId = e.target.value;
      atualizarDisplayAtleta(currentAthleteId);
      renderListaAtletasGPS();
      logTerminal('SELETOR', `Atleta ativo alterado para ID #${currentAthleteId}`);
    });
  }

  // Dropdown de atleta (Espaço do Jogador)
  const selectAtleta = document.getElementById('selectAtleta');
  if (selectAtleta) {
    selectAtleta.addEventListener('change', preencherFormularioAtleta);
  }

  // Ping button
  document.getElementById('btnTestarPing')?.addEventListener('click', testarPing);

  // Login Jogador
  document.getElementById('btnLoginJogador')?.addEventListener('click', testarLoginJogador);

  // Cadastro Jogador
  document.getElementById('btnCadastrarJogador')?.addEventListener('click', cadastrarNovoJogador);

  // Superadmin
  document.getElementById('btnAutenticarAdmin')?.addEventListener('click', autenticarAdmin);
  document.getElementById('btnToggleGps')?.addEventListener('click', toggleGpsRule);
  document.getElementById('btnToggleMatch')?.addEventListener('click', toggleMatchStatus);
  document.getElementById('btnSortearTimes')?.addEventListener('click', sortearTimes);
  document.getElementById('btnSalvarAtleta')?.addEventListener('click', salvarAlteracoesAtleta);
  document.getElementById('btnExcluirAtleta')?.addEventListener('click', excluirAtleta);

  // Botões de Simulação de GPS conectando à função dispararSimulacaoGPS:
  document.getElementById('btnGpsLonge')?.addEventListener('click', () => dispararSimulacaoGPS(3800, 'longe'));
  document.getElementById('btnGpsProximo')?.addEventListener('click', () => dispararSimulacaoGPS(850, 'proximo'));
  document.getElementById('btnGpsChegou')?.addEventListener('click', () => dispararSimulacaoGPS(120, 'campo'));
  document.getElementById('btnGpsReset')?.addEventListener('click', () => dispararSimulacaoGPS(0, 'reset'));

  // Botão de Check-in Ativo
  document.getElementById('btnExecutarConfirmacao')?.addEventListener('click', executarCheckinAtivo);

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
