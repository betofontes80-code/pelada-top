// Pelada Top - Frontend Unificado com Som de Apito do Juiz & Lista Oficial de Presença Exclusiva
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Pelada Top] Inicializando frontend com som de apito e listagem restrita...');

    let atletasCache = [];
    let atletaSelecionadoId = null;

    // Função nativa para tocar o apito do juiz (Web Audio API)
    function tocarApitoJuiz() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const audioCtx = new AudioCtx();
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
            }

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2700, audioCtx.currentTime); // Frequência aguda de apito de futebol
            
            gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 0.35);
            console.log('📢 [ÁUDIO] Apito tocado para notificar presença confirmada na lista!');
            logTerminal('📢 [APITO] Apito sonoro disparado em tempo real!');
        } catch (e) {
            console.warn('Áudio bloqueado pelo navegador até haver interação.', e);
        }
    }

    // Conexão SSE Realtime
    const eventSource = new EventSource('/events/match-stream');

    eventSource.onopen = () => {
        logTerminal('[SSE] Conectado ao canal oficial de tempo real.');
        const kpiConn = document.getElementById('kpiServerConnection');
        if (kpiConn) kpiConn.textContent = 'Conectado (SSE Ativo)';
    };

    eventSource.addEventListener('geofence_update', (e) => {
        try {
            const payload = JSON.parse(e.data);
            console.log('[SSE] Atualização recebida:', payload);
            
            if (payload.dispararApito) {
                tocarApitoJuiz();
            }
            
            logTerminal(`[SSE] Atleta #${payload.athleteId} -> ${payload.distanceMeters !== undefined && payload.distanceMeters !== null ? payload.distanceMeters + 'm' : 'Sem GPS'} [${(payload.status || '').toUpperCase()}]`);
            carregarAtletas();
        } catch (err) {
            console.error('Erro no SSE:', err);
        }
    });

    eventSource.addEventListener('GEOFENCE_UPDATE', (e) => {
        try {
            const payload = JSON.parse(e.data);
            if (payload.dispararApito) {
                tocarApitoJuiz();
            }
            carregarAtletas();
        } catch (err) {}
    });

    eventSource.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.dispararApito) {
                tocarApitoJuiz();
            }
            if (data.type === 'geofence_update' || data.type === 'GEOFENCE_UPDATE' || data.athleteId) {
                carregarAtletas();
            }
        } catch (err) {}
    };

    eventSource.onerror = () => {
        const kpiConn = document.getElementById('kpiServerConnection');
        if (kpiConn) kpiConn.textContent = 'Reconectando SSE...';
    };

    async function carregarAtletas() {
        try {
            const res = await fetch('/api/pelada?t=' + Date.now());
            const data = await res.json();
            atletasCache = data.atletas || [];
            
            renderizarListaPresencaConfirmados(atletasCache);
            atualizarPainelControle(atletasCache);
            atualizarCardAtletaSelecionado();
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
        }
    }

    // Regra: Na Lista Oficial de Presença, exibe estritamente quem confirmou presença (<=500m ou status campo)
    function renderizarListaPresencaConfirmados(atletas) {
        const containerPresenca = document.getElementById('lista-presenca-oficial') || 
                                  document.querySelector('.lista-presenca-container') ||
                                  document.getElementById('lista-atletas-container');
        
        // Filtra estritamente os confirmados (ignora quem está com status 'reset', 'pendente' ou 'longe')
        const confirmados = atletas.filter(a => {
            if (a.statusGeofence === 'reset' || a.statusAproximacao === 'reset' || a.status === 'reset') return false;
            return a.statusGeofence === 'campo' || a.checkinLiberado || a.chegadaConfirmada || a.statusPresenca === 'chegou';
        });
        
        const contadorEl = document.getElementById('kpiConfirmados');
        if (contadorEl) contadorEl.textContent = `/ ${confirmados.length} Confirmados`;

        const kpiJogadores = document.getElementById('kpiTotalAtletas');
        if (kpiJogadores) kpiJogadores.textContent = `${atletas.length} Atletas`;

        // Se o container de listagem existir na tela, renderiza apenas os confirmados
        if (containerPresenca) {
            containerPresenca.innerHTML = '';
            if (confirmados.length === 0) {
                containerPresenca.innerHTML = '<div class="text-center text-slate-400 py-3 text-xs italic">Nenhum atleta confirmado no campo no momento.</div>';
                return;
            }
            confirmados.forEach((a, index) => {
                const item = document.createElement('div');
                item.className = 'flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium my-1 shadow-xs';
                const distTxt = a.distanciaMeters !== undefined && a.distanciaMeters !== null ? `${a.distanciaMeters}m` : 'No Campo';
                item.innerHTML = `
                    <div class="flex items-center gap-2">
                        <span class="font-mono font-bold text-emerald-800 text-xs">#${index + 1}</span>
                        <span class="font-bold text-[#131313]">${a.nome || a.name}</span>
                        <span class="px-1.5 py-0.5 text-[10px] font-mono bg-blue-100 text-blue-800 rounded font-bold">${a.posicao || a.position || 'MEI'}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="font-mono text-[11px] text-emerald-700">${distTxt}</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">⚽ NO CAMPO</span>
                    </div>
                `;
                containerPresenca.appendChild(item);
            });
        }
    }

    function atualizarPainelControle(atletas) {
        const selects = [document.getElementById('gps-athlete-select'), document.getElementById('selectAtleta')].filter(Boolean);
        selects.forEach(select => {
            const valorAtual = select.value || atletaSelecionadoId;
            select.innerHTML = '';
            atletas.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a.id;
                const dist = (a.distanciaMeters !== undefined && a.distanciaMeters !== null) ? `${a.distanciaMeters}m` : 
                             ((a.distanciaMetros !== undefined && a.distanciaMetros !== null) ? `${a.distanciaMetros}m` : 'Sem GPS');
                const st = (a.statusGeofence || a.statusAproximacao || 'reset').toUpperCase();
                opt.textContent = `${a.nome || a.name} (${a.posicao || a.position || 'MEI'}) — ${dist} [${st}]`;
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
        const dist = (a.distanciaMeters !== undefined && a.distanciaMeters !== null) ? a.distanciaMeters : 
                     ((a.distanciaMetros !== undefined && a.distanciaMetros !== null) ? a.distanciaMetros : null);
        if (distEl) distEl.textContent = dist !== null ? `${dist} m` : 'Sem GPS';

        const statusTag = document.getElementById('selectedAthleteStatusTag');
        const st = (a.statusGeofence || a.statusAproximacao || 'reset').toUpperCase();
        if (statusTag) {
            statusTag.textContent = st === 'CAMPO' ? 'NO CAMPO' : (st === 'PROXIMO' ? 'PRÓXIMO' : (st === 'RESET' ? 'SEM GPS' : 'LONGE'));
            statusTag.className = `font-mono font-bold text-xs ${st === 'CAMPO' ? 'text-emerald-700' : (st === 'PROXIMO' ? 'text-amber-700' : (st === 'RESET' ? 'text-slate-500' : 'text-red-700'))}`;
        }

        const badgeFaixa = document.getElementById('simFaixaBadge');
        if (badgeFaixa) {
            if (st === 'CAMPO' || (dist !== null && dist <= 500)) {
                badgeFaixa.className = 'p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold shadow-xs';
                badgeFaixa.textContent = '🟢 FAIXA 3: NO CAMPO (≤ 500m) — Chegada Autorizada!';
            } else if (st === 'PROXIMO' || (dist !== null && dist <= 1500)) {
                badgeFaixa.className = 'p-2.5 bg-amber-50 border border-amber-300 text-amber-800 rounded-lg text-xs font-bold shadow-xs';
                badgeFaixa.textContent = '🟡 FAIXA 2: PRÓXIMO (501m a 1500m) — A Caminho';
            } else if (st === 'RESET') {
                badgeFaixa.className = 'p-2.5 bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold';
                badgeFaixa.textContent = '⚪ PADRÃO ORIGINAL: RESET / SEM GPS (Ausente da Lista)';
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

    // Disparador de Confirmação de Presença / Geofence (Garante listagem e salvamento imediato)
    window.executarCheckinAtleta = async function(atletaId, distancia, status) {
        const targetId = atletaId || getAtletaSelecionadoId();
        if (!targetId) return;
        try {
            const distLabel = distancia !== null && distancia !== undefined ? `${distancia}m` : 'Sem GPS';
            logTerminal(`[DISPARO] Enviando: Atleta #${targetId} -> ${distLabel} (${status})`);
            const res = await fetch('/api/v2/geofence-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ athleteId: targetId, distanceMeters: distancia, customStatus: status })
            });
            const data = await res.json();
            if (data.sucesso || data.success) {
                console.log('Presença / Geofence atualizada com sucesso!');
                if (data.dispararApito || status === 'campo' || (distancia !== null && distancia <= 500)) {
                    tocarApitoJuiz();
                }
                carregarAtletas();
            }
        } catch (e) {
            console.error('Erro na requisição:', e);
            logTerminal(`[ERRO] Falha de comunicação: ${e.message}`);
        }
    };

    // Configuração dos botões de simulação
    const configurarBotaoSimulacao = (btnId, distancia, status) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.onclick = () => window.executarCheckinAtleta(getAtletaSelecionadoId(), distancia, status);
        }
    };

    configurarBotaoSimulacao('btnGpsLonge', 3800, 'longe');
    configurarBotaoSimulacao('btnGpsProximo', 850, 'proximo');
    configurarBotaoSimulacao('btnGpsChegou', 120, 'campo');
    configurarBotaoSimulacao('btnGpsReset', null, 'reset'); // Botão de desfazer / resetar para o estado original
    configurarBotaoSimulacao('btnExecutarConfirmacao', 120, 'campo');

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

    // Inicialização da listagem
    carregarAtletas();
});
