// ===============================================
// PELADA TOP - LÓGICA DO ADMINISTRADOR
// ===============================================

if (typeof document !== 'undefined') {
    document.addEventListener("DOMContentLoaded", () => {
        // Elementos da Tela
        const btnToggleTrava = document.getElementById('btn-toggle-trava');
        const inputLocalQuadra = document.getElementById('local-quadra');
        const btnGps = document.getElementById('btn-gps');

        const displayCronometro = document.getElementById('display-cronometro');
        const btnIniciarCrono = document.getElementById('btn-iniciar-crono');
        const btnZerarCrono = document.getElementById('btn-zerar-crono');

        const listaJogadoresAdmin = document.getElementById('lista-jogadores-admin');
        const contadorConfirmados = document.getElementById('contador-confirmados');
        const btnGerarTimes = document.getElementById('btn-gerar-times');
        const secaoTimesResultado = document.getElementById('secao-times-resultado');
        const containerTimes = document.getElementById('container-times');
        const btnCopiarZap = document.getElementById('btn-copiar-zap');

        // Configuração da Pelada
        let peladaConfig = (typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem('pelada_config'))) || {
            liberada: true,
            dataHora: 'Quinta-feira às 20:00',
            local: 'Arena Gol de Placa - Rua do Campo, 100'
        };

        let textoParaWhatsapp = '';

        // ===============================================
        // 1. TRAVA DE TEMPO & ENDEREÇO / GPS
        // ===============================================
        function atualizarBotaoTrava() {
            if (!btnToggleTrava) return;
            if (peladaConfig.liberada) {
                btnToggleTrava.innerText = 'LISTA ABERTA (CLIQUE P/ FECHAR)';
                btnToggleTrava.style.backgroundColor = 'var(--verde-confirmado)';
            } else {
                btnToggleTrava.innerText = 'LISTA FECHADA (CLIQUE P/ ABRIR)';
                btnToggleTrava.style.backgroundColor = 'var(--vermelho-pelada)';
            }
        }

        if (btnToggleTrava) {
            btnToggleTrava.addEventListener('click', () => {
                peladaConfig.liberada = !peladaConfig.liberada;
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('pelada_config', JSON.stringify(peladaConfig));
                }
                atualizarBotaoTrava();
            });
        }

        if (inputLocalQuadra) {
            inputLocalQuadra.addEventListener('change', () => {
                peladaConfig.local = inputLocalQuadra.value.trim();
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('pelada_config', JSON.stringify(peladaConfig));
                }
            });
        }

        if (btnGps) {
            btnGps.addEventListener('click', () => {
                const local = inputLocalQuadra ? inputLocalQuadra.value.trim() : '';
                const endereco = encodeURIComponent(local);
                window.open(`https://www.google.com/maps/search/?api=1&query=${endereco}`, '_blank');
            });
        }

        // ===============================================
        // 2. CRONÔMETRO DE 10 MINUTOS
        // ===============================================
        let tempoSegundos = 600; // 10 minutos
        let cronometroTimer = null;
        let cronometroRodando = false;

        function formatarTempo(segundos) {
            const m = Math.floor(segundos / 60).toString().padStart(2, '0');
            const s = (segundos % 60).toString().padStart(2, '0');
            return `${m}:${s}`;
        }

        if (btnIniciarCrono) {
            btnIniciarCrono.addEventListener('click', () => {
                if (cronometroRodando) {
                    clearInterval(cronometroTimer);
                    cronometroRodando = false;
                    btnIniciarCrono.innerText = 'Iniciar';
                    btnIniciarCrono.style.backgroundColor = 'var(--verde-confirmado)';
                } else {
                    cronometroRodando = true;
                    btnIniciarCrono.innerText = 'Pausar';
                    btnIniciarCrono.style.backgroundColor = '#E65100';

                    cronometroTimer = setInterval(() => {
                        if (tempoSegundos > 0) {
                            tempoSegundos--;
                            if (displayCronometro) displayCronometro.innerText = formatarTempo(tempoSegundos);
                        } else {
                            clearInterval(cronometroTimer);
                            cronometroRodando = false;
                            alert('FIM DE JOGO! 10 MINUTOS ESGOTADOS! ⚽🔔');
                            btnIniciarCrono.innerText = 'Iniciar';
                        }
                    }, 1000);
                }
            });
        }

        if (btnZerarCrono) {
            btnZerarCrono.addEventListener('click', () => {
                clearInterval(cronometroTimer);
                cronometroRodando = false;
                tempoSegundos = 600;
                if (displayCronometro) displayCronometro.innerText = '10:00';
                if (btnIniciarCrono) {
                    btnIniciarCrono.innerText = 'Iniciar';
                    btnIniciarCrono.style.backgroundColor = 'var(--verde-confirmado)';
                }
            });
        }

        // ===============================================
        // 3. LISTA DE CONFIRMADOS
        // ===============================================
        function carregarListaConfirmados() {
            if (!listaJogadoresAdmin || !contadorConfirmados) return;
            let confirmados = (typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem('pelada_confirmados'))) || [];
            contadorConfirmados.innerText = `${confirmados.length} confirmados`;

            if (confirmados.length === 0) {
                listaJogadoresAdmin.innerHTML = `
                    <div style="text-align: center; padding: 20px 0;">
                        <p style="color: var(--cinza-texto); margin-bottom: 12px;">Nenhum jogador confirmou ainda.</p>
                        <button onclick="adicionarJogadoresSimulados()" class="btn-primary" style="background: #37474F; font-size: 13px; width: auto; padding: 8px 16px;">
                            ⚡ Gerar 10 Jogadores de Teste
                        </button>
                    </div>
                `;
                return;
            }

            let html = '';
            confirmados.forEach((j) => {
                const badgeEtaria = j.categoria === 'Veterano' ? 'badge-veterano' : 'badge-novo';
                html += `
                    <div class="jogador-item">
                        <div>
                            <strong>${j.nome}</strong> 
                            <span class="badge ${badgeEtaria}">${j.categoria} (${j.idade}a)</span>
                            <div style="font-size: 12px; color: var(--cinza-texto); margin-top: 2px;">
                                <span class="badge badge-pos">${j.posicao}</span> • ${j.aptidao} • ${j.peso}kg
                            </div>
                        </div>
                        <button onclick="removerJogador('${j.id}')" class="btn-del" title="Remover da Pelada">🗑️</button>
                    </div>
                `;
            });

            listaJogadoresAdmin.innerHTML = html;
        }

        if (typeof window !== 'undefined') {
            window.removerJogador = function(id) {
                let confirmados = (typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem('pelada_confirmados'))) || [];
                confirmados = confirmados.filter(j => j.id !== id);
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('pelada_confirmados', JSON.stringify(confirmados));
                }
                carregarListaConfirmados();
            };

            window.adicionarJogadoresSimulados = function() {
                const listaExemplo = [
                    { id: '1', nome: 'Beto', posicao: 'Atacante', aptidao: 'Técnico', idade: 32, peso: 78, categoria: 'Novo' },
                    { id: '2', nome: 'Tico Goleiro', posicao: 'Goleiro', aptidao: 'Ágil', idade: 27, peso: 80, categoria: 'Novo' },
                    { id: '3', nome: 'Marcão Goleiro', posicao: 'Goleiro', aptidao: 'Força', idade: 42, peso: 88, categoria: 'Veterano' },
                    { id: '4', nome: 'Seu Zé', posicao: 'Zagueiro', aptidao: 'Resistente', idade: 46, peso: 84, categoria: 'Veterano' },
                    { id: '5', nome: 'Lucas', posicao: 'Zagueiro', aptidao: 'Veloz', idade: 22, peso: 70, categoria: 'Novo' },
                    { id: '6', nome: 'Paulinho', posicao: 'Meia', aptidao: 'Técnico', idade: 39, peso: 76, categoria: 'Veterano' },
                    { id: '7', nome: 'Gabriel', posicao: 'Meia', aptidao: 'Ágil', idade: 24, peso: 68, categoria: 'Novo' },
                    { id: '8', nome: 'Ronaldo', posicao: 'Atacante', aptidao: 'Força', idade: 40, peso: 89, categoria: 'Veterano' },
                    { id: '9', nome: 'Felipe', posicao: 'Meia', aptidao: 'Veloz', idade: 21, peso: 65, categoria: 'Novo' },
                    { id: '10', nome: 'Danilo', posicao: 'Zagueiro', aptidao: 'Resistente', idade: 30, peso: 75, categoria: 'Novo' }
                ];

                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('pelada_confirmados', JSON.stringify(listaExemplo));
                }
                carregarListaConfirmados();
            };
        }

        // ===============================================
        // 4. O ALGORITMO: MESCLAR E EQUILIBRAR OS TIMES
        // ===============================================
        if (btnGerarTimes) {
            btnGerarTimes.addEventListener('click', () => {
                const confirmados = (typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem('pelada_confirmados'))) || [];

                if (confirmados.length < 4) {
                    alert('É necessário ter pelo menos 4 jogadores confirmados para montar os times!');
                    return;
                }

                // Calcula quantidade de times (base: 5 jogadores por time)
                const totalTimes = Math.max(2, Math.round(confirmados.length / 5));
                const times = Array.from({ length: totalTimes }, () => []);

                // 1º Passo: Isola e distribui Goleiros igualmente
                const goleiros = confirmados.filter(j => j.posicao === 'Goleiro');
                const jogadoresDeLinha = confirmados.filter(j => j.posicao !== 'Goleiro');

                goleiros.forEach((gol, i) => {
                    times[i % totalTimes].push(gol);
                });

                // 2º Passo: Aplica a regra de ouro da Idade (Separação sem deixar desequilíbrio)
                jogadoresDeLinha.sort((a, b) => b.idade - a.idade);

                // 3º Passo: Distribuição em zigue-zague
                let timeIndex = 0;
                let direcao = 1;

                jogadoresDeLinha.forEach(jogador => {
                    times[timeIndex].push(jogador);

                    timeIndex += direcao;
                    if (timeIndex >= totalTimes) {
                        timeIndex = totalTimes - 1;
                        direcao = -1;
                    } else if (timeIndex < 0) {
                        timeIndex = 0;
                        direcao = 1;
                    }
                });

                // 4º Passo: Renderiza os times na tela
                const nomesLetras = ['A', 'B', 'C', 'D', 'E'];
                let htmlResultado = '';
                textoParaWhatsapp = `⚽ *PELADA TOP - ESCALAÇÃO DOS TIMES* ⚽\n📍 Local: ${peladaConfig.local}\n\n`;

                times.forEach((time, index) => {
                    const letra = nomesLetras[index] || (index + 1);
                    const mediaIdade = Math.round(time.reduce((acc, j) => acc + j.idade, 0) / (time.length || 1));

                    htmlResultado += `
                        <div class="time-box">
                            <div class="time-titulo">
                                <span>TIME ${letra} (${time.length} jogadores)</span>
                                <span style="font-size: 12px; color: var(--cinza-texto);">Média Idade: ${mediaIdade} anos</span>
                            </div>
                            <ul class="time-jogadores-lista">
                                ${time.map(j => `<li><strong>${j.nome}</strong> (${j.posicao} • ${j.idade}a • ${j.aptidao})</li>`).join('')}
                            </ul>
                        </div>
                    `;

                    textoParaWhatsapp += `*TIME ${letra}* (Média: ${mediaIdade} anos):\n`;
                    time.forEach(j => {
                        textoParaWhatsapp += `• ${j.nome} (${j.posicao} - ${j.idade}a)\n`;
                    });
                    textoParaWhatsapp += '\n';
                });

                if (containerTimes) containerTimes.innerHTML = htmlResultado;
                if (secaoTimesResultado) {
                    secaoTimesResultado.style.display = 'block';
                    secaoTimesResultado.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }

        // Copiar para WhatsApp
        if (btnCopiarZap) {
            btnCopiarZap.addEventListener('click', () => {
                if (!textoParaWhatsapp) return;
                navigator.clipboard.writeText(textoParaWhatsapp).then(() => {
                    alert('Times copiados com sucesso! É só colar no grupo do WhatsApp! 📲⚽');
                });
            });
        }

        // Inicialização
        atualizarBotaoTrava();
        carregarListaConfirmados();
    });
}

// Fallback CommonJS caso Node.js execute este arquivo no backend
if (typeof module !== 'undefined' && module.exports) {
    module.exports = function handler(req, res) {
        if (res && typeof res.status === 'function') {
            return res.status(200).json({ status: 'ok', message: 'Pelada Top Admin Script' });
        }
    };
}