// Dashboard Administrativo Master - Pelada Top
let peladaData = null;
let configData = null;

// ==============================================================
// SISTEMA DE TOAST E NOTIFICAÇÃO ONLINE (ADMIN MASTER)
// ==============================================================
const atletasConhecidosAdmin = new Set();
let adminInicializado = false;

function tocarSomOnlineAdmin() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch(e) {}
}

function exibirToastJogadorOnline(atleta, mensagem) {
  if (!atleta || !atleta.nome) return;
  const container = document.getElementById('toast-container');
  if (!container) return;

  tocarSomOnlineAdmin();
  if ('vibrate' in navigator) {
    try { navigator.vibrate([40, 60, 40]); } catch(e) {}
  }

  const toastId = 'toast-admin-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const foto = atleta.foto || 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-bJFjHM3Cw56hg-NkbJPMXI4BBSd27DSJG1xqrKmgFkRLUWBS9dP4iQV5hp4FfcKK6hittLBeVqZMU_eP8ed-FBF1Fa4LexRd6luPHSu-slQoz3Z90nOHmuowwOnRq7LH-Ku2HUOC6Vv2Czi0ySwIin7XXxizGR5nnpUKi6N_8eWYx6t6btGkpbhcJwh3YsLwKKERBq5hCYR03dGB0JzG3mK3BXfSW8xr1WaG6KNPTb8-Kd9bwyl_';
  const pos = atleta.posicao || 'ATA';
  const nome = atleta.nome;
  const hora = atleta.horaOnline || atleta.hora || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const subtexto = mensagem || 'Acabou de entrar na lista da pelada!';

  const toastEl = document.createElement('div');
  toastEl.id = toastId;
  toastEl.className = 'pointer-events-auto bg-slate-900/95 backdrop-blur-md border border-emerald-500/50 shadow-2xl rounded-2xl p-3 flex items-center gap-3 transition-all duration-300 transform -translate-y-4 opacity-0 ring-2 ring-emerald-500/30 text-slate-100';
  toastEl.innerHTML = `
    <div class="relative shrink-0">
      <img src="${foto}" class="w-11 h-11 rounded-full object-cover border-2 border-emerald-500 shadow-md" alt="${nome}">
      <span class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 ring-1 ring-emerald-400 animate-ping"></span>
      <span class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-1.5">
        <span class="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE AGORA
        </span>
        <span class="text-[9px] font-mono text-slate-400">${hora}</span>
      </div>
      <h4 class="font-bold text-xs text-white truncate mt-0.5">${nome} <span class="text-[10px] text-brand mono font-black">(${pos})</span></h4>
      <p class="text-[11px] text-emerald-400 font-semibold truncate flex items-center gap-1">
        <span>⚽ ${subtexto}</span>
        <span class="text-[9px] font-black text-white bg-emerald-600 px-1 py-0.2 rounded uppercase">Confirmado</span>
      </p>
    </div>
    <button onclick="removerToastAdmin('${toastId}')" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 active:scale-95 shrink-0" title="Fechar">
      <span class="material-symbols-outlined text-sm">close</span>
    </button>
  `;

  container.appendChild(toastEl);

  requestAnimationFrame(() => {
    toastEl.classList.remove('-translate-y-4', 'opacity-0');
    toastEl.classList.add('translate-y-0', 'opacity-100');
  });

  setTimeout(() => {
    removerToastAdmin(toastId);
  }, 4500);
}

function removerToastAdmin(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('-translate-y-2', 'opacity-0');
    setTimeout(() => { if (el && el.parentElement) el.remove(); }, 300);
  }
}

function verificarNovosJogadoresAdmin(atletas) {
  if (!Array.isArray(atletas) || atletas.length === 0) return;

  if (!adminInicializado) {
    atletas.forEach(j => {
      if (j.id) atletasConhecidosAdmin.add(String(j.id));
      if (j.nome) atletasConhecidosAdmin.add(j.nome.toLowerCase().trim());
    });
    adminInicializado = true;
    return;
  }

  // O jogador recém-chegado fica na 1ª POSIÇÃO (índice 0)
  const primeiro = atletas[0];
  if (primeiro) {
    const idKey = primeiro.id ? String(primeiro.id) : null;
    const nomeKey = primeiro.nome ? primeiro.nome.toLowerCase().trim() : null;
    const ehConhecido = (idKey && atletasConhecidosAdmin.has(idKey)) && (nomeKey && atletasConhecidosAdmin.has(nomeKey));
    const entrouAgora = primeiro.entrouEm && (Date.now() - primeiro.entrouEm < 20000);

    if (!ehConhecido || (entrouAgora && !primeiro._notificadoAdminToast)) {
      primeiro._notificadoAdminToast = true;
      if (idKey) atletasConhecidosAdmin.add(idKey);
      if (nomeKey) atletasConhecidosAdmin.add(nomeKey);

      exibirToastJogadorOnline(primeiro, `${primeiro.nome} acabou de entrar na lista da pelada!`);
    }
  }
}

// Conecta SSE no painel master para resposta instantânea
function conectarSseAdmin() {
  try {
    const sse = new EventSource('/api/stream');
    sse.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'JOGADOR_ONLINE' && msg.atleta) {
          exibirToastJogadorOnline(msg.atleta, `${msg.atleta.nome} acabou de entrar na lista da pelada!`);
          carregarDadosPelada();
        } else if (msg.type === 'SYNC') {
          carregarDadosPelada();
        }
      } catch(err) {}
    };
  } catch(e) {}
}

// ==============================================================
// 1. CARREGAMENTO INICIAL E SONDAGEM
// ==============================================================
async function carregarTudo() {
  conectarSseAdmin();
  await Promise.all([
    carregarTelemetria(),
    carregarDadosPelada(),
    carregarConfiguracao(),
    carregarLogs()
  ]);
}

// Telemetria do Servidor e Dispositivos
async function carregarTelemetria() {
  try {
    const res = await fetch('/api/admin/status');
    if (!res.ok) throw new Error('Falha ao obter status');
    const data = await res.json();

    // IP Local
    const txtIp = document.getElementById('txt-ip-status');
    if (txtIp) txtIp.innerText = `Wi-Fi: http://${data.ipLocal}:${data.porta}`;

    // Uptime & Memória
    const txtUptime = document.getElementById('txt-uptime');
    if (txtUptime) txtUptime.innerText = `Ligado há: ${data.uptime}`;

    const kpiMemoria = document.getElementById('kpi-memoria');
    if (kpiMemoria) kpiMemoria.innerText = `${data.memoriaMb} MB`;

    // Clientes
    const kpiClientes = document.getElementById('kpi-clientes-count');
    if (kpiClientes) kpiClientes.innerText = data.totalClientesConectados;

    const badgeDisp = document.getElementById('badge-disp-count');
    if (badgeDisp) badgeDisp.innerText = `${data.totalClientesConectados} ativo${data.totalClientesConectados !== 1 ? 's' : ''}`;

    // Link Público Global (4G/5G)
    atualizarLinkPublico(data.linkPublico);

    renderizarDispositivos(data.clientes || []);
  } catch (err) {
    console.error('Erro na telemetria:', err);
    const txtIp = document.getElementById('txt-ip-status');
    if (txtIp) {
      txtIp.innerText = 'Servidor Inacessível';
      txtIp.className = 'mono font-semibold text-red-400';
    }
  }
}

// Dados da Pelada (Confirmados, Status da Lista, Arena)
async function carregarDadosPelada() {
  try {
    const res = await fetch('/api/pelada');
    if (!res.ok) throw new Error('Falha ao obter dados da pelada');
    peladaData = await res.json();

    // Contadores
    const atletas = peladaData.listaConfirmados || [];
    verificarNovosJogadoresAdmin(atletas);

    const kpiAtletas = document.getElementById('kpi-atletas-count');
    if (kpiAtletas) kpiAtletas.innerText = atletas.length;

    const badgeHeader = document.getElementById('badge-atletas-header');
    if (badgeHeader) badgeHeader.innerText = `${atletas.length} atleta${atletas.length !== 1 ? 's' : ''}`;

    // Status da Lista (Trava / Vestiário)
    atualizarUiTravaLista(peladaData.peladaConfig ? peladaData.peladaConfig.listaAberta : true);

    // Renderizar Atletas
    renderizarListaAtletas(atletas);

  } catch (err) {
    console.error('Erro nos dados da pelada:', err);
  }
}

// Configurações do config.json
async function carregarConfiguracao() {
  try {
    const res = await fetch('/api/admin/config');
    if (!res.ok) return;
    configData = await res.json();

    const regras = configData.regrasPelada || {};
    const arena = regras.arena || {};

    const elArena = document.getElementById('cfg-arena-nome');
    if (elArena) elArena.value = arena.nome || '';

    const elLat = document.getElementById('cfg-lat');
    if (elLat) elLat.value = arena.lat || -7.190405;

    const elLng = document.getElementById('cfg-lng');
    if (elLng) elLng.value = arena.lng || -34.870103;

    const elRaio = document.getElementById('cfg-raio');
    if (elRaio) elRaio.value = regras.raioMaximoMetros || 500;

    const elExigirGps = document.getElementById('cfg-exigir-gps');
    if (elExigirGps) elExigirGps.value = String(regras.exigirGps !== false);

    const elTempo = document.getElementById('cfg-tempo');
    if (elTempo) elTempo.value = regras.tempoPartidaMinutos || 10;

    const elQtd = document.getElementById('cfg-qtd-times');
    if (elQtd) elQtd.value = String(regras.qtdTimesPadrao || 4);

    const linkMaps = document.getElementById('link-maps-arena');
    if (linkMaps && arena.mapsUrl) linkMaps.href = arena.mapsUrl;

  } catch (err) {
    console.error('Erro ao carregar configurações:', err);
  }
}

// ==============================================================
// 2. STATUS DA PELADA (TRAVAR / LIBERAR LISTA)
// ==============================================================
function atualizarUiTravaLista(aberta) {
  const btnTop = document.getElementById('btn-top-trava');
  const iconeTop = document.getElementById('icone-top-trava');
  const textoTop = document.getElementById('texto-top-trava');

  const kpiTexto = document.getElementById('kpi-status-texto');
  const kpiSub = document.getElementById('kpi-status-sub');
  const kpiIcon = document.getElementById('kpi-status-icon');

  if (aberta) {
    if (btnTop) btnTop.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white';
    if (iconeTop) iconeTop.innerText = 'lock_open';
    if (textoTop) textoTop.innerText = 'LISTA ABERTA';

    if (kpiTexto) {
      kpiTexto.innerText = 'ABERTO';
      kpiTexto.className = 'text-xl sm:text-2xl font-black text-emerald-400';
    }
    if (kpiSub) kpiSub.innerText = 'Atletas podem confirmar';
    if (kpiIcon) kpiIcon.className = 'p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400';
  } else {
    if (btnTop) btnTop.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white';
    if (iconeTop) iconeTop.innerText = 'lock';
    if (textoTop) textoTop.innerText = 'LISTA TRAVADA';

    if (kpiTexto) {
      kpiTexto.innerText = 'TRAVADO';
      kpiTexto.className = 'text-xl sm:text-2xl font-black text-red-400';
    }
    if (kpiSub) kpiSub.innerText = 'Check-in bloqueado';
    if (kpiIcon) kpiIcon.className = 'p-1.5 rounded-xl bg-red-500/10 text-red-400';
  }
}

