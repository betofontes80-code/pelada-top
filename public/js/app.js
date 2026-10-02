// Pelada Top - Script Unificado de Frontend (Sem travas de Lista Fechada)
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Pelada Top] Inicializando app unificado...');

    let atletasCache = [];
    let atletaSelecionadoId = null;

    // Conexão SSE para atualizações instantâneas
    const eventSource = new EventSource('/events/match-stream');

    eventSource.onopen = () => {
        logTerminal('[SSE] Conectado ao canal de transmissão em tempo real.');
        const kpiConn = document.getElementById('kpiServerConnection');
        if (kpiConn) kpiConn.textContent = 'Conectado (SSE Ativo)';
    };

    eventSource.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === 'geofence_update' || data.type === 'GEOFENCE_UPDATE' || data.athleteId) {
                logTerminal(`[SSE_MSG] Atleta #${data.athleteId || (data.athlete && data.athlete.id)} atualizado: ${data.distanceMeters || data.distance || 0}m (${data.status || 'longe'})`);
                carregarAtletas();
            }
        } catch (err) {}
    };

    eventSource.addEventListener('geofence_update', (e) => {
        try {
            const payload = JSON.parse(e.data);
            console.log('[SSE] Atualização recebida:', payload);
            logTerminal(`[SSE_GEOFENCE] Atleta #${payload.athleteId} atualizado para ${payload.distanceMeters}m (${payload.status})`);
            carregarAtletas(); // Recarrega a lista dinamicamente na tela
        } catch (err) {
            console.error('Erro ao processar evento SSE:', err);
        }
    });

    eventSource.addEventListener('GEOFENCE_UPDATE', (e) => {
        try {
            const payload = JSON.parse(e.data);
            carregarAtletas();
        } catch (err) {}
    });

    eventSource.onerror = () => {
        const kpiConn = document.getElementById('kpiServerConnection');
        if (kpiConn) kpiConn.textContent = 'Reconectando SSE...';
    };

    function logTerminal(msg) {
        const term = document.getElementById('terminalLog') || document.getElementById('pingTerminalLog');
        if (term) {
            const div = document.createElement('div');
            div.className = 'font-mono text-emerald-400 py-0.5 border-b border-slate-800 text-[11px]';
            div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
            term.appendChild(div);
            term.scrollTop = term.scrollHeight;
        }
    }

    async function carregarAtletas() {
        try {
            const res = await fetch('/api/pelada?t=' + Date.now());
            const data = await res.json();
            atletasCache = data.atletas || [];

            renderizarListaAtletas(atletasCache);
            atualizarSeletorTeste(atletasCache);
            atualizarCardAtletaSelecionado();
        } catch (err) {
            console.error('Erro ao carregar dados do banco:', err);
        }
    }

    // Renderiza a lista principal de jogadores no painel (corrigindo a exibição ao confirmar presença)
    function renderizarListaAtletas(atletas) {
        const container = document.getElementById('lista-atletas-container') || document.querySelector('.space-y-2');

        // Filtra ou atualiza contadores de confirmados
        const confirmados = atletas.filter(a => a.statusGeofence === 'campo' || a.checkinLiberado || a.chegadaConfirmada || a.statusPresenca === 'chegou' || a.statusPresenca === 'confirmado').length;
        const contadorEl = document.getElementById('kpiConfirmados');
        if (contadorEl) contadorEl.textContent = `/ ${confirmados} Confirmados`;

        const kpiJogadores = document.getElementById('kpiTotalAtletas') || document.getElementById('kpiTotalJogadores');
        if (kpiJogadores) kpiJogadores.textContent = `${atletas.length} Atletas`;

        if (container && container.id === 'lista-atletas-container') {
            container.innerHTML = '';
            atletas.forEach(a => {
                const item = document.createElement('div');
                item.className = 'flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg text-xs';
                const distTxt = a.distanciaMeters !== undefined && a.distanciaMeters !== null ? `${a.distanciaMeters}m` : 'Sem GPS';
                const st = (a.statusGeofence || a.statusAproximacao || 'pendente').toUpperCase();
                const badgeColor = st === 'CAMPO' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                                   st === 'PROXIMO' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                                   'bg-slate-100 text-slate-700 border-slate-300';

                item.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-900">${a.nome || a.name}</span>
                        <span class="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 font-mono">${a.posicao || a.position || 'MEI'}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-mono text-slate-500">${distTxt}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}">${st}</span>
                    </div>
                `;
                container.appendChild(item);
            });
        }
    }

    function atualizarSeletorTeste(atletas) {
        const selects = [document.getElementById('gps-athlete-select'), document.getElementById('selectAtleta')].filter(Boolean);
        selects.forEach(select => {
            const valorAtual = select.value || atletaSelecionadoId;
            select.innerHTML = '';
            atletas.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id;
                const dist = a.distanciaMeters !== undefined && a.distanciaMeters !== null ? `${a.distanciaMeters}m` : (a.distanciaMetros !== undefined && a.distanciaMetros !== null ? `${a.distanciaMetros}m` : 'Sem GPS');
                const st = a.statusGeofence || a.statusAproximacao || 'pendente';
                opt.textContent = `${a.nome || a.name} (${a.posicao || a.position || 'MEI'}) — ${dist} [${st.toUpperCase()}]`;
                select.appendChild(opt);
            });

            if (valorAtual && atletas.some(a => String(a.id) === String(valorAtual))) {
                select.value = valorAtual;
            } else if (atletas.length > 0) {
                select.value = atletas[0].id;
                atletaSelecionadoId = atletas[0].id;
            }
        });

        if (!atletaSelecionadoId && atletas.length > 0) {
            atletaSelecionadoId = atletas[0].id;
        }
    }

    function atualizarCardAtletaSelecionado() {
        const id = getAtletaSelecionadoId();
        const a = atletasCache.find(x => String(x.id) === String(id));
        if (!a) return;

        const nomeEl = document.getElementById('selectedAthleteName');
        if (nomeEl) nomeEl.textContent = a.nome || a.name || 'Lucas Silva';

        const posEl = document.getElementById('selectedAthletePos');
        if (posEl) posEl.textContent = a.posicao || a.position || 'MEI';

        const distEl = document.getElementById('selectedAthleteDistance');
        const dist = a.distanciaMeters !== undefined && a.distanciaMeters !== null ? a.distanciaMeters : (a.distanciaMetros !== undefined && a.distanciaMetros !== null ? a.distanciaMetros : null);
        if (distEl) distEl.textContent = dist !== null ? `${dist} m` : 'Sem GPS';

        const statusTag = document.getElementById('selectedAthleteStatusTag');
        const st = (a.statusGeofence || a.statusAproximacao || 'longe').toUpperCase();
        if (statusTag) {
            statusTag.textContent = st === 'CAMPO' ? 'NO CAMPO' : (st === 'PROXIMO' ? 'PRÓXIMO' : 'LONGE');
            statusTag.className = `font-mono font-bold text-xs ${st === 'CAMPO' ? 'text-emerald-700' : (st === 'PROXIMO' ? 'text-amber-700' : 'text-red-700')}`;
        }

        const badgeFaixa = document.getElementById('simFaixaBadge');
        if (badgeFaixa) {
            if (st === 'CAMPO' || (dist !== null && dist <= 500)) {
                badgeFaixa.className = 'p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold shadow-xs';
                badgeFaixa.textContent = '🟢 FAIXA 3: NO CAMPO (≤ 500m) — Chegada Autorizada!';
            } else if (st === 'PROXIMO' || (dist !== null && dist <= 1500)) {
                badgeFaixa.className = 'p-2.5 bg-amber-50 border border-amber-300 text-amber-800 rounded-lg text-xs font-bold shadow-xs';
                badgeFaixa.textContent = '🟡 FAIXA 2: PRÓXIMO (501m a 1500m) — A Caminho';
            } else {
                badgeFaixa.className = 'p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold';
                badgeFaixa.textContent = '🔴 FAIXA 1: LONGE (> 1.5 km) — Check-in Bloqueado';
            }
        }
    }

    function getAtletaSelecionadoId() {
        const select = document.getElementById('gps-athlete-select') || document.getElementById('selectAtleta');
        return (select && select.value) ? select.value : atletaSelecionadoId;
    }

    // Disparador de Confirmação de Presença / Geofence (Garante listagem e salvamento imediato)
    window.executarCheckinAtleta = async function(atletaId, distancia, status) {
        try {
            const targetId = atletaId || getAtletaSelecionadoId();
            logTerminal(`[DISPARO] Enviando simulação: Atleta #${targetId} -> ${distancia}m (${status})`);
            const res = await fetch('/api/v2/geofence-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ athleteId: targetId, distanceMeters: distancia, customStatus: status })
            });
            const data = await res.json();
            if (data.sucesso || data.success) {
                console.log('Presença confirmada e salva no banco com sucesso!');
                logTerminal(`[SUCESSO] Servidor confirmou e persistiu: ${data.status || status}`);
                carregarAtletas();
            } else {
                logTerminal(`[ERRO] Falha no servidor: ${data.message || 'Erro desconhecido'}`);
            }
        } catch (e) {
            console.error('Erro ao comunicar com o servidor:', e);
            logTerminal(`[FALHA] Erro de rede: ${e.message}`);
        }
    };

    // Associa eventos aos botões de simulação e seletores
    function configurarControlesUI() {
        const selectGps = document.getElementById('gps-athlete-select');
        if (selectGps) {
            selectGps.addEventListener('change', (e) => {
                atletaSelecionadoId = e.target.value;
                const other = document.getElementById('selectAtleta');
                if (other) other.value = atletaSelecionadoId;
                atualizarCardAtletaSelecionado();
            });
        }

        const selectAtl = document.getElementById('selectAtleta');
        if (selectAtl) {
            selectAtl.addEventListener('change', (e) => {
                atletaSelecionadoId = e.target.value;
                const other = document.getElementById('gps-athlete-select');
                if (other) other.value = atletaSelecionadoId;
                atualizarCardAtletaSelecionado();
            });
        }

        const btnLonge = document.getElementById('btnGpsLonge');
        if (btnLonge) btnLonge.onclick = () => window.executarCheckinAtleta(getAtletaSelecionadoId(), 3800, 'longe');

        const btnProximo = document.getElementById('btnGpsProximo');
        if (btnProximo) btnProximo.onclick = () => window.executarCheckinAtleta(getAtletaSelecionadoId(), 850, 'proximo');

        const btnChegou = document.getElementById('btnGpsChegou');
        if (btnChegou) btnChegou.onclick = () => window.executarCheckinAtleta(getAtletaSelecionadoId(), 120, 'campo');

        const btnReset = document.getElementById('btnGpsReset');
        if (btnReset) btnReset.onclick = () => window.executarCheckinAtleta(getAtletaSelecionadoId(), 0, 'reset');

        const btnConf = document.getElementById('btnExecutarConfirmacao');
        if (btnConf) btnConf.onclick = () => window.executarCheckinAtleta(getAtletaSelecionadoId(), 120, 'campo');

        const btnPing = document.getElementById('btnTestarPing');
        if (btnPing) {
            btnPing.onclick = async () => {
                try {
                    const start = Date.now();
                    const res = await fetch('/api/v2/ping');
                    const r = await res.json();
                    const rtt = Date.now() - start;
                    logTerminal(`[PING] Resposta em ${rtt}ms: ${JSON.stringify(r)}`);
                } catch (e) {
                    logTerminal(`[PING_ERRO] Falha: ${e.message}`);
                }
            };
        }

        const btnLimpar = document.getElementById('btnLimparTerminal');
        if (btnLimpar) {
            btnLimpar.onclick = () => {
                const term = document.getElementById('terminalLog') || document.getElementById('pingTerminalLog');
                if (term) term.innerHTML = '';
            };
        }

        const btnAtualizar = document.getElementById('btnAtualizarStatus');
        if (btnAtualizar) btnAtualizar.onclick = () => carregarAtletas();
    }

    configurarControlesUI();
    // Inicialização da listagem
    carregarAtletas();
});
