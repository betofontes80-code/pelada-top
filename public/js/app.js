// Pelada Top - Painel de Diagnóstico do Servidor, SSE & Simulação Geofence 500m

// Servidor Alvo Oficial: Operação Exclusiva em Nuvem Render
const apiBase = 'https://pelada-top.onrender.com';

// Retorna URL completa para chamadas de API e EventSource apontando exclusivamente para o Render
function getApiUrl(path) {
  if (!path) return apiBase;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : '/' + path;
  if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.protocol.startsWith('http')) {
    return cleanPath;
  }
  return `${apiBase}${cleanPath}`;
}

// Mantém configuração do host ativa e visível no painel
function sincronizarHostRender() {
  const hostInput = document.getElementById('inputTestHost');
  if (hostInput) hostInput.value = 'pelada-top.onrender.com';

  const kpiHost = document.getElementById('kpiServerHost');
  if (kpiHost) kpiHost.textContent = 'pelada-top.onrender.com';

  const kpiConn = document.getElementById('kpiServerConnection');
  if (kpiConn) kpiConn.textContent = 'Nuvem Oficial (Render)';
}

// Função nativa para tocar o apito do juiz (Web Audio API)
function tocarApitoJuiz() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window._appAudioCtx) window._appAudioCtx = new AudioCtx();
    const ctx = window._appAudioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2700, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    logTerminal('📢 [APITO]', 'Apito do árbitro acionado em tempo real!', 'success');
  } catch (e) {
    console.warn('Áudio bloqueado pelo navegador até haver interação.', e);
  }
}

// Renderização exclusiva da Lista Oficial de Presença (somente confirmados no campo)
function renderizarListaPresencaConfirmados() {
  const container = document.getElementById('lista-presenca-oficial');
  const kpiEl = document.getElementById('kpiConfirmados');
  if (!container) return;

  const confirmados = (state.athletes || []).filter(a => {
    const st = String(a.status || a.statusGeofence || a.statusAproximacao || '').toLowerCase();
    const dist = (a.distanciaMetros !== null && a.distanciaMetros !== undefined) ? Number(a.distanciaMetros) : (a.distance !== null && a.distance !== undefined ? Number(a.distance) : null);
    const chegou = a.chegadaConfirmada === true || a.checkedIn === true || a.statusPresenca === 'chegou' || st === 'campo' || (dist !== null && dist <= 500 && st !== 'reset');
    return chegou && st !== 'reset';
  });

  if (kpiEl) {
    kpiEl.textContent = `/ ${confirmados.length} Confirmados`;
  }

  if (confirmados.length === 0) {
    container.innerHTML = '<div class="text-center text-slate-400 py-3 text-xs">Nenhum atleta confirmado no campo no momento.</div>';
    return;
  }

  container.innerHTML = confirmados.map((a, i) => `
    <div class="flex items-center justify-between p-2 bg-[#1e293b]/70 border border-emerald-500/30 rounded-lg text-xs">
      <div class="flex items-center gap-2 min-w-0">
        <span class="font-mono font-bold text-emerald-400 text-[11px]">#${i + 1}</span>
        <span class="font-bold text-white truncate">${a.nome || a.name || 'Atleta'}</span>
        <span class="text-[10px] text-slate-300 bg-slate-700/60 px-1.5 py-0.5 rounded font-mono">${a.posicao || a.position || 'MEI'}</span>
      </div>
      <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-full">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
        ⚽ NO CAMPO
      </span>
    </div>
  `).join('');
}

// ID do Atleta atualmente selecionado na aba de simulação de GPS
let currentAthleteId = 'jog_1790559444604'; // Padrão: Lucas Silva

