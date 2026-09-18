// ===============================================
// PELADA TOP - LÓGICA DO APP DO JOGADOR COM FOTO
// ===============================================

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
let perfilJogador = JSON.parse(localStorage.getItem('pelada_jogador_perfil')) || null;
let fotoBase64Temporaria = '';

// ===============================================
// 1. CARREGAR FOTO DA GALERIA (+)
// ===============================================
// Ao clicar no círculo, abre a galeria de fotos
avatarClickArea.addEventListener('click', () => {
    fotoInput.click();
});

// Quando o usuário seleciona uma imagem
fotoInput.addEventListener('change', (e) => {
    const arquivo = e.target.files[0];
    if (arquivo) {
        // Lê a imagem e converte para texto base64 para salvar no celular
        const leitor = new FileReader();
        leitor.onload = function(evento) {
            fotoBase64Temporaria = evento.target.result;
            exibirFotoPreview(fotoBase64Temporaria);
        };
        leitor.readAsDataURL(arquivo);
    }
});

function exibirFotoPreview(urlFoto) {
    if (urlFoto) {
        avatarPreviewImg.src = urlFoto;
        avatarPreviewImg.style.display = 'block';
        avatarIconePadrao.style.display = 'none';
    } else {
        avatarPreviewImg.style.display = 'none';
        avatarIconePadrao.style.display = 'block';
    }
}

// ===============================================
// 2. INICIALIZAÇÃO E CONTROLE DE TELAS
// ===============================================
function iniciarApp() {
    if (perfilJogador) {
        mostrarTelaCheckin();
    } else {
        secaoCadastro.style.display = 'block';
        secaoCheckin.style.display = 'none';
        btnTrocarPerfil.style.display = 'none';
    }
}

// Salvar Cadastro
formCadastro.addEventListener('submit', (e) => {
    e.preventDefault();

    perfilJogador = {
        id: perfilJogador ? perfilJogador.id : 'jog_' + Date.now(),
        foto: fotoBase64Temporaria || (perfilJogador ? perfilJogador.foto : ''),
        nome: document.getElementById('nome').value.trim(),
        whatsapp: document.getElementById('whatsapp').value.trim(),
        idade: parseInt(document.getElementById('idade').value),
        peso: parseFloat(document.getElementById('peso').value),
        posicao: document.getElementById('posicao').value,
        aptidao: document.getElementById('aptidao').value,
        categoria: parseInt(document.getElementById('idade').value) >= 38 ? 'Veterano' : 'Novo'
    };

    localStorage.setItem('pelada_jogador_perfil', JSON.stringify(perfilJogador));
    mostrarTelaCheckin();
});

// Botão para editar cadastro
btnTrocarPerfil.addEventListener('click', () => {
    secaoCadastro.style.display = 'block';
    secaoCheckin.style.display = 'none';
    btnTrocarPerfil.style.display = 'none';

    if (perfilJogador) {
        document.getElementById('nome').value = perfilJogador.nome;
        document.getElementById('whatsapp').value = perfilJogador.whatsapp;
        document.getElementById('idade').value = perfilJogador.idade;
        document.getElementById('peso').value = perfilJogador.peso;
        document.getElementById('posicao').value = perfilJogador.posicao;
        document.getElementById('aptidao').value = perfilJogador.aptidao;
        
        fotoBase64Temporaria = perfilJogador.foto || '';
        exibirFotoPreview(fotoBase64Temporaria);
    }
});

function mostrarTelaCheckin() {
    secaoCadastro.style.display = 'none';
    secaoCheckin.style.display = 'block';
    btnTrocarPerfil.style.display = 'inline-block';

    resumoNome.innerText = perfilJogador.nome;
    resumoDetalhes.innerText = `${perfilJogador.posicao} • ${perfilJogador.aptidao} • ${perfilJogador.idade} anos (${perfilJogador.categoria})`;

    // Exibe a foto do jogador no resumo do Check-in
    if (perfilJogador.foto) {
        resumoAvatarImg.src = perfilJogador.foto;
        resumoAvatarImg.style.display = 'block';
        resumoAvatarIcone.style.display = 'none';
    } else {
        resumoAvatarImg.style.display = 'none';
        resumoAvatarIcone.style.display = 'block';
    }

    verificarStatusCheckin();
    gerenciarTravaDeTempo();
}

// ===============================================
// 3. A REGRA DA TRAVA DE TEMPO
// ===============================================
function gerenciarTravaDeTempo() {
    const peladaConfig = JSON.parse(localStorage.getItem('pelada_config')) || {
        liberada: true,
        dataHora: 'Quinta-feira às 20:00',
        local: 'Arena Gol de Placa - Rua do Campo, 100'
    };

    document.getElementById('info-dia-hora').innerText = `📅 ${peladaConfig.dataHora}`;
    document.getElementById('info-local').innerText = `📍 ${peladaConfig.local}`;

    if (peladaConfig.liberada) {
        boxTempo.className = 'tempo-box desbloqueado';
        boxTempo.querySelector('.tempo-icone').innerText = '🔓';
        tituloTempo.innerText = 'Check-in Liberado!';
        contadorTempo.innerText = 'A lista está aberta. Garanta sua vaga!';

        const listaCheckIn = JSON.parse(localStorage.getItem('pelada_confirmados')) || [];
        const jaConfirmado = listaCheckIn.some(j => j.id === perfilJogador.id);

        if (!jaConfirmado) {
            btnCheckin.disabled = false;
            btnCheckin.className = 'btn-acao liberado';
            btnCheckin.innerText = '⚽ QUERO JOGAR (CHECK-IN)';
        }
    } else {
        boxTempo.className = 'tempo-box bloqueado';
        boxTempo.querySelector('.tempo-icone').innerText = '🔒';
        tituloTempo.innerText = 'Check-in Bloqueado';
        contadorTempo.innerText = 'Liberando próximo ao dia da partida...';

        btnCheckin.disabled = true;
        btnCheckin.className = 'btn-acao desabilitado';
        btnCheckin.innerText = 'AGUARDE A LIBERAÇÃO...';
    }
}

// ===============================================
// 4. AÇÃO DO BOTÃO DE CHECK-IN
// ===============================================
btnCheckin.addEventListener('click', () => {
    if (!perfilJogador) return;

    let confirmados = JSON.parse(localStorage.getItem('pelada_confirmados')) || [];

    if (!confirmados.some(j => j.id === perfilJogador.id)) {
        const checkinData = {
            ...perfilJogador,
            horaCheckin: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };

        confirmados.push(checkinData);
        localStorage.setItem('pelada_confirmados', JSON.stringify(confirmados));
    }

    verificarStatusCheckin();
});

function verificarStatusCheckin() {
    const confirmados = JSON.parse(localStorage.getItem('pelada_confirmados')) || [];
    const jaConfirmado = confirmados.some(j => j.id === perfilJogador.id);

    if (jaConfirmado) {
        btnCheckin.disabled = true;
        btnCheckin.className = 'btn-acao confirmado';
        btnCheckin.innerText = 'VOCÊ ESTÁ ESCALADO! ✅';

        statusMensagem.style.display = 'block';
        statusMensagem.innerText = 'Sua presença foi confirmada e enviada para o Administrador!';
    }
}

// Inicia o app
iniciarApp();