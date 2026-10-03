# 📖 PeladaTop — Arquitetura Completa e Código Comentado para Edições Futuras

Este documento serve como mapa de desenvolvimento e guia de edição para o projeto **PeladaTop**. Ele detalha onde cada recurso se encontra, como a lógica funciona e como fazer manutenções futuras sem quebrar a aplicação.

---

## 🗂️ 1. Estrutura Geral dos Arquivos

```text
PeladaTop/
│
├── index.html               # Frontend completo (HTML5, Tailwind CSS, JavaScript Vanilla, Modais, PWA)
├── server.js                # Backend Node.js nativo (Servidor HTTP, SSE em tempo real, APIs REST, Banco JSON)
├── database.json            # Banco de dados persistente (23 atletas, usuários, lista ativa, configs)
├── pelada-dados.json        # Arquivo de dados espelho / backup sincronizado
├── manifest.json            # Configuração do PWA (ícones, nome, cores do tema)
├── sw.js                    # Service Worker (cache offline e ciclo PWA)
└── README.md                # Apresentação do projeto e comandos de inicialização
```

---

## 💻 2. Código Comentado do Frontend (`index.html`)

O `index.html` concentra todo o cliente. Abaixo estão os blocos essenciais comentados para facilitar qualquer alteração futura.

### 2.1. Estado Global e Inicialização
```javascript
// ==============================================================
// 1. ESTADO GLOBAL DO CLIENTE
// ==============================================================

// Configurações do jogo carregadas do servidor ou padrão local
let peladaConfig = {
    nome: "Pelada Top",
    local: "Arena Principal",
    latitude: -5.79448,     // Latitude do local do jogo
    longitude: -35.211,     // Longitude do local do jogo
    raioMaximoMetros: 500,  // Raio máximo (em metros) para validação de check-in
    listaAberta: true,      // Se a lista de confirmação está aberta para novos atletas
    tempoPartidaSegundos: 600 // Tempo regulamentar do jogo (10 minutos)
};

// Usuário atualmente autenticado no navegador
let usuarioAtual = {
    id: "usr_123",
    nome: "Nome do Atleta",
    posicao: "Meio-Campo",
    role: "jogador",        // 'jogador' (atleta comum) ou 'admin' (organizador)
    overall: 85,
    foto: ""
};

// Lista dos atletas que confirmaram presença ou chegaram ao campo
let listaConfirmados = [];

// Base geral de atletas cadastrados (23 atletas padrão)
let cadastroGeralAtletas = [];

// Estado da partida em andamento (cronômetro, placar)
let partidaEstado = {
    emAndamento: false,
    finalizada: false,
    tempoRestante: 600
};
```

---

### 2.2. Cálculo de GPS e Geofencing (Haversine)
```javascript
// ==============================================================
// 2. GEOFENCING E CÁLCULO DE DISTÂNCIA POR GPS
// ==============================================================

// Calcula a distância exata em linha reta entre duas coordenadas (em metros)
function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371e3; // Raio da Terra em metros
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c); // Retorna distância arredondada em metros
}

// Atualiza a posição do usuário utilizando a API de Geolocalização do navegador
function atualizarLocalizacaoGps(mostrarAlerta = false) {
    if (!navigator.geolocation) {
        if (mostrarAlerta) alert("Geolocalização não é suportada pelo seu navegador.");
        return;
    }
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            // Compara com o local configurado na pelada
            const dist = calcularDistanciaMetros(lat, lon, peladaConfig.latitude, peladaConfig.longitude);
            // Salva e atualiza os badges na interface
            if (usuarioAtual) {
                usuarioAtual.latitude = lat;
                usuarioAtual.longitude = lon;
                usuarioAtual.distanciaMetros = dist;
            }
            renderizarStatusCheckin();
            renderizarListaJogadores();
        },
        (err) => {
            console.warn("Aviso ao obter GPS:", err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
}
```

---

### 2.3. Filtro e Renderização da Lista de Confirmados
```javascript
// ==============================================================
// 3. RENDERIZAÇÃO DA LISTA DE JOGADORES (APENAS CONFIRMADOS)
// ==============================================================
function renderizarListaJogadores() {
    const container = document.getElementById('lista-jogadores-chegada');
    const badge = document.getElementById('badge-total-confirmados');

    // 1. Pega a base de atletas cadastrados/confirmados
    let baseAtletas = (Array.isArray(listaConfirmados) && listaConfirmados.length > 0)
        ? listaConfirmados
        : (Array.isArray(cadastroGeralAtletas) ? cadastroGeralAtletas : [...ATLETAS_INICIAIS_PADRAO]);

    // 2. FILTRA RIGOROSAMENTE APENAS QUEM CONFIRMOU PRESENÇA OU CHEGOU
    let atletasCompletos = baseAtletas.filter(atleta => {
        // Chegada física confirmada no campo (<=500m ou manual)
        const isChegou = atleta.chegadaConfirmada === true || 
                         atleta.statusPresenca === 'chegou' || 
                         atleta.statusAproximacao === 'chegou' || 
                         atleta.status === 'campo';

        // Presença confirmada na lista da pelada
        const isConfirmado = atleta.statusPresenca === 'confirmado' || 
                             (atleta.hora && atleta.statusPresenca !== 'pendente' && atleta.statusPresenca !== 'ausente');

        return isChegou || isConfirmado;
    });

    const totalConfirmados = atletasCompletos.length;
    if (badge) badge.innerText = `${totalConfirmados} Confirmados`;

    // Atualiza o prompt no banner superior para o jogador fazer seu check-in
    if (typeof atualizarBannerJogadoresCheckinPrompt === 'function') {
        atualizarBannerJogadoresCheckinPrompt(baseAtletas, atletasCompletos);
    }

    if (!container) return;

    // Se nenhum jogador confirmou ainda, exibe o aviso amigável
    if (atletasCompletos.length === 0) {
        container.innerHTML = '<p class="text-center text-xs text-on-surface-variant py-6">Nenhum jogador confirmado no momento.</p>';
        return;
    }

    let html = '';
    const raioMaximoCampo = peladaConfig.raioMaximoMetros || 500;

    // Renderiza cada card de jogador confirmado
    atletasCompletos.forEach((j, idx) => {
        const ehUsuarioLogado = (j.nome || '').trim().toLowerCase() === (usuarioAtual.nome || '').trim().toLowerCase();
        const distMetros = (j.distanciaMetros !== undefined && j.distanciaMetros !== null) ? Number(j.distanciaMetros) : null;
        const isReset = j.statusAproximacao === 'reset' || j.status === 'reset';

        // Regra de validação de chegada no campo:
        const chegou = !isReset && (
            j.chegadaConfirmada === true || 
            j.statusPresenca === 'chegou' || 
            j.statusAproximacao === 'chegou' || 
            j.statusAproximacao === 'campo' || 
            j.status === 'campo' || 
            (distMetros !== null && distMetros <= raioMaximoCampo)
        );

        let corBadge, borderLeft, labelStatus, iconeStatus, distTexto;

        // Classificação visual de distância e presença:
        if (chegou) {
            corBadge = 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
            borderLeft = 'border-l-4 border-l-emerald-500';
            labelStatus = '🟢 No Campo';
            iconeStatus = 'sports_soccer';
            distTexto = `<span class="text-emerald-600 font-bold">No Campo (${j.horaChegada || j.hora || '19:00'})</span>`;
        } else if (distMetros !== null && distMetros <= raioMaximoCampo) {
            corBadge = 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30';
            borderLeft = 'border-l-4 border-l-emerald-500';
            labelStatus = '🟢 No Campo';
            iconeStatus = 'sports_soccer';
            distTexto = `<span class="text-emerald-600 font-bold">${distMetros}m do campo</span>`;
        } else if (distMetros !== null && distMetros <= 1500) {
            corBadge = 'bg-amber-500/15 text-amber-700 border-amber-500/30';
            borderLeft = 'border-l-4 border-l-amber-500';
            labelStatus = '🟡 Próximo';
            iconeStatus = 'near_me';
            distTexto = `<span class="text-amber-600 font-bold">${distMetros}m do campo</span>`;
        } else if (distMetros !== null && distMetros > 1500) {
            corBadge = 'bg-red-500/15 text-red-700 border-red-500/30';
            borderLeft = 'border-l-4 border-l-red-500';
            labelStatus = '🔴 Longe';
            iconeStatus = 'navigation';
            const km = distMetros >= 1000 ? `${(distMetros/1000).toFixed(1)} km` : `${distMetros}m`;
            distTexto = `<span class="text-red-500 font-bold">${km} do campo</span>`;
        } else {
            corBadge = 'bg-gray-500/15 text-gray-600 border-gray-400/30';
            borderLeft = 'border-l-4 border-l-gray-300';
            labelStatus = '⚪ Aguardando';
            iconeStatus = 'schedule';
            distTexto = `<span class="text-on-surface-variant font-medium">Aguardando GPS</span>`;
        }

        // Construção do HTML do card...
        // ...
    });

    container.innerHTML = html;
}
```

---

### 2.4. Sorteio Balanceado de Equipes
```javascript
// ==============================================================
// 4. SORTEIO INTELIGENTE DE TIMES
// ==============================================================
function realizarSorteioStitch(silencioso = false) {
    // 1. Considera apenas atletas que já confirmaram presença física
    const atletasElegiveis = (listaConfirmados || []).filter(atletaConfirmouChegada);

    if (atletasElegiveis.length < 4) {
        // Exibe aviso solicitando pelo menos 4 atletas no campo
        return;
    }

    // 2. Separa goleiros dos jogadores de linha
    const goleiros = atletasElegiveis.filter(a => a.posicao === 'Goleiro');
    const linha = atletasElegiveis.filter(a => a.posicao !== 'Goleiro');

    // 3. Ordena jogadores de linha por Overall (de forma decrescente)
    linha.sort((a, b) => (b.overall || 75) - (a.overall || 75));

    // 4. Inicializa os times
    const times = Array.from({ length: qtdTimesSorteio }, (_, i) => ({
        id: i + 1,
        nome: `Time ${i + 1}`,
        jogadores: []
    }));

    // 5. Distribui goleiros (1 por time)
    goleiros.forEach((g, i) => {
        times[i % qtdTimesSorteio].jogadores.push(g);
    });

    // 6. Distribui jogadores de linha em formato serpente para equilibrar as forças
    let direcao = 1;
    let timeIndex = 0;
    linha.forEach(jogador => {
        times[timeIndex].jogadores.push(jogador);
        timeIndex += direcao;
        if (timeIndex >= qtdTimesSorteio) {
            timeIndex = qtdTimesSorteio - 1;
            direcao = -1;
        } else if (timeIndex < 0) {
            timeIndex = 0;
            direcao = 1;
        }
    });

    // 7. Salva a escalação ativa e transmite para todos os celulares
    salvarEscalacaoNoServidor(times);
}
```

---

## ⚙️ 3. Código Comentado do Servidor (`server.js`)

O `server.js` gerencia o backend sem frameworks externos pesados:

### 3.1. Persistência Segura (Merge Atômico)
```javascript
// ==============================================================
// 1. SALVAR DADOS COM TRAVA DE SEGURANÇA
// ==============================================================
function salvarDados(dados) {
  try {
    if (!dados || typeof dados !== 'object') return false;

    let existing = null;
    try {
      if (fs.existsSync(DATABASE_FILE)) {
        existing = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
      }
    } catch (e) {}

    // Preserva todos os 23 atletas originais via Map para evitar perda acidental
    const existingAtletas = (existing && Array.isArray(existing.atletas)) ? existing.atletas : [];
    let incomingAtletas = Array.isArray(dados.atletas) ? dados.atletas : [];

    const atletasMap = new Map();
    existingAtletas.forEach(a => { if (a && a.id) atletasMap.set(String(a.id), { ...a }); });
    incomingAtletas.forEach(a => {
      if (a && a.id) {
        const prev = atletasMap.get(String(a.id)) || {};
        atletasMap.set(String(a.id), { ...prev, ...a });
      }
    });

    dados.atletas = Array.from(atletasMap.values());

    // Grava de forma síncrona em ambos os arquivos
    const jsonStr = JSON.stringify(dados, null, 2);
    fs.writeFileSync(DATABASE_FILE, jsonStr, 'utf8');
    fs.writeFileSync(DATA_FILE, jsonStr, 'utf8');
    return true;
  } catch (err) {
    console.error("Erro ao salvar dados no disco:", err);
    return false;
  }
}
```

---

### 3.2. Hub de Tempo Real (Server-Sent Events)
```javascript
// ==============================================================
// 2. DISPARO DE EVENTOS SSE PARA TODOS OS DISPOSITIVOS CONECTADOS
// ==============================================================
const sseClients = new Set();

function broadcastSse(evento, dados) {
  const payload = `event: ${evento}\ndata: ${JSON.stringify(dados)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (err) {
      // Se a conexão foi fechada pelo cliente, remove do conjunto
      sseClients.delete(client);
    }
  }
}
```

---

## 🔧 4. Dicas Rápidas para Edições Futuras

1. **Alterar as Coordenadas do Campo Oficial:**
   - Acesse a aba **Admin** no app e clique em "Salvar Local com GPS", ou edite diretamente no [`database.json`](file:///E:/PeladaTop/database.json) os campos `"latitude"` e `"longitude"` dentro de `"peladaConfig"`.

2. **Alterar o Tempo da Partida (ex: de 10 min para 15 min):**
   - No [`server.js`](file:///E:/PeladaTop/server.js), procure por `tempoRestante: 600` e altere para `900` (15 * 60).
   - No [`index.html`](file:///E:/PeladaTop/index.html), altere `tempoPartidaSegundos: 600` para `900`.

3. **Subir Novas Alterações para o Ar (Render):**
   ```bash
   git add .
   git commit -m "feat: minha nova alteracao"
   git push origin main
   ```