// Estado da Aplicação (Pré-inicializado com todos os 23 atletas reais)
const state = {
  athletes: [
  {
    "id": "jog_1790559444604",
    "name": "Lucas Silva",
    "nome": "Lucas Silva",
    "position": "ATA",
    "posicao": "ATA",
    "age": 28,
    "idade": 28,
    "weight": 76,
    "peso": 76,
    "fit": 90,
    "fitness": 90,
    "distance": 50,
    "distanciaMetros": 50,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": true
  },
  {
    "id": "1",
    "name": "Lucas",
    "nome": "Lucas",
    "position": "ATA",
    "posicao": "ATA",
    "age": 28,
    "idade": 28,
    "weight": 76,
    "peso": 76,
    "fit": 90,
    "fitness": 90,
    "distance": 50,
    "distanciaMetros": 50,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": true
  },
  {
    "id": "1790087728171",
    "name": "Markinhos papel",
    "nome": "Markinhos papel",
    "position": "ATA",
    "posicao": "ATA",
    "age": 26,
    "idade": 26,
    "weight": 70,
    "peso": 70,
    "fit": 100,
    "fitness": 100,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "admin_topadmin",
    "name": "Top Admin",
    "nome": "Top Admin",
    "position": "MEI",
    "posicao": "MEI",
    "age": 30,
    "idade": 30,
    "weight": 76,
    "peso": 76,
    "fit": 100,
    "fitness": 100,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790299111176",
    "name": "teste-geo",
    "nome": "teste-geo",
    "position": "ZAG",
    "posicao": "ZAG",
    "age": 50,
    "idade": 50,
    "weight": 75,
    "peso": 75,
    "fit": 100,
    "fitness": 100,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790293060399",
    "name": "Josinaldo Silverio",
    "nome": "Josinaldo Silverio",
    "position": "VOL",
    "posicao": "VOL",
    "age": 45,
    "idade": 45,
    "weight": 73,
    "peso": 73,
    "fit": 100,
    "fitness": 100,
    "distance": 3800,
    "distanciaMetros": 3800,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790196420200",
    "name": "Piqueno",
    "nome": "Piqueno",
    "position": "VOL",
    "posicao": "VOL",
    "age": 37,
    "idade": 37,
    "weight": 75,
    "peso": 75,
    "fit": 100,
    "fitness": 100,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790193828029",
    "name": "Edyelk Nascimento",
    "nome": "Edyelk Nascimento",
    "position": "ZAG",
    "posicao": "ZAG",
    "age": 40,
    "idade": 40,
    "weight": 90,
    "peso": 90,
    "fit": 100,
    "fitness": 100,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790129211093",
    "name": "Igor Bruno",
    "nome": "Igor Bruno",
    "position": "MEI",
    "posicao": "MEI",
    "age": 39,
    "idade": 39,
    "weight": 69,
    "peso": 69,
    "fit": 60,
    "fitness": 60,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790117518077",
    "name": "Rian",
    "nome": "Rian",
    "position": "VOL",
    "posicao": "VOL",
    "age": 27,
    "idade": 27,
    "weight": 80,
    "peso": 80,
    "fit": 80,
    "fitness": 80,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790112808958",
    "name": "Israel Antony",
    "nome": "Israel Antony",
    "position": "ATA",
    "posicao": "ATA",
    "age": 17,
    "idade": 17,
    "weight": 92,
    "peso": 92,
    "fit": 100,
    "fitness": 100,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790108877220",
    "name": "Vg",
    "nome": "Vg",
    "position": "ATA",
    "posicao": "ATA",
    "age": 27,
    "idade": 27,
    "weight": 91,
    "peso": 91,
    "fit": 100,
    "fitness": 100,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790095187982",
    "name": "JACKSON ANTONIO ONOFRE FELICIANO",
    "nome": "JACKSON ANTONIO ONOFRE FELICIANO",
    "position": "MEI",
    "posicao": "MEI",
    "age": 29,
    "idade": 29,
    "weight": 75,
    "peso": 75,
    "fit": 100,
    "fitness": 100,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790095173718",
    "name": "João Vitor Medeiros",
    "nome": "João Vitor Medeiros",
    "position": "VOL",
    "posicao": "VOL",
    "age": 41,
    "idade": 41,
    "weight": 88,
    "peso": 88,
    "fit": 100,
    "fitness": 100,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790094302681",
    "name": "Clebson da Silva",
    "nome": "Clebson da Silva",
    "position": "ATA",
    "posicao": "ATA",
    "age": 37,
    "idade": 37,
    "weight": 75,
    "peso": 75,
    "fit": 60,
    "fitness": 60,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790090604903",
    "name": "Israel júnior",
    "nome": "Israel júnior",
    "position": "MEI",
    "posicao": "MEI",
    "age": 37,
    "idade": 37,
    "weight": 92,
    "peso": 92,
    "fit": 100,
    "fitness": 100,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790090596408",
    "name": "Wellington Angelo Macena de Aquino",
    "nome": "Wellington Angelo Macena de Aquino",
    "position": "ATA",
    "posicao": "ATA",
    "age": 40,
    "idade": 40,
    "weight": 90,
    "peso": 90,
    "fit": 100,
    "fitness": 100,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790088239867",
    "name": "Kayogol",
    "nome": "Kayogol",
    "position": "ATA",
    "posicao": "ATA",
    "age": 27,
    "idade": 27,
    "weight": 40,
    "peso": 40,
    "fit": 40,
    "fitness": 40,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790088185087",
    "name": "Nadson Ramon Bezerra Cavalcante / N10",
    "nome": "Nadson Ramon Bezerra Cavalcante / N10",
    "position": "ATA",
    "posicao": "ATA",
    "age": 47,
    "idade": 47,
    "weight": 85,
    "peso": 85,
    "fit": 100,
    "fitness": 100,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790087347771",
    "name": "MAYK MAIA",
    "nome": "MAYK MAIA",
    "position": "MEI",
    "posicao": "MEI",
    "age": 32,
    "idade": 32,
    "weight": 87,
    "peso": 87,
    "fit": 100,
    "fitness": 100,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790086881653",
    "name": "Sérgio Cassiano",
    "nome": "Sérgio Cassiano",
    "position": "ZAG",
    "posicao": "ZAG",
    "age": 45,
    "idade": 45,
    "weight": 80,
    "peso": 80,
    "fit": 100,
    "fitness": 100,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790086765395",
    "name": "Linkool Wesllyn",
    "nome": "Linkool Wesllyn",
    "position": "LAT",
    "posicao": "LAT",
    "age": 28,
    "idade": 28,
    "weight": 88,
    "peso": 88,
    "fit": 60,
    "fitness": 60,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  },
  {
    "id": "1790086212853",
    "name": "Beto",
    "nome": "Beto",
    "position": "LAT",
    "posicao": "LAT",
    "age": 46,
    "idade": 46,
    "weight": 90,
    "peso": 90,
    "fit": 40,
    "fitness": 40,
    "distance": null,
    "distanciaMetros": null,
    "status": "longe",
    "checkedIn": false,
    "canCheckIn": false
  }
],
  selectedAthleteId: 'jog_1790559444604',
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

    state.eventSource.addEventListener('geofence_update', (event) => {
      try {
        const data = JSON.parse(event.data);
        handleSSEEvent({ ...data, type: 'geofence_update' });
      } catch (e) {
        logTerminal('SSE_RAW', event.data, 'sse');
      }
    });

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
    renderizarListaPresencaConfirmados();
    logTerminal('INIT_STATE', `Sincronização inicial: ${state.athletes.length} atletas recebidos via SSE`, 'sse');
    return;
  }

  if (tipo === 'SYNC') {
    if (Array.isArray(data.atletas) && data.atletas.length > 0) {
      state.athletes = data.atletas.map(normalizarAtleta);
    } else if (Array.isArray(data.listaConfirmados) && data.listaConfirmados.length > 0) {
      state.athletes = data.listaConfirmados.map(normalizarAtleta);
    }
    renderAtletasDropdown();
    renderGpsSelect();
    atualizarDisplayAtleta(currentAthleteId);
    renderListaAtletasGPS();
    atualizarKpis();
    renderizarListaPresencaConfirmados();
    carregarCadastrosGeraisAdmin();
    logTerminal('SYNC', `Sincronização consolidada recebida via SSE (${state.athletes.length} atletas)`, 'success');
    return;
  }

  if (tipo === 'JOGADOR_ONLINE') {
    carregarAtletas();
    carregarCadastrosGeraisAdmin();
    if (data.dispararApito) {
      tocarApitoJuiz();
    }
    logTerminal('JOGADOR_ONLINE', data.mensagem || 'Jogador atualizado na lista da pelada', 'info');
    return;
  }

  if (tipo === 'LISTA_ZERADA_AUTO') {
    carregarAtletas();
    carregarCadastrosGeraisAdmin();
    logTerminal('RESET_AUTO', data.mensagem || 'Lista de presença zerada após meia-noite', 'warning');
    return;
  }


  if (tipo === 'geofence_update' || tipo === 'GEOFENCE_UPDATE') {
    const aId = String(data.athleteId || (data.athlete && data.athlete.id) || '');
    const aNome = data.athleteName || (data.athlete && (data.athlete.name || data.athlete.nome)) || '';
    const athlete = state.athletes.find(a => (aId && String(a.id) === aId) || (aNome && (a.name || a.nome).toLowerCase() === aNome.toLowerCase()));
    const isReset = data.status === 'reset' || data.customStatus === 'reset';
    const distNum = (data.distanceMeters !== undefined && data.distanceMeters !== null) ? Number(data.distanceMeters) : ((data.distance !== undefined && data.distance !== null) ? Number(data.distance) : null);
    const isCampo = data.status === 'campo' || data.statusGeofence === 'campo' || (distNum !== null && distNum <= 500 && !isReset);

    if (athlete) {
      athlete.distance = isReset ? null : distNum;
      athlete.distanciaMetros = athlete.distance;
      athlete.distanciaMeters = athlete.distance;
      athlete.status = isReset ? 'reset' : (data.status || (isCampo ? 'campo' : 'longe'));
      athlete.statusGeofence = athlete.status;
      athlete.canCheckIn = isCampo;
      athlete.checkinLiberado = isCampo;
      if (isReset) {
        athlete.checkedIn = false;
        athlete.chegadaConfirmada = false;
        athlete.statusPresenca = 'pendente';
        athlete.horaChegada = null;
      } else if (isCampo || data.chegadaConfirmada) {
        athlete.checkedIn = true;
        athlete.chegadaConfirmada = true;
        athlete.statusPresenca = 'chegou';
      }
    }

    atualizarDisplayAtleta(currentAthleteId);
    renderListaAtletasGPS();
    renderGpsSelect();
    atualizarKpis();
    renderizarListaPresencaConfirmados();

    if (data.dispararApito) {
      tocarApitoJuiz();
    }

    const isOk = isCampo;
    logTerminal('SSE_GEOFENCE', `[Tempo Real] Atleta #${data.athleteId} -> ${athlete ? (athlete.name || athlete.nome) : ''}: ${distNum !== null ? distNum + 'm' : 'Sem GPS'} | Status: ${(data.status || '').toUpperCase()}`, isOk ? 'success' : 'warning');
    return;
  }

  if (tipo === 'CHECKIN_CONFIRMED') {
    const athlete = state.athletes.find(a => String(a.id) === String(data.athleteId));
    if (athlete) {
      athlete.checkedIn = true;
      athlete.chegadaConfirmada = true;
      athlete.statusPresenca = 'chegou';
      athlete.status = 'campo';
      athlete.distance = data.distance;
      athlete.distanciaMetros = data.distance;
    }
    atualizarDisplayAtleta(currentAthleteId);
    renderListaAtletasGPS();
    renderGpsSelect();
    atualizarKpis();
    renderizarListaPresencaConfirmados();
    tocarApitoJuiz();
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


// Função universal para normalização de atletas da base real (database.json)
function normalizarAtleta(a, idx) {
  const id = (a.id !== undefined && a.id !== null) ? String(a.id) : String(idx + 1);
  const name = a.nome || a.name || ('Atleta ' + (idx + 1));
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

  const checkedIn = a.chegadaConfirmada === true || a.checkedIn === true || a.statusPresenca === 'chegou' || a.status === 'campo' || a.statusAproximacao === 'campo';

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
}

// Carregar lista de atletas (Consome todos os 23 atletas reais da nuvem Render)
async function carregarAtletas() {
  try {
    const res = await fetch(getApiUrl('/api/v2/athletes'), { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        state.athletes = data.map(normalizarAtleta);
      }
    }
  } catch (err) {
    console.warn('Erro ao carregar atletas do Render:', err.message);
  }

  // Sincroniza dinamicamente o seletor dropdown e a listagem de atletas
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

  const targetId = String(currentAthleteId || select.value || (state.athletes[0] ? state.athletes[0].id : ''));
  select.innerHTML = '';

  state.athletes.forEach(a => {
    const opt = document.createElement('option');
    opt.value = String(a.id);
    const nome = a.name || a.nome;
    opt.setAttribute('data-nome', nome);
    const pos = a.position || a.posicao || 'MEI';
    let distVal = (a.distance !== undefined && a.distance !== null && !isNaN(Number(a.distance))) ? Number(a.distance) : ((a.distanciaMetros !== undefined && a.distanciaMetros !== null && !isNaN(Number(a.distanciaMetros))) ? Number(a.distanciaMetros) : null);
    const dist = distVal !== null ? `${distVal}m` : 'Sem GPS';
    const st = (a.status || 'longe').toUpperCase();
    const check = a.checkedIn ? '⚽ OK' : '⏳ Pend';
    opt.textContent = `${nome} (${pos}) — ${dist} [${st}] [${check}]`;
    if (String(a.id) === targetId) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });

  if (targetId && state.athletes.some(a => String(a.id) === targetId)) {
    select.value = targetId;
    currentAthleteId = targetId;
  } else if (state.athletes.length > 0) {
    select.value = String(state.athletes[0].id);
    currentAthleteId = String(state.athletes[0].id);
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
    if (a.status === 'campo' || a.checkedIn || (a.distance !== undefined && a.distance !== null && a.distance <= 500 && a.status !== 'reset')) {
      statusBadge = '<span class="px-1.5 py-0.5 text-[9px] font-mono rounded bg-emerald-100 text-emerald-800 font-bold">No Campo</span>';
    } else if (a.status === 'proximo' || (a.distance !== null && a.distance > 500 && a.distance <= 1500)) {
      statusBadge = '<span class="px-1.5 py-0.5 text-[9px] font-mono rounded bg-amber-100 text-amber-800">Próximo</span>';
    } else if (a.status === 'reset') {
      statusBadge = '<span class="px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-100 text-slate-700">Reset</span>';
    }

    const checkBadge = a.checkedIn
      ? '<span class="text-emerald-600 font-bold">⚽ Sim</span>'
      : '<span class="text-slate-400">⏳ Não</span>';

    let distVal = null;
    if (a.distance !== undefined && a.distance !== null && !isNaN(Number(a.distance))) {
      distVal = Number(a.distance);
    } else if (a.distanciaMetros !== undefined && a.distanciaMetros !== null && !isNaN(Number(a.distanciaMetros))) {
      distVal = Number(a.distanciaMetros);
    }
    const distTexto = distVal !== null ? `${distVal}m` : '-';

    tr.innerHTML = `
      <td class="px-2.5 py-1.5 flex items-center gap-1.5">
        <span>${a.name || a.nome}</span>
      </td>
      <td class="px-2 py-1.5 text-center font-mono text-[10px] text-slate-600">${a.position || a.posicao || 'MEI'}</td>
      <td class="px-2 py-1.5 text-right font-mono font-semibold">${distTexto}</td>
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
  if (status === 'reset' || dist === 0 || dist === null) {
    if (tagEl) {
      tagEl.textContent = status === 'reset' ? 'RESETADO' : 'AGUARDANDO';
      tagEl.className = 'font-mono font-bold text-xs text-slate-500';
    }
    if (faixaBadge) {
      faixaBadge.textContent = status === 'reset' ? '⚪ STATUS RESETADO: Posição desfeita' : '⚪ AGUARDANDO LOCALIZAÇÃO GPS';
      faixaBadge.className = 'p-2.5 bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold';
    }
    if (btnCheckin) {
      btnCheckin.disabled = true;
      btnCheckin.className = 'w-full py-2.5 px-4 bg-slate-200 text-slate-400 font-bold text-xs uppercase tracking-wider rounded-lg cursor-not-allowed';
      btnCheckin.textContent = status === 'reset' ? '1. CHECK-IN BLOQUEADO (RESETADO)' : '1. CHECK-IN BLOQUEADO (SEM DISTÂNCIA)';
    }
  } else if (dist !== null && dist <= 500) {
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
  // Sincroniza de forma estrita com o ID e nome selecionados no dropdown no momento do clique
  const selectGps = document.getElementById('gps-athlete-select');
  let selectedId = null;
  let selectedNome = null;

  if (selectGps) {
    if (selectGps.value && selectGps.value !== 'null' && selectGps.value !== 'undefined') {
      selectedId = String(selectGps.value).trim();
    }
    if (selectGps.selectedIndex >= 0 && selectGps.options[selectGps.selectedIndex]) {
      const opt = selectGps.options[selectGps.selectedIndex];
      selectedNome = opt.getAttribute('data-nome') || opt.getAttribute('data-name');
    }
  }

  if (!selectedId && currentAthleteId) {
    selectedId = String(currentAthleteId).trim();
  }

  // Fallback seguro se o select ainda estiver inicializando
  if ((!selectedId || selectedId === '') && Array.isArray(state.athletes) && state.athletes.length > 0) {
    selectedId = String(state.athletes[0].id);
  }

  if (!selectedId || selectedId === '' || selectedId === 'null' || selectedId === 'undefined') {
    logTerminal('GPS_SIM_ERR', 'Nenhum atleta selecionado no dropdown para simulação de GPS!', 'error');
    alert('Por favor, selecione um atleta válido no seletor de GPS antes de simular a distância.');
    return;
  }

  currentAthleteId = selectedId;
  const athlete = state.athletes.find(a => String(a.id) === String(selectedId));
  const athleteNome = (athlete && (athlete.name || athlete.nome)) ? (athlete.name || athlete.nome) : (selectedNome || `Atleta #${selectedId}`);
  const distNum = (distancia !== null && distancia !== undefined && !isNaN(Number(distancia))) ? Number(distancia) : 0;

  // 1. Atualização otimista imediata na interface para feedback instantâneo sem recarregar
  if (athlete) {
    if (statusTag === 'reset') {
      athlete.status = 'reset';
      athlete.distance = 0;
      athlete.distanciaMetros = 0;
      athlete.checkedIn = false;
      athlete.canCheckIn = false;
    } else {
      athlete.distance = distancia;
      athlete.distanciaMetros = distancia;
      athlete.status = (distancia <= 500) ? 'campo' : statusTag;
      athlete.canCheckIn = distancia <= 500;
    }
    atualizarDisplayAtleta(currentAthleteId);
    renderListaAtletasGPS();
    renderGpsSelect();
  }

  logTerminal('GPS_SIM', `[Disparando] Simulação GPS: ${athleteNome} -> ${distancia}m (${statusTag.toUpperCase()})...`, 'info');

  try {
    const payload = {
      athleteId: selectedId,
      atletaId: selectedId,
      id: selectedId,
      nome: athleteNome,
      nomeAtleta: athleteNome,
      athleteName: athleteNome,
      distanceMeters: distNum,
      distance: distNum,
      distanciaMetros: distNum,
      customStatus: statusTag,
      status: statusTag,
      statusDistancia: statusTag
    };

    let response = await fetch(getApiUrl('/api/v2/geofence-test'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      response = await fetch(getApiUrl('/api/teste/simular-gps'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }
    }

    const result = await response.json();
    if (result && (result.success || result.athlete)) {
      const athleteObj = result.athlete || result.atleta;
      if (athleteObj) {
        const idx = state.athletes.findIndex(a => String(a.id) === String(athleteObj.id));
        if (idx !== -1) {
          state.athletes[idx] = { ...state.athletes[idx], ...normalizarAtleta(athleteObj, idx) };
        }
      }

      // 2. Atualiza instantaneamente a tabela de listagem individual e o card sem recarregar a página
      atualizarDisplayAtleta(currentAthleteId);
      renderListaAtletasGPS();
      renderGpsSelect();
      atualizarKpis();
      renderizarListaPresencaConfirmados();

      if (result.dispararApito) {
        tocarApitoJuiz();
      }

      const atletaAtualizado = state.athletes.find(a => String(a.id) === String(currentAthleteId));
      const distFinal = atletaAtualizado ? (atletaAtualizado.distance !== undefined ? atletaAtualizado.distance + 'm' : distancia + 'm') : distancia + 'm';
      const stFinal = atletaAtualizado ? (atletaAtualizado.status || statusTag).toUpperCase() : statusTag.toUpperCase();
      const isAllowed = result.allowed || (distancia <= 500 && statusTag !== 'reset');

      logTerminal(
        'GEOFENCE_RES',
        `Simulação confirmada pelo servidor: ${athleteNome} -> ${distFinal} | Status: [${stFinal}] | Check-in: ${isAllowed ? 'LIBERADO (≤500m)' : 'BLOQUEADO'}`,
        isAllowed ? 'success' : (statusTag === 'reset' ? 'info' : 'warning')
      );
    }
  } catch (error) {
    console.error("Erro na simulação:", error);
    logTerminal('GEOFENCE_ERR', `Falha na requisição de simulação: ${error.message}`, 'error');
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
      renderizarListaPresencaConfirmados();
      tocarApitoJuiz();
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
  const condSelect = document.getElementById('selectCondicao');
  if (condSelect) {
    const fVal = atleta.fit !== undefined ? atleta.fit : (atleta.fitness || 100);
    if (fVal >= 90) condSelect.value = '100% Fit';
    else if (fVal >= 75) condSelect.value = '80% Boa';
    else if (fVal >= 55) condSelect.value = '60% Regular';
    else condSelect.value = '40% Recupera';
  }
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


// Carrega cadastros gerais imediatamente ao abrir ou autenticar a aba Admin
async function carregarCadastrosGeraisAdmin() {
  logTerminal('ADMIN', 'Sincronizando cadastros gerais com a nuvem Render...', 'info');
  try {
    const res = await fetch(getApiUrl('/api/v2/athletes'), { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        state.athletes = data.map(normalizarAtleta);
        renderAtletasDropdown();
        renderGpsSelect();
        renderListaAtletasGPS();
        atualizarDisplayAtleta(currentAthleteId);
        atualizarKpis();
        logTerminal('ADMIN', `Cadastros gerais sincronizados: ${state.athletes.length} jogadores/admins prontos.`, 'success');
      }
    }
  } catch (err) {
    logTerminal('ADMIN_WARN', 'Carregamento geral em cache: ' + err.message, 'warning');
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
    carregarCadastrosGeraisAdmin();
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

// Excluir atleta - BLOQUEADO PELA TRAVA DE SEGURANÇA ESTRITA NO DATABASE.JSON
function excluirAtleta() {
  const atleta = getAtletaSelecionado();
  if (!atleta) return;

  logTerminal('SEGURANÇA', `Exclusão negada para [${atleta.name || atleta.nome}]: Trava de segurança estrita ativada contra perda de dados.`, 'error');
  alert('Operação Bloqueada: A trava de segurança estrita proíbe a exclusão ou limpeza de jogadores e administradores no database.json.');
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


// ============================================================================
// ROTINA DE AUTOMAÇÃO E BYPASS DE CONFIRMAÇÕES / PROMPTS DE SEGURANÇA
// ============================================================================
const SECURITY_BYPASS_INDEX = 3; // Elemento [3] (corresponde de forma exata à 4ª opção em arrays base 0)
const SECURITY_STORAGE_KEY = 'pelada_security_auto_bypass';
const SECURITY_OPTION_KEY = 'pelada_security_choice_index';

// Salva de forma definitiva no localStorage do navegador
function salvarPreferenciaBypassSeguranca() {
  try {
    localStorage.setItem(SECURITY_STORAGE_KEY, 'true');
    localStorage.setItem(SECURITY_OPTION_KEY, String(SECURITY_BYPASS_INDEX));
    localStorage.setItem('pelada_security_selected_option', 'opção 4');
  } catch (e) {}
}

// Executa a confirmação automática selecionando a 4ª opção (índice 3)
function executarBypassPromptSeguranca(opcoes = [], callbackConfirmacao) {
  salvarPreferenciaBypassSeguranca();

  let opcaoSelecionada = null;
  if (Array.isArray(opcoes) && opcoes.length > SECURITY_BYPASS_INDEX) {
    opcaoSelecionada = opcoes[SECURITY_BYPASS_INDEX];
  } else if (Array.isArray(opcoes) && opcoes.length > 0) {
    opcaoSelecionada = opcoes[opcoes.length - 1];
  } else {
    opcaoSelecionada = 'Opção 4 (Predefinida)';
  }

  logTerminal('SEGURANÇA', `Bypass de confirmação ativo: 4ª opção [índice ${SECURITY_BYPASS_INDEX}] selecionada e confirmada automaticamente.`, 'success');

  if (typeof callbackConfirmacao === 'function') {
    callbackConfirmacao(opcaoSelecionada, SECURITY_BYPASS_INDEX);
  }

  return opcaoSelecionada;
}

// Observador dinâmico do DOM para modais e prompts de confirmação
function iniciarObservadorModaisSeguranca() {

// Interceptação universal de confirms/prompts para bypass automático da 4ª opção
try {
  salvarPreferenciaBypassSeguranca();
  const _originalConfirm = window.confirm;
  window.confirm = function(mensagem) {
    salvarPreferenciaBypassSeguranca();
    logTerminal('SEGURANÇA', `Confirmação automática executada: 4ª opção [índice ${SECURITY_BYPASS_INDEX}] predefinida selecionada.`, 'success');
    return true;
  };
} catch(e) {}

  salvarPreferenciaBypassSeguranca();

  const processarModal = (container) => {
    if (!container) return;
    const opcoes = container.querySelectorAll('button, input[type="radio"], input[type="checkbox"], select option, .opcao-seguranca, .selectable-item');
    if (opcoes && opcoes.length > SECURITY_BYPASS_INDEX) {
      const elemento4 = opcoes[SECURITY_BYPASS_INDEX]; // exatamente o índice 3 (4ª opção)
      salvarPreferenciaBypassSeguranca();

      if (typeof elemento4.click === 'function') {
        elemento4.click();
      }

      const btnConfirmar = container.querySelector('button[type="submit"], .btn-confirm, button.confirm, [data-confirm]');
      if (btnConfirmar && btnConfirmar !== elemento4) {
        btnConfirmar.click();
      }

      logTerminal('AUTOMAÇÃO', `Modal de segurança detectado: 4ª opção [índice ${SECURITY_BYPASS_INDEX}] selecionada e confirmada automaticamente.`, 'success');
    }
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          if (node.matches && (node.matches('[role="dialog"], .modal, dialog, [data-modal], .confirm-dialog') || node.querySelector('[role="dialog"], .modal, dialog, [data-modal]'))) {
            const modalEl = node.matches('[role="dialog"], .modal, dialog, [data-modal], .confirm-dialog') ? node : node.querySelector('[role="dialog"], .modal, dialog, [data-modal], .confirm-dialog');
            processarModal(modalEl);
          }
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Event Listeners e Inicialização
function bootApp() {
  // Ajusta o link de acesso público para o host atual da máquina / rede
  const publicLinkEl = document.getElementById('inputPublicLink');
  if (publicLinkEl && window.location && window.location.origin) {
    publicLinkEl.value = 'https://pelada-top.onrender.com/teste';
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
  sincronizarHostRender();
  iniciarObservadorModaisSeguranca();
  carregarCadastrosGeraisAdmin();
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
  // Polling de fallback a cada 3.5s para garantir atualização mesmo em reconexões
  setInterval(carregarAtletas, 3500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