async function alternarTravaLista() {
  try {
    const res = await fetch('/api/admin/trava-lista', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      atualizarUiTravaLista(data.listaAberta);
      carregarLogs();
    }
  } catch (e) {
    alert('Erro ao alterar status da lista: ' + e.message);
  }
}

// ==============================================================
// 3. GESTÃO DE ATLETAS (LISTAR, ADICIONAR, EDITAR, EXCLUIR)
// ==============================================================
function renderizarListaAtletas(atletas) {
  const container = document.getElementById('admin-lista-atletas');
  if (!container) return;

  if (!atletas || atletas.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
        <span class="material-symbols-outlined text-4xl text-slate-600">person_off</span>
        <p class="font-bold text-slate-400">Nenhum atleta confirmado no momento</p>
        <p class="text-[11px] text-slate-500">Adicione manualmente pelo botão acima ou aguarde o check-in dos jogadores pelo celular.</p>
      </div>
    `;
    return;
  }

  let html = '';
  atletas.forEach((j, idx) => {
    const foto = j.foto || 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-bJFjHM3Cw56hg-NkbJPMXI4BBSd27DSJG1xqrKmgFkRLUWBS9dP4iQV5hp4FfcKK6hittLBeVqZMU_eP8ed-FBF1Fa4LexRd6luPHSu-slQoz3Z90nOHmuowwOnRq7LH-Ku2HUOC6Vv2Czi0ySwIin7XXxizGR5nnpUKi6N_8eWYx6t6btGkpbhcJwh3YsLwKKERBq5hCYR03dGB0JzG3mK3BXfSW8xr1WaG6KNPTb8-Kd9bwyl_';
    
    const badgeOnline = j.online
      ? `<span class="text-[9px] font-black px-1.5 py-0.2 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/40 flex items-center gap-1 shrink-0"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE</span>`
      : '';

    const cardBorda = j.online
      ? 'border-emerald-500/60 ring-1 ring-emerald-500/30 bg-emerald-950/20'
      : 'border-borderLine bg-slate-900/80';

    // Cor da posição
    let corPos = 'bg-brand/10 text-brand border-brand/20';
    if (j.posicao === 'GOL') corPos = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (j.posicao === 'MEI') corPos = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (j.posicao === 'ZAG' || j.posicao === 'VOL') corPos = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

    html += `
      <div class="p-2.5 rounded-xl ${cardBorda} border flex items-center justify-between gap-3 text-xs hover:border-slate-700 transition-all">
        <div class="flex items-center gap-2.5 min-w-0 flex-1">
          <span class="w-5 text-center font-black ${j.online ? 'text-emerald-400 text-sm' : 'text-slate-500 text-xs'} shrink-0">${idx + 1}</span>
          <img src="${foto}" class="w-9 h-9 rounded-full object-cover ${j.online ? 'border-2 border-emerald-500' : 'border border-slate-700'} shrink-0" alt="${j.nome}">
          <div class="flex flex-col min-w-0 flex-1">
            <div class="flex items-center gap-1.5 truncate">
              <span class="font-bold text-slate-100 truncate">${j.nome}</span>
              ${badgeOnline}
              <span class="text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${corPos}">${j.posicao || 'ATA'}</span>
            </div>
            <div class="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>${j.idade || 25} anos</span>
              <span>&bull;</span>
              <span class="mono text-emerald-400 font-semibold">${j.fitness || 85}% físico</span>
              <span>&bull;</span>
              <span class="text-slate-500 mono">${j.hora || '--:--'}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <button onclick="abrirModalEditarAtleta('${j.id}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all" title="Editar Atleta">
            <span class="material-symbols-outlined text-sm">edit</span>
          </button>
          <button onclick="excluirAtleta('${j.id}', '${j.nome.replace(/'/g, "\\'")}')" class="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 transition-all" title="Excluir Atleta">
            <span class="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Modal Adicionar
function abrirModalNovoAtleta() {
  document.getElementById('novo-nome').value = '';
  document.getElementById('novo-posicao').value = 'ATA';
  document.getElementById('novo-idade').value = '28';
  document.getElementById('novo-condicao').value = 'excelente';
  const modal = document.getElementById('modalNovoAtleta');
  if (modal) modal.classList.remove('opacity-0', 'pointer-events-none');
}

function fecharModalNovoAtleta() {
  const modal = document.getElementById('modalNovoAtleta');
  if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
}

async function salvarNovoAtleta(e) {
  e.preventDefault();
  const nome = document.getElementById('novo-nome').value.trim();
  if (!nome) return;

  const novo = {
    nome,
    posicao: document.getElementById('novo-posicao').value,
    idade: parseInt(document.getElementById('novo-idade').value) || 28,
    condicao: document.getElementById('novo-condicao').value,
    fitness: 90
  };

  try {
    const res = await fetch('/api/admin/atleta/salvar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novo)
    });

    if (res.ok) {
      fecharModalNovoAtleta();
      carregarDadosPelada();
      carregarLogs();
    } else {
      alert('Erro ao salvar atleta.');
    }
  } catch (err) {
    alert('Erro de conexão: ' + err.message);
  }
}

// Modal Editar
function abrirModalEditarAtleta(id) {
  const atleta = (peladaData.listaConfirmados || []).find(x => String(x.id) === String(id));
  if (!atleta) return;

  document.getElementById('edit-id').value = atleta.id;
  document.getElementById('edit-nome').value = atleta.nome;
  document.getElementById('edit-posicao').value = atleta.posicao || 'ATA';
  document.getElementById('edit-idade').value = atleta.idade || 25;
  document.getElementById('edit-fitness').value = atleta.fitness || 85;

  const modal = document.getElementById('modalEditarAtleta');
  if (modal) modal.classList.remove('opacity-0', 'pointer-events-none');
}

function fecharModalEditarAtleta() {
  const modal = document.getElementById('modalEditarAtleta');
  if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
}

async function salvarEdicaoAtleta(e) {
  e.preventDefault();
  const id = document.getElementById('edit-id').value;
  const atleta = {
    id,
    nome: document.getElementById('edit-nome').value.trim(),
    posicao: document.getElementById('edit-posicao').value,
    idade: parseInt(document.getElementById('edit-idade').value) || 25,
    fitness: parseInt(document.getElementById('edit-fitness').value) || 85
  };

  try {
    const res = await fetch('/api/admin/atleta/salvar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(atleta)
    });

    if (res.ok) {
      fecharModalEditarAtleta();
      carregarDadosPelada();
      carregarLogs();
    } else {
      alert('Erro ao atualizar atleta.');
    }
  } catch (err) {
    alert('Erro de conexão: ' + err.message);
  }
}

// Excluir Atleta
async function excluirAtleta(id, nome) {
  if (confirm(`Deseja realmente remover o atleta "${nome}" da lista da pelada?`)) {
    try {
      const res = await fetch('/api/admin/atleta/excluir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        carregarDadosPelada();
        carregarLogs();
      }
    } catch (e) {
      alert('Erro ao excluir atleta: ' + e.message);
    }
  }
}

// ==============================================================
// 4. CONFIGURAÇÃO DA PELADA (GPS, ARENA, TEMPO)
// ==============================================================
async function salvarConfigPelada(e) {
  e.preventDefault();
  if (!configData) return;

  const btn = document.getElementById('btn-salvar-cfg');
  const origHtml = btn.innerHTML;
  btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">refresh</span><span>Salvando...</span>';

  if (!configData.regrasPelada) configData.regrasPelada = {};
  if (!configData.regrasPelada.arena) configData.regrasPelada.arena = {};

  configData.regrasPelada.arena.nome = document.getElementById('cfg-arena-nome').value.trim();
  configData.regrasPelada.arena.lat = parseFloat(document.getElementById('cfg-lat').value) || -7.190405;
  configData.regrasPelada.arena.lng = parseFloat(document.getElementById('cfg-lng').value) || -34.870103;
  configData.regrasPelada.raioMaximoMetros = parseInt(document.getElementById('cfg-raio').value) || 500;
  configData.regrasPelada.exigirGps = document.getElementById('cfg-exigir-gps').value === 'true';
  configData.regrasPelada.tempoPartidaMinutos = parseInt(document.getElementById('cfg-tempo').value) || 10;
  configData.regrasPelada.qtdTimesPadrao = parseInt(document.getElementById('cfg-qtd-times').value) || 4;

  try {
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configData)
    });

    if (res.ok) {
      btn.className = 'w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold transition-all shadow-md flex items-center justify-center gap-1.5';
      btn.innerHTML = '<span class="material-symbols-outlined text-sm">done</span><span>Configurações Salvas & Sincronizadas!</span>';
      setTimeout(() => {
        btn.className = 'w-full py-2.5 rounded-xl bg-brand hover:bg-brandDark text-white font-bold transition-all shadow-md flex items-center justify-center gap-1.5';
        btn.innerHTML = origHtml;
      }, 1800);
      carregarDadosPelada();
      carregarLogs();
    } else {
      alert('Erro ao salvar no servidor.');
      btn.innerHTML = origHtml;
    }
  } catch (err) {
    alert('Erro de conexão ao salvar: ' + err.message);
    btn.innerHTML = origHtml;
  }
}

// ==============================================================
// 5. DISPOSITIVOS, LOGS E AÇÕES
// ==============================================================
function renderizarDispositivos(clientes) {
  const container = document.getElementById('lista-dispositivos');
  if (!container) return;

  if (!clientes || clientes.length === 0) {
    container.innerHTML = `
      <div class="p-6 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-1.5">
        <span class="material-symbols-outlined text-3xl text-slate-600">phonelink_off</span>
        <p class="font-bold text-slate-400">Nenhum celular conectado ainda</p>
        <p class="text-[11px] text-slate-500">Abra o link do app no celular para vê-lo listado aqui na hora!</p>
      </div>
    `;
    return;
  }

  let html = '';
  clientes.forEach(c => {
    const statusClass = c.online 
      ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
      : 'bg-slate-800 text-slate-400 border-slate-700';
    const statusTexto = c.online ? 'Ao Vivo' : 'Recente';
    const iconeCor = c.online ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-800';

    html += `
      <div class="p-3 rounded-xl bg-slate-900/80 border border-borderLine flex items-center justify-between gap-3 text-xs hover:border-slate-700 transition-all">
        <div class="flex items-center gap-3 min-w-0">
          <div class="p-2 rounded-xl ${iconeCor} flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-lg">smartphone</span>
          </div>
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-bold text-slate-100">${c.aparelho || 'Celular / Navegador'}</span>
              <span class="px-1.5 py-0.2 rounded text-[9px] font-bold border ${statusClass}">${statusTexto}</span>
            </div>
            <div class="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 mono">
              <span>IP: ${c.ip}</span>
              <span>&bull;</span>
              <span class="text-emerald-400/90">${c.tempoRelativo || c.ultimoAcesso}</span>
              <span>&bull;</span>
              <span>${c.totalRequisicoes || 1} acessos</span>
            </div>
          </div>
        </div>
        <div class="text-right shrink-0">
          <span class="text-[10px] text-slate-400 mono">${c.ultimoAcesso}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function carregarLogs() {
  const terminal = document.getElementById('terminal-logs');
  if (!terminal) return;

  try {
    const res = await fetch('/api/admin/logs');
    if (!res.ok) return;
    const logs = await res.json();

    if (logs.length === 0) {
      terminal.innerHTML = '<span class="text-slate-500">Nenhum evento registrado ainda.</span>';
      return;
    }

    let html = '';
    logs.forEach(l => {
      let cor = 'text-slate-300';
      if (l.tipo === 'conexao') cor = 'text-blue-400';
      if (l.tipo === 'dados') cor = 'text-purple-400';
      if (l.tipo === 'erro') cor = 'text-red-400';
      if (l.tipo === 'servidor') cor = 'text-emerald-400';

      html += `<div class="flex items-start gap-2 leading-relaxed"><span class="text-slate-500 shrink-0">[${l.dataHora}]</span> <span class="font-bold shrink-0 ${cor}">[${l.tipo.toUpperCase()}]</span> <span class="${cor}">${l.mensagem}</span></div>`;
    });

    terminal.innerHTML = html;
  } catch (err) {}
}

async function zerarPelada() {
  if (confirm('Atenção: deseja realmente zerar todos os atletas confirmados para uma nova pelada?')) {
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      if (res.ok) {
        alert('⚽ Lista de atletas e pelada zeradas com sucesso!');
        carregarDadosPelada();
        carregarLogs();
      }
    } catch (e) {
      alert('Erro: ' + e.message);
    }
  }
}

async function fazerBackup() {
  try {
    const res = await fetch('/api/admin/backup', { method: 'POST' });
    const data = await res.json();
    if (data.sucesso) {
      alert(`✅ Backup criado com sucesso!\nArquivo: ${data.arquivo}\nSalvo em: E:\\PeladaServidor\\dados\\backups\\`);
      carregarLogs();
    }
  } catch (e) {
    alert('Erro ao criar backup: ' + e.message);
  }
}

// GESTÃO DO LINK PÚBLICO E QR CODE
let linkPublicoAtual = null;

function atualizarLinkPublico(link) {
  linkPublicoAtual = link;
  const a = document.getElementById('link-publico-url');
  if (!a) return;

  if (link) {
    a.innerText = link;
    a.href = link;
    a.className = 'text-xs font-bold text-emerald-400 hover:underline mono truncate max-w-xs sm:max-w-lg';
  } else {
    a.innerText = 'Conectando ao túnel global Cloudflare (aguarde alguns segundos)...';
    a.href = '#';
    a.className = 'text-xs text-slate-400 italic mono truncate max-w-xs sm:max-w-lg';
  }
}

function copiarLinkPublico() {
  const link = linkPublicoAtual || window.location.origin;
  navigator.clipboard.writeText(link).then(() => {
    const btn = document.getElementById('btn-copiar-link');
    const icone = document.getElementById('icone-copiar');
    const texto = document.getElementById('texto-copiar');

    btn.className = 'flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5';
    if (icone) icone.innerText = 'done';
    if (texto) texto.innerText = 'Copiado!';

    setTimeout(() => {
      btn.className = 'flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5 active:scale-95';
      if (icone) icone.innerText = 'content_copy';
      if (texto) texto.innerText = 'Copiar Link WhatsApp';
    }, 2000);
  }).catch(() => {
    prompt('Copie o link abaixo para enviar no WhatsApp:', link);
  });
}

function abrirQrCodeModal() {
  const baseLink = linkPublicoAtual || window.location.origin;
  const linkDownload = baseLink;
  const img = document.getElementById('img-qrcode');
  const txt = document.getElementById('qrcode-link-texto');
  if (img) img.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(linkDownload)}`;
  if (txt) txt.innerText = linkDownload;

  const modal = document.getElementById('modalQrCode');
  if (modal) modal.classList.remove('opacity-0', 'pointer-events-none');
}

function fecharQrCodeModal() {
  const modal = document.getElementById('modalQrCode');
  if (modal) modal.classList.add('opacity-0', 'pointer-events-none');
}

// INICIALIZAÇÃO
carregarTudo();

// Sincronização em tempo real a cada 3 segundos
setInterval(() => {
  carregarTelemetria();
  carregarDadosPelada();
  carregarLogs();
}, 3000);
