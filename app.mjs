// ===============================================
// PELADA TOP - LÓGICA DO APP DO JOGADOR COM FOTO
// ===============================================

// Proteção para execução em ambiente de navegador (DOM)
if (typeof document !== 'undefined') {
    document.addEventListener("DOMContentLoaded", () => {
        // Elementos da Tela
        const secaoCadastro = document.getElementById('secao-cadastro');
        const secaoCheckin = document.getElementById('secao-checkin');
        const formCadastro = document.getElementById('form-cadastro');
        const btnTrocarPerfil = document.getElementById('btn-trocar-perfil');

        // Elementos da Foto (+)
        const avatarClickArea = document.getElementById('avatar-click-area');
        const fotoInput = document.getElementById('foto-input');
        const avatarIconePadrao = document.getElementById('avatar-icone-padrao');
        const avatarPreviewImg = document.getElementById('avatar-preview-img');

        // Elementos do Resumo / Check-in
        const resumoNome = document.getElementById('resumo-nome');
        const resumoDetalhes = document.getElementById('resumo-detalhes');
        const resumoAvatarIcone = document.getElementById('resumo-avatar-icone');
        const resumoAvatarImg = document.getElementById('resumo-avatar-img');

        const boxTempo = document.getElementById('box-tempo');
        const tituloTempo = document.getElementById('titulo-tempo');
        const contadorTempo = document.getElementById('contador-tempo');
        const btnCheckin = document.getElementById('btn-checkin');
        const statusMensagem = document.getElementById('status-mensagem');

        // Estado do Jogador
        let perfilJogador = (typeof localStorage !== 'undefined' && localStorage.getItem('pelada_jogador_perfil'))
            ? JSON.parse(localStorage.getItem('pelada_jogador_perfil'))
            : null;
        let fotoBase64Temporaria = '';

        // ===============================================
        // 1. CARREGAR FOTO DA GALERIA (+)
        // ===============================================
        // Ao clicar no círculo, abre a galeria de fotos
        if (avatarClickArea && fotoInput) {
            avatarClickArea.addEventListener('click', () => {
                fotoInput.click();
            });

            // Quando o usuário seleciona uma imagem
            fotoInput.addEventListener('change', (e) => {
                const arquivo = e.target.files && e.target.files[0];
                if (arquivo && typeof FileReader !== 'undefined') {
                    // Lê a imagem e converte para texto base64 para salvar no celular
                    const leitor = new FileReader();
                    leitor.onload = function(evento) {
                        fotoBase64Temporaria = evento.target.result;
                        exibirFotoPreview(fotoBase64Temporaria);
                    };
                    leitor.readAsDataURL(arquivo);
                }
            });
        }

        function exibirFotoPreview(urlFoto) {
            if (avatarPreviewImg && avatarIconePadrao) {
                if (urlFoto) {
                    avatarPreviewImg.src = urlFoto;
                    avatarPreviewImg.style.display = 'block';
                    avatarIconePadrao.style.display = 'none';
                } else {
                    avatarPreviewImg.style.display = 'none';
                    avatarIconePadrao.style.display = 'block';
                }
            }
        }

        // ===============================================
        // 2. INICIALIZAÇÃO E CONTROLE DE TELAS
        // ===============================================
        function iniciarApp() {
            if (perfilJogador) {
                mostrarTelaCheckin();
            } else {
                if (secaoCadastro) secaoCadastro.style.display = 'block';
                if (secaoCheckin) secaoCheckin.style.display = 'none';
                if (btnTrocarPerfil) btnTrocarPerfil.style.display = 'none';
            }
        }

        // Salvar Cadastro
        if (formCadastro) {
            formCadastro.addEventListener('submit', (e) => {
                e.preventDefault();

                const campoNome = document.getElementById('nome');
                const campoWhatsapp = document.getElementById('whatsapp');
                const campoIdade = document.getElementById('idade');
                const campoPeso = document.getElementById('peso');
                const campoPosicao = document.getElementById('posicao');
                const campoAptidao = document.getElementById('aptidao');

                perfilJogador = {
                    id: perfilJogador ? perfilJogador.id : 'jog_' + Date.now(),
                    foto: fotoBase64Temporaria || (perfilJogador ? perfilJogador.foto : ''),
                    nome: campoNome ? campoNome.value.trim() : '',
                    whatsapp: campoWhatsapp ? campoWhatsapp.value.trim() : '',
                    idade: campoIdade ? parseInt(campoIdade.value) : 0,
                    peso: campoPeso ? parseFloat(campoPeso.value) : 0,
                    posicao: campoPosicao ? campoPosicao.value : '',
                    aptidao: campoAptidao ? campoAptidao.value : '',
                    categoria: (campoIdade && parseInt(campoIdade.value) >= 38) ? 'Veterano' : 'Novo'
                };

                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('pelada_jogador_perfil', JSON.stringify(perfilJogador));
                }
                mostrarTelaCheckin();
            });
        }

        // Botão para editar cadastro
        if (btnTrocarPerfil) {
            btnTrocarPerfil.addEventListener('click', () => {
                if (secaoCadastro) secaoCadastro.style.display = 'block';
                if (secaoCheckin) secaoCheckin.style.display = 'none';
                btnTrocarPerfil.style.display = 'none';

                if (perfilJogador) {
                    const campoNome = document.getElementById('nome');
                    const campoWhatsapp = document.getElementById('whatsapp');
                    const campoIdade = document.getElementById('idade');
                    const campoPeso = document.getElementById('peso');
                    const campoPosicao = document.getElementById('posicao');
                    const campoAptidao = document.getElementById('aptidao');

                    if (campoNome) campoNome.value = perfilJogador.nome || '';
                    if (campoWhatsapp) campoWhatsapp.value = perfilJogador.whatsapp || '';
                    if (campoIdade) campoIdade.value = perfilJogador.idade || '';
                    if (campoPeso) campoPeso.value = perfilJogador.peso || '';
                    if (campoPosicao) campoPosicao.value = perfilJogador.posicao || '';
                    if (campoAptidao) campoAptidao.value = perfilJogador.aptidao || '';
                    
                    fotoBase64Temporaria = perfilJogador.foto || '';
                    exibirFotoPreview(fotoBase64Temporaria);
                }
            });
        }

        function mostrarTelaCheckin() {
            if (secaoCadastro) secaoCadastro.style.display = 'none';
            if (secaoCheckin) secaoCheckin.style.display = 'block';
            if (btnTrocarPerfil) btnTrocarPerfil.style.display = 'inline-block';

            if (resumoNome) resumoNome.innerText = perfilJogador.nome;
            if (resumoDetalhes) resumoDetalhes.innerText = `${perfilJogador.posicao} • ${perfilJogador.aptidao} • ${perfilJogador.idade} anos (${perfilJogador.categoria})`;

            // Exibe a foto do jogador no resumo do Check-in
            if (perfilJogador.foto) {
                if (resumoAvatarImg) {
                    resumoAvatarImg.src = perfilJogador.foto;
                    resumoAvatarImg.style.display = 'block';
                }
                if (resumoAvatarIcone) resumoAvatarIcone.style.display = 'none';
            } else {
                if (resumoAvatarImg) resumoAvatarImg.style.display = 'none';
                if (resumoAvatarIcone) resumoAvatarIcone.style.display = 'block';
            }

            verificarStatusCheckin();
            gerenciarTravaDeTempo();
        }

        // ===============================================
        // 3. A REGRA DA TRAVA DE TEMPO
        // ===============================================
        function gerenciarTravaDeTempo() {
            const peladaConfig = (typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem('pelada_config'))) || {
                liberada: true,
                dataHora: 'Quinta-feira às 20:00',
                local: 'Arena Gol de Placa - Rua do Campo, 100'
            };

            const infoDiaHora = document.getElementById('info-dia-hora');
            const infoLocal = document.getElementById('info-local');
            if (infoDiaHora) infoDiaHora.innerText = `📅 ${peladaConfig.dataHora}`;
            if (infoLocal) infoLocal.innerText = `📍 ${peladaConfig.local}`;

            if (boxTempo) {
                if (peladaConfig.liberada) {
                    boxTempo.className = 'tempo-box desbloqueado';
                    const tempoIcone = boxTempo.querySelector('.tempo-icone');
                    if (tempoIcone) tempoIcone.innerText = '🔓';
                    if (tituloTempo) tituloTempo.innerText = 'Check-in Liberado!';
                    if (contadorTempo) contadorTempo.innerText = 'A lista está aberta. Garanta sua vaga!';

                    const listaCheckIn = (typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem('pelada_confirmados'))) || [];
                    const jaConfirmado = perfilJogador && listaCheckIn.some(j => j.id === perfilJogador.id);

                    if (!jaConfirmado && btnCheckin) {
                        btnCheckin.disabled = false;
                        btnCheckin.className = 'btn-acao liberado';
                        btnCheckin.innerText = '⚽ QUERO JOGAR (CHECK-IN)';
                    }
                } else {
                    boxTempo.className = 'tempo-box bloqueado';
                    const tempoIcone = boxTempo.querySelector('.tempo-icone');
                    if (tempoIcone) tempoIcone.innerText = '🔒';
                    if (tituloTempo) tituloTempo.innerText = 'Check-in Bloqueado';
                    if (contadorTempo) contadorTempo.innerText = 'Liberando próximo ao dia da partida...';

                    if (btnCheckin) {
                        btnCheckin.disabled = true;
                        btnCheckin.className = 'btn-acao desabilitado';
                        btnCheckin.innerText = 'AGUARDE A LIBERAÇÃO...';
                    }
                }
            }
        }

        // ===============================================
        // 4. AÇÃO DO BOTÃO DE CHECK-IN
        // ===============================================
        if (btnCheckin) {
            btnCheckin.addEventListener('click', () => {
                if (!perfilJogador) return;

                let confirmados = (typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem('pelada_confirmados'))) || [];

                if (!confirmados.some(j => j.id === perfilJogador.id)) {
                    const checkinData = {
                        ...perfilJogador,
                        horaCheckin: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    };

                    confirmados.push(checkinData);
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('pelada_confirmados', JSON.stringify(confirmados));
                    }
                }

                verificarStatusCheckin();
            });
        }

        function verificarStatusCheckin() {
            const confirmados = (typeof localStorage !== 'undefined' && JSON.parse(localStorage.getItem('pelada_confirmados'))) || [];
            const jaConfirmado = perfilJogador && confirmados.some(j => j.id === perfilJogador.id);

            if (jaConfirmado && btnCheckin) {
                btnCheckin.disabled = true;
                btnCheckin.className = 'btn-acao confirmado';
                btnCheckin.innerText = 'VOCÊ ESTÁ ESCALADO! ✅';

                if (statusMensagem) {
                    statusMensagem.style.display = 'block';
                    statusMensagem.innerText = 'Sua presença foi confirmada e enviada para o Administrador!';
                }
            }
        }

        // Inicia o app
        iniciarApp();
    });
}

// Export padrão caso Vercel ou Node.js execute este módulo no backend
export default function handler(req, res) {
    if (res && typeof res.status === 'function') {
        return res.status(200).json({ status: 'ok', message: 'Pelada Top PWA Client Script' });
    }
}
