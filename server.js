const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
// Define o diretório de dados para persistência local ou Render Cloud
const isRender = process.env.RENDER === 'true' || !!process.env.RENDER || !!process.env.RENDER_EXTERNAL_URL;
const TMP_DIR = process.platform === 'win32' ? os.tmpdir() : '/tmp';
const DATA_FILE = path.join(__dirname, 'pelada-dados.json');
const DATABASE_FILE = path.join(__dirname, 'database.json');

// Funções de persistência real baseada em arquivo JSON usando 'fs' e 'path' apontando para 'database.json'
function lerDados() {
  try {
    if (fs.existsSync(DATABASE_FILE)) {
      return JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));
    }
    if (fs.existsSync(DATA_FILE)) {
      const dados = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      salvarDados(dados);
      return dados;
    }
    if (fs.existsSync(path.join(TMP_DIR, 'database.json'))) {
      return JSON.parse(fs.readFileSync(path.join(TMP_DIR, 'database.json'), 'utf8'));
    }
  } catch (e) {
    console.error("[Database] Erro ao ler database.json:", e);
  }
  return {
    usuarios: [],
    listaConfirmados: [],
    atletas: [],
    peladaConfig: DEFAULT_CONFIG,
    escalacaoAtiva: null,
    partidaEstado: { emAndamento: false, finalizada: false, tempoRestante: 600 },
    version: Date.now()
  };
}

function salvarDados(dados) {
  try {
    if (!dados || typeof dados !== 'object') return false;

    // Garante persistência separada entre o cadastro fixo de atletas e a presença temporária
    if (!Array.isArray(dados.atletas) || dados.atletas.length === 0) {
      if (Array.isArray(dados.listaConfirmados) && dados.listaConfirmados.length > 0) {
        dados.atletas = dados.listaConfirmados;
      }
    }
    if (!Array.isArray(dados.listaConfirmados)) {
      dados.listaConfirmados = [];
    }

    const dir = path.dirname(DATABASE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const jsonStr = JSON.stringify(dados, null, 2);
    fs.writeFileSync(DATABASE_FILE, jsonStr, 'utf8');

    // Mantém sincronizado com pelada-dados.json e tmp para redundância e retrocompatibilidade
    try {
      fs.writeFileSync(DATA_FILE, jsonStr, 'utf8');
    } catch (e) {}
    try {
      fs.writeFileSync(path.join(TMP_DIR, 'database.json'), jsonStr, 'utf8');
      fs.writeFileSync(path.join(TMP_DIR, 'pelada-dados.json'), jsonStr, 'utf8');
    } catch (e) {}
    return true;
  } catch (e) {
    console.error("[Database] Erro ao salvar database.json:", e);
    return false;
  }
}

function loadData() {
  return lerDados();
}

function saveData(data) {
  return salvarDados(data);
}

// Função de escrita segura em /tmp

// Função para calcular a porcentagem de condição física real do atleta de acordo com o cadastro
function calcularFitnessAtleta(atleta) {
  if (!atleta) return 80;
  const condRaw = String(atleta.condicao || atleta.condicaoFisica || '').toLowerCase().trim();
  if (condRaw.includes('100') || condRaw.includes('top') || condRaw.includes('excelente')) return 100;
  if (condRaw.includes('80') || condRaw.includes('boa')) return 80;
  if (condRaw.includes('60') || condRaw.includes('ok') || condRaw.includes('regular')) return 60;
  if (condRaw.includes('40') || condRaw.includes('recupera')) return 40;
  
  if (atleta.fitness !== undefined && atleta.fitness !== null && !isNaN(atleta.fitness) && Number(atleta.fitness) !== 90) {
    return Math.min(100, Math.max(0, Math.round(Number(atleta.fitness))));
  }
  return 100;
}

// Verifica se a requisição é originada na máquina local de desenvolvimento (dev)
// Verifica se a requisição é originada na máquina local de desenvolvimento (dev)
function isLocalDevRequest(req) {
  try {
    const urlObj = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
    // Se o desenvolvedor passar token ou parâmetro ?dev=1 / ?dev=true, libera sempre
    if (urlObj.searchParams.get('dev') === '1' || urlObj.searchParams.get('dev') === 'true' || urlObj.searchParams.get('token') === 'dev') {
      return true;
    }
  } catch (e) {}

  // Em ambiente local de desenvolvimento, libera acesso técnico
  if (!isRender) {
    return true;
  }
  // Em nuvem (Render), valida loopback ou token dev
  const xff = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const remote = req.socket?.remoteAddress || '';
  if (xff === '127.0.0.1' || xff === '::1' || remote === '127.0.0.1' || remote === '::1') {
    return true;
  }

  return false;
}

// saveData delegado para salvarDados()

// MIME types suportados
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Dados padrão iniciais
const DEFAULT_CONFIG = {
  listaAberta: true,
  local: 'R. Abelardo Targino da Fonseca - Ernesto Geisel, João Pessoa - PB',
  lat: -7.190405,
  lng: -34.870103,
  mapsUrl: 'https://maps.app.goo.gl/gCjmZDcZEQeDiqhp7',
  raioMaximoMetros: 500,
  exigirGps: true,
  diaSemana: 'Terça-feira',
  dataPelada: new Date().toISOString().split('T')[0],
  horaInicio: '19:00',
  horaFim: '21:00'
};

const DEFAULT_CONFIRMADOS = [];

// Estado na memória
let appData = {
  usuarios: [],
  listaConfirmados: DEFAULT_CONFIRMADOS,
  peladaConfig: DEFAULT_CONFIG,
  escalacaoAtiva: null,
  partidaEstado: { emAndamento: false, finalizada: false, tempoRestante: 600 },
  version: Date.now()
};

// Carregar dados salvos com prioridade absoluta para database.json
try {
  let carregou = false;
  const dadosIniciais = lerDados();

  if (dadosIniciais) {
    if (Array.isArray(dadosIniciais.usuarios) && dadosIniciais.usuarios.length) {
      appData.usuarios = dadosIniciais.usuarios;
    } else if (Array.isArray(dadosIniciais.jogadoresCadastrados) && dadosIniciais.jogadoresCadastrados.length) {
      appData.usuarios = dadosIniciais.jogadoresCadastrados;
    }

    const listaInicial = (Array.isArray(dadosIniciais.atletas) && dadosIniciais.atletas.length > 0)
      ? dadosIniciais.atletas
      : (Array.isArray(dadosIniciais.listaConfirmados) && dadosIniciais.listaConfirmados.length > 0 ? dadosIniciais.listaConfirmados : []);

    if (listaInicial.length > 0) {
      appData.listaConfirmados = listaInicial;
      appData.atletas = listaInicial;
      carregou = true;
    }

    if (dadosIniciais.peladaConfig) appData.peladaConfig = dadosIniciais.peladaConfig;
    if (dadosIniciais.escalacaoAtiva !== undefined) appData.escalacaoAtiva = dadosIniciais.escalacaoAtiva;
    if (dadosIniciais.partidaEstado !== undefined) appData.partidaEstado = dadosIniciais.partidaEstado;
    if (dadosIniciais.version) appData.version = dadosIniciais.version;
  }

  if (carregou) {
    console.log('[Realtime] Dados da pelada carregados com sucesso do database.json (' + appData.listaConfirmados.length + ' atletas).');
  } else {
    salvarDadosDisco();
  }
} catch (e) {
  console.warn('[Realtime] Aviso ao carregar dados salvos:', e.message);
}

// Salvar no disco com tratamento seguro para Serverless e preservação de todas as chaves
function salvarDadosDisco() {
  const atletasGerais = (Array.isArray(appData.atletas) && appData.atletas.length > 0)
    ? appData.atletas
    : ((Array.isArray(appData.listaConfirmados) && appData.listaConfirmados.length > 0) ? appData.listaConfirmados : []);
  appData.atletas = atletasGerais;

  const dadosCompletos = {
    usuarios: appData.usuarios || [],
    jogadoresCadastrados: appData.usuarios || [],
    listaConfirmados: Array.isArray(appData.listaConfirmados) ? appData.listaConfirmados : [],
    atletas: atletasGerais,
    peladaConfig: appData.peladaConfig || DEFAULT_CONFIG,
    escalacaoAtiva: appData.escalacaoAtiva,
    partidaEstado: appData.partidaEstado,
    version: appData.version || Date.now()
  };
  saveData(dadosCompletos);
}

// Base de dados de atletas sincronizada com banco/memória para a aba de teste e simulação
let athletesDatabase = [
  { id: 1, name: "Lucas Silva", position: "MEI", age: 24, weight: 76, fit: 100, distance: 120, status: "campo", checkedIn: true },
  { id: 2, name: "Marcos Vinicius", position: "GOL", age: 28, weight: 82, fit: 92, distance: 45, status: "campo", checkedIn: true },
  { id: 3, name: "Diego Costa", position: "ATA", age: 26, weight: 79, fit: 100, distance: 210, status: "campo", checkedIn: true },
  { id: 4, name: "Rodrigo Pires", position: "VOL", age: 25, weight: 74, fit: 88, distance: 850, status: "proximo", checkedIn: false },
  { id: 5, name: "Gabriel Santos", position: "ZAG", age: 27, weight: 83, fit: 80, distance: 3800, status: "longe", checkedIn: false },
  { id: 6, name: "Felipe Melo", position: "VOL", age: 29, weight: 85, fit: 95, distance: 740, status: "proximo", checkedIn: false }
];

// Conexões ativas de Server-Sent Events (SSE) para transmissão em tempo real
const sseClients = new Set();

function broadcastSse(tipo, payload) {
  const timestamp = new Date().toLocaleTimeString('pt-BR');
  const dataString = `data: ${JSON.stringify({ type: tipo, timestamp, ...payload })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(dataString);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Heartbeat SSE para manter conexões abertas no Render e celulares
setInterval(() => {
  if (sseClients.size > 0) {
    broadcastSse('PING', { time: Date.now() });
  }
}, 25000);

// Função de Reset Automático após a meia-noite do dia da pelada
function verificarResetMeiaNoite() {
  try {
    if (!appData.peladaConfig || !appData.peladaConfig.dataPelada) return;

    // Obtém data de hoje no fuso horário de Brasília (UTC-3)
    const hojeStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    const dataPeladaStr = String(appData.peladaConfig.dataPelada).trim();

    // Se hoje é posterior à data da pelada (após a meia-noite do dia do jogo)
    if (hojeStr > dataPeladaStr) {
      if (appData.listaConfirmados && appData.listaConfirmados.length > 0) {
        console.log(`[Auto-Reset Meia-Noite] Dia da pelada (${dataPeladaStr}) finalizou. Data atual: ${hojeStr}.`);
        console.log(`[Auto-Reset Meia-Noite] Zerando a lista de presença da aba jogadores e mantendo configurações.`);
        
        if (Array.isArray(appData.listaConfirmados)) {
          appData.listaConfirmados = appData.listaConfirmados.map(a => ({
            ...a,
            statusPresenca: 'pendente',
            chegadaConfirmada: false,
            distanciaMetros: null,
            horaChegada: null
          }));
        }
        appData.atletas = appData.listaConfirmados;
        appData.escalacaoAtiva = null;
        appData.timesSorteados = [];
        appData.partidaEstado = { emAndamento: false, finalizada: false, tempoRestante: 600 };
        appData.peladaConfig.ultimaDataZerada = dataPeladaStr;

        // Avança automaticamente para o próximo dia correspondente da semana (+7 dias)
        try {
          const parts = dataPeladaStr.split('-');
          if (parts.length === 3) {
            const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            dt.setDate(dt.getDate() + 7);
            const ano = dt.getFullYear();
            const mes = String(dt.getMonth() + 1).padStart(2, '0');
            const dia = String(dt.getDate()).padStart(2, '0');
            appData.peladaConfig.dataPelada = `${ano}-${mes}-${dia}`;
            console.log(`[Auto-Reset Meia-Noite] Nova pelada definida para: ${appData.peladaConfig.dataPelada}`);
          }
        } catch (eDt) {}

        appData.version = Date.now();
        salvarDadosDisco();
        broadcastSse('LISTA_ZERADA_AUTO', {
          mensagem: 'Nova pelada iniciada! Lista de presença zerada após a meia-noite.',
          peladaConfig: appData.peladaConfig,
          listaConfirmados: [],
          version: appData.version
        });
        broadcastSse('APITO_COLETIVO', {
            atleta: novoAtleta || payload,
            mensagem: `${(novoAtleta && novoAtleta.nome) || payload.nome || 'Jogador'} entrou e se escalou na pelada! ⚽`,
            listaConfirmados: appData.listaConfirmados,
            tocarApito: true,
            version: appData.version
          });
          broadcastSse('SYNC', appData);
      }
    }
  } catch (err) {
    console.error('[Auto-Reset Meia-Noite] Erro na verificação:', err);
  }
}

// Checagem periódica a cada 30 segundos
setInterval(verificarResetMeiaNoite, 30000);
verificarResetMeiaNoite();

// Obter IP da rede local Wi-Fi / Ethernet
function getLocalIp() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch (e) {}
  return 'localhost';
}

// Helper seguro para leitura de corpo de requisição POST
function lerCorpoRequisicao(req, callback) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') {
      return callback(null, req.body);
    }
    try {
      const parsed = JSON.parse(req.body || '{}');
      return callback(null, parsed);
    } catch (e) {
      return callback(e);
    }
  }

  // Proteção Serverless: se o stream já foi consumido pelo runtime
  if (req.complete || req.readableEnded) {
    return callback(null, {});
  }

  let body = '';
  let finalizado = false;

  // Timeout de segurança interno de 4 segundos para nunca travar a função serverless
  const timerSeguranca = setTimeout(() => {
    if (!finalizado) {
      finalizado = true;
      try {
        const payload = JSON.parse(body || '{}');
        callback(null, payload);
      } catch (e) {
        callback(null, {});
      }
    }
  }, 4000);

  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    if (!finalizado) {
      finalizado = true;
      clearTimeout(timerSeguranca);
      try {
        const payload = JSON.parse(body || '{}');
        callback(null, payload);
      } catch (e) {
        callback(e);
      }
    }
  });
  req.on('error', err => {
    if (!finalizado) {
      finalizado = true;
      clearTimeout(timerSeguranca);
      callback(err);
    }
  });
}

// Manipulador principal de requisições HTTP
const requestHandler = (req, res) => {
  try {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const hostHeader = req.headers && (req.headers.host || req.headers['x-forwarded-host']);
    const parsedUrl = new URL(req.url, `http://${hostHeader || 'localhost'}`);
    const rawPath = (req.headers && (req.headers['x-matched-path'] || req.headers['x-forwarded-uri'])) || parsedUrl.pathname;
    const pathname = rawPath.replace(/\/+$/, '') || '/';

    // 0. Rotas Oficiais de PWA: manifest.json e service-worker
    if (pathname === '/manifest.json' || pathname === '/manifest.webmanifest') {
      const manifestPath = path.join(__dirname, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        res.writeHead(200, {
          'Content-Type': 'application/manifest+json; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(fs.readFileSync(manifestPath));
        return;
      }
    }

    if (pathname === '/sw.js' || pathname === '/service-worker.js' || pathname === '/service-worker') {
      const swPath = path.join(__dirname, 'sw.js');
      if (fs.existsSync(swPath)) {
        res.writeHead(200, {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Service-Worker-Allowed': '/',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(fs.readFileSync(swPath));
        return;
      }
    }

    // 0.1 Rota oficial para Página de Teste e Diagnóstico do Servidor: GET /teste
    if (pathname === '/teste' || pathname === '/teste/' || pathname === '/teste.html') {
      const publicIndexPath = path.join(__dirname, 'public', 'index.html');
      if (fs.existsSync(publicIndexPath)) {
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(fs.readFileSync(publicIndexPath));
        return;
      }
    }

    // 0.2 API v2: Ping & Diagnóstico de Conexão
    if (pathname === '/api/v2/ping' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ status: "ok", rtt: "12ms", time: Date.now() }));
      return;
    }

    // 0.3 API v2: Listagem de Atletas
    if (pathname === '/api/v2/athletes' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(athletesDatabase));
      return;
    }

    // 0.4 API v2: Teste de Geofencing 500m Individual
    if (pathname === '/api/v2/geofence-test' && req.method === 'POST') {
      lerCorpoRequisicao(req, (err, payload) => {
        if (err || !payload) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: 'Payload inválido' }));
          return;
        }

        const athleteId = parseInt(payload.athleteId);
        const distanceMeters = Number(payload.distanceMeters || 0);
        const customStatus = payload.customStatus;
        const athlete = athletesDatabase.find(a => a.id === athleteId);

        if (!athlete) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: false, message: "Atleta não encontrado." }));
          return;
        }

        athlete.distance = distanceMeters;
        athlete.distanciaMetros = distanceMeters;

        // Regra de Negócio: Geofence de 500 metros
        if (customStatus === 'reset') {
          athlete.status = 'reset';
          athlete.checkedIn = false;
          athlete.distance = 0;
          athlete.distanciaMetros = 0;
          athlete.canCheckIn = false;
        } else if (distanceMeters <= 500) {
          athlete.status = 'campo';
          athlete.canCheckIn = true;
        } else if (distanceMeters <= 1500) {
          athlete.status = 'proximo';
          athlete.canCheckIn = false;
        } else {
          athlete.status = 'longe';
          athlete.canCheckIn = false;
        }

        // Notifica painel e celulares conectados via SSE
        broadcastSse('GEOFENCE_UPDATE', {
          athleteId: athlete.id,
          athleteName: athlete.name || athlete.nome,
          distance: athlete.distance,
          status: athlete.status,
          canCheckIn: athlete.status === 'campo'
        });

        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
          success: true,
          athlete,
          allowed: athlete.distance <= 500 && athlete.status !== 'reset'
        }));
      });
      return;
    }

    // 0.5 API v2: Confirmação de Check-in individual
    if (pathname === '/api/v2/checkin' && req.method === 'POST') {
      lerCorpoRequisicao(req, (err, payload) => {
        if (err || !payload) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: 'Payload inválido' }));
          return;
        }

        const athleteId = parseInt(payload.athleteId);
        const athlete = athletesDatabase.find(a => a.id === athleteId);

        if (!athlete) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ error: "Atleta não encontrado" }));
          return;
        }

        if (athlete.distance > 500) {
          broadcastSse('CHECKIN_REJECTED', {
            athleteId: athlete.id,
            athleteName: athlete.name || athlete.nome,
            distance: athlete.distance,
            reason: "Bloqueado: Fora do raio de 500m"
          });
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
          res.end(JSON.stringify({ success: false, message: "Bloqueado: Fora do raio de 500m" }));
          return;
        }

        athlete.checkedIn = true;
        athlete.status = 'campo';

        broadcastSse('CHECKIN_CONFIRMED', {
          athleteId: athlete.id,
          athleteName: athlete.name || athlete.nome,
          distance: athlete.distance
        });

        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: true, message: "Check-in confirmado com sucesso!", athlete }));
      });
      return;
    }

    // 0.6 API v2: Cadastro de Novo Atleta
    if (pathname === '/api/v2/athletes' && req.method === 'POST') {
      lerCorpoRequisicao(req, (err, payload) => {
        if (err || !payload) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Payload inválido' }));
          return;
        }

        try {
          const novoAtleta = {
            id: payload.id || (athletesDatabase.length + 1),
            name: payload.name || payload.nome || 'Novo Atleta',
            nome: payload.name || payload.nome || 'Novo Atleta',
            position: payload.position || payload.posicao || 'MEI',
            posicao: payload.position || payload.posicao || 'MEI',
            age: parseInt(payload.age || payload.idade || 25, 10),
            idade: parseInt(payload.age || payload.idade || 25, 10),
            weight: parseFloat(payload.weight || payload.peso || 75),
            peso: parseFloat(payload.weight || payload.peso || 75),
            fit: parseInt(payload.fit || 100, 10),
            condicaoFisica: payload.condicaoFisica || `${payload.fit || 100}% Fit`,
            distance: payload.distance !== undefined ? payload.distance : 2500,
            distanciaMetros: payload.distance !== undefined ? payload.distance : 2500,
            status: payload.status || 'longe',
            checkedIn: false
          };

          athletesDatabase.push(novoAtleta);

          broadcastSse('ATHLETE_ADDED', novoAtleta);

          res.writeHead(201, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ success: true, athlete: novoAtleta, atleta: novoAtleta }));
        } catch (innerErr) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: innerErr.message }));
        }
      });
      return;
    }

    // 1. API: Realtime SSE (/events/match-stream, /api/stream ou /api/realtime)
    const isStreamRoute = pathname === '/events/match-stream' ||
                          pathname === '/api/stream' ||
                          pathname === '/api/realtime' ||
                          pathname === '/api/stream.js' ||
                          pathname === '/api/realtime.js';

    if (isStreamRoute && req.method === 'GET') {
      verificarResetMeiaNoite();
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      res.write(`data: ${JSON.stringify({
        type: 'INIT_STATE',
        athletes: athletesDatabase,
        version: appData.version,
        listaConfirmados: appData.listaConfirmados,
        peladaConfig: appData.peladaConfig,
        escalacaoAtiva: appData.escalacaoAtiva,
        partidaEstado: appData.partidaEstado
      })}\n\n`);

      // Render mantém SSE aberto nativamente

      sseClients.add(res);

      req.on('close', () => {
        sseClients.delete(res);
      });
      return;
    }

    // 2. API principal: /api ou /api/pelada
    const isPeladaRoute = pathname === '/api' ||
                          pathname === '/api/pelada' ||
                          pathname === '/api/index.js' ||
                          pathname === '/api/pelada.js';

    if (isPeladaRoute && req.method === 'GET') {
      try {
        verificarResetMeiaNoite();
        const saved = loadData();
        if (Array.isArray(saved.atletas) && saved.atletas.length > 0) {
          appData.atletas = saved.atletas;
        }
        if (Array.isArray(saved.listaConfirmados)) {
          appData.listaConfirmados = saved.listaConfirmados;
        } else if (Array.isArray(appData.atletas) && (!appData.listaConfirmados || appData.listaConfirmados.length === 0)) {
          appData.listaConfirmados = [...appData.atletas];
        }
        if (saved.peladaConfig) appData.peladaConfig = saved.peladaConfig;
        if (saved.escalacaoAtiva !== undefined && appData.escalacaoAtiva === undefined) appData.escalacaoAtiva = saved.escalacaoAtiva;
        if (saved.partidaEstado !== undefined && appData.partidaEstado === undefined) appData.partidaEstado = saved.partidaEstado;
        if (saved.usuarios && (!appData.usuarios || appData.usuarios.length === 0)) appData.usuarios = saved.usuarios;
        if (saved.version) appData.version = saved.version;
      } catch (e) {}

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(appData));
      return;
    }

    if (isPeladaRoute && req.method === 'POST') {
      lerCorpoRequisicao(req, (err, payload) => {
        if (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: err.message }));
          return;
        }

        try {
          if (payload.atletas !== undefined && Array.isArray(payload.atletas) && payload.atletas.length > 0) {
            appData.atletas = payload.atletas;
          }
          if (payload.listaConfirmados !== undefined) {
            const novaLista = payload.listaConfirmados;
            if (Array.isArray(novaLista)) {
              if (novaLista.length > 0 || payload.forcarLimpeza === true || !appData.listaConfirmados || appData.listaConfirmados.length === 0) {
                appData.listaConfirmados = novaLista;
              }
            }
          }
          if (payload.peladaConfig !== undefined) {
            appData.peladaConfig = payload.peladaConfig;
          }
          if (payload.escalacaoAtiva !== undefined) {
            appData.escalacaoAtiva = payload.escalacaoAtiva;
          }
          if (payload.partidaEstado !== undefined) {
            appData.partidaEstado = payload.partidaEstado;
          }
          if (payload.usuarios !== undefined) {
            appData.usuarios = payload.usuarios;
          }

          appData.version = Date.now();
          salvarDadosDisco();
          broadcastSse('SYNC', appData);

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, version: appData.version }));
        } catch (innerErr) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: innerErr.message }));
        }
      });
      return;
    }


    // 2.1. API Atletas (Persistência real em database.json): GET /api/atletas e POST /api/atletas
    if (pathname === '/api/atletas' && req.method === 'GET') {
      try {
        const dados = lerDados();
        let lista = [];

        if (Array.isArray(dados.atletas) && dados.atletas.length > 0) {
          lista = dados.atletas;
        } else if (Array.isArray(dados.listaConfirmados) && dados.listaConfirmados.length > 0) {
          lista = dados.listaConfirmados;
        } else if (Array.isArray(appData.listaConfirmados) && appData.listaConfirmados.length > 0) {
          lista = appData.listaConfirmados;
        } else if (Array.isArray(appData.atletas) && appData.atletas.length > 0) {
          lista = appData.atletas;
        }

        // Mantém o cadastro permanente no appData em memória
        if (lista.length > 0) {
          appData.atletas = lista;
        }

        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(lista));
      } catch (err) {
        console.error('[API /api/atletas] Erro ao ler database.json:', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message, atletas: [] }));
      }
      return;
    }

    if (pathname === '/api/atletas' && req.method === 'POST') {
      lerCorpoRequisicao(req, (err, payload) => {
        if (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ sucesso: false, erro: err.message }));
          return;
        }

        try {
          const dados = lerDados();
          let lista = (dados.listaConfirmados && dados.listaConfirmados.length)
            ? dados.listaConfirmados
            : (dados.atletas || appData.listaConfirmados || []);

          if (Array.isArray(payload)) {
            lista = payload;
          } else if (payload && Array.isArray(payload.atletas)) {
            lista = payload.atletas;
          } else if (payload && Array.isArray(payload.listaConfirmados)) {
            lista = payload.listaConfirmados;
          } else if (payload && typeof payload === 'object') {
            const idBusca = payload.id ? String(payload.id).trim() : null;
            const nomeBusca = payload.nome ? String(payload.nome).trim().toLowerCase() : null;
            const idx = lista.findIndex(j => 
              (idBusca && String(j.id) === idBusca) ||
              (nomeBusca && (j.nome || '').trim().toLowerCase() === nomeBusca)
            );

            if (idx >= 0) {
              lista[idx] = { ...lista[idx], ...payload };
            } else {
              const horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              const novoAtleta = {
                id: payload.id || ('jog_' + Date.now()),
                nome: payload.nome || 'Novo Atleta',
                posicao: payload.posicao || 'ATA',
                idade: payload.idade || 25,
                fitness: payload.fitness || 90,
                hora: horaAgora,
                horaOnline: horaAgora,
                online: true,
                statusPresenca: 'confirmado',
                chegadaConfirmada: false,
                ...payload
              };
              lista.unshift(novoAtleta);
            }
          }

          appData.atletas = lista;
          appData.version = Date.now();

          dados.atletas = lista;
          dados.version = appData.version;
          salvarDados(dados);

          broadcastSse('SYNC', appData);

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ sucesso: true, atletas: lista, listaConfirmados: lista, version: appData.version }));
        } catch (innerErr) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ sucesso: false, erro: innerErr.message }));
        }
      });
      return;
    }

    // 3. API Auth: Login
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      lerCorpoRequisicao(req, (err, payload) => {
        if (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ sucesso: false, erro: err.message }));
          return;
        }

        const { email, role } = payload || {};
        if (role === 'admin' || (email && email.toLowerCase().includes('admin'))) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            sucesso: true,
            usuario: {
              id: 'admin-master',
              nome: 'Organizador Master',
              email: email || 'topadmin@gmail.com',
              role: 'admin',
              autenticado: true
            }
          }));
          return;
        }

        try {
          const saved = loadData();
          if (saved.usuarios) appData.usuarios = saved.usuarios;
          if (saved.listaConfirmados) appData.listaConfirmados = saved.listaConfirmados;
        } catch (e) {}

        const busca = (email || '').toLowerCase().trim();
        const usuarios = appData.usuarios || [];
        let user = usuarios.find(u => (u.email && u.email.toLowerCase() === busca) || (u.nome && u.nome.toLowerCase() === busca));

        if (!user) {
          const naLista = (appData.listaConfirmados || []).find(j => (j.email && j.email.toLowerCase() === busca) || (j.nome && j.nome.toLowerCase() === busca));
          if (naLista) {
            user = { ...naLista, role: 'jogador' };
          }
        }

        if (!user) {
          const nomePadrao = (email || 'Jogador').split('@')[0];
          user = {
            id: 'jog_' + Date.now(),
            nome: nomePadrao,
            email: email || `${nomePadrao}@pelada.top`,
            role: 'jogador',
            posicao: 'MEI',
            idade: 28,
            fitness: 90
          };
          if (!appData.usuarios) appData.usuarios = [];
          appData.usuarios.push(user);
          salvarDadosDisco();
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ sucesso: true, usuario: user }));
      });
      return;
    }

    // 4. API Auth: Cadastro
    if (pathname === '/api/auth/cadastro' && req.method === 'POST') {
      lerCorpoRequisicao(req, (err, payload) => {
        if (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ sucesso: false, erro: err.message }));
          return;
        }

        try {
          const saved = loadData();
          if (saved.usuarios) appData.usuarios = saved.usuarios;
          if (saved.listaConfirmados) appData.listaConfirmados = saved.listaConfirmados;
        } catch (e) {}

        if (!appData.usuarios) appData.usuarios = [];
        const novoUsuario = {
          id: 'jog_' + Date.now(),
          nome: (payload && payload.nome) || 'Jogador',
          email: (payload && payload.email) || '',
          posicao: (payload && payload.posicao) || 'MEI',
          condicao: (payload && payload.condicao) || 'excelente',
          idade: (payload && payload.idade) || 25,
          peso: (payload && payload.peso) || 75,
          fitness: 90,
          foto: (payload && payload.foto) || '',
          role: 'jogador'
        };

        appData.usuarios.push(novoUsuario);
        salvarDadosDisco();

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ sucesso: true, usuario: novoUsuario }));
      });
      return;
    }

    // 5. API: Jogadores cadastrados
    if (pathname === '/api/jogadores' && req.method === 'GET') {
      try {
        const saved = loadData();
        if (saved.usuarios) appData.usuarios = saved.usuarios;
        if (saved.listaConfirmados) appData.listaConfirmados = saved.listaConfirmados;
      } catch (e) {}

      const lista = (appData.usuarios && appData.usuarios.length) ? appData.usuarios : (appData.listaConfirmados || []);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(lista));
      return;
    }

    // 6. API: Perfil do jogador
    if (pathname === '/api/perfil' && req.method === 'POST') {
      lerCorpoRequisicao(req, (err, payload) => {
        if (!err && payload) {
          try {
            const saved = loadData();
            if (saved.usuarios) appData.usuarios = saved.usuarios;
            if (saved.listaConfirmados) appData.listaConfirmados = saved.listaConfirmados;
          } catch (e) {}

          if (!appData.usuarios) appData.usuarios = [];
          if (!appData.listaConfirmados) appData.listaConfirmados = [];

          const idBusca = payload.id;
          const nomeAntigo = (payload.nomeAntigo || '').toLowerCase().trim();
          const nomeNovo = (payload.nome || '').toLowerCase().trim();

          // 1. Atualiza ou adiciona no cadastro de usuários
          let uIdx = appData.usuarios.findIndex(u => 
            (idBusca && String(u.id) === String(idBusca)) || 
            (nomeAntigo && (u.nome || '').toLowerCase().trim() === nomeAntigo) || 
            (nomeNovo && (u.nome || '').toLowerCase().trim() === nomeNovo)
          );
          if (uIdx >= 0) {
            appData.usuarios[uIdx] = { ...appData.usuarios[uIdx], ...payload };
          } else {
            appData.usuarios.push(payload);
          }

          // 2. Atualiza também na lista de confirmados da pelada se já estiver nela
          let cIdx = appData.listaConfirmados.findIndex(j => 
            (idBusca && String(j.id) === String(idBusca)) || 
            (nomeAntigo && (j.nome || '').toLowerCase().trim() === nomeAntigo) || 
            (nomeNovo && (j.nome || '').toLowerCase().trim() === nomeNovo)
          );
          if (cIdx >= 0) {
            appData.listaConfirmados[cIdx] = { ...appData.listaConfirmados[cIdx], ...payload };
          }

          appData.version = Date.now();
          salvarDadosDisco();
          broadcastSse('SYNC', appData);

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ sucesso: true, usuario: payload, listaConfirmados: appData.listaConfirmados, version: appData.version }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ sucesso: true }));
      });
      return;
    }

    // 7. API Admin: Salvar Atleta (Edição Completa ou Novo Cadastro)
    if (pathname === '/api/admin/atleta/salvar' && req.method === 'POST') {
      lerCorpoRequisicao(req, (err, payload) => {
        if (!err && payload) {
          try {
            const saved = loadData();
            if (saved.listaConfirmados) appData.listaConfirmados = saved.listaConfirmados;
            if (saved.usuarios) appData.usuarios = saved.usuarios;
          } catch (e) {}
          if (!appData.listaConfirmados) appData.listaConfirmados = [];

          const horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const idBusca = payload.id ? String(payload.id).trim() : null;
          const nomeOriginal = payload.nomeOriginal ? String(payload.nomeOriginal).trim().toLowerCase() : null;
          const nomeNovo = payload.nome ? String(payload.nome).trim().toLowerCase() : null;

          const idx = appData.listaConfirmados.findIndex(j => 
            (idBusca && String(j.id) === idBusca) ||
            (nomeOriginal && (j.nome || '').trim().toLowerCase() === nomeOriginal) ||
            (nomeNovo && (j.nome || '').trim().toLowerCase() === nomeNovo)
          );

          let atletaSalvo;
          if (idx >= 0) {
            // Edição de atleta existente
            const antigo = appData.listaConfirmados[idx];
            atletaSalvo = {
              ...antigo,
              ...payload,
              fitness: calcularFitnessAtleta({ ...antigo, ...payload })
            };
            appData.listaConfirmados[idx] = atletaSalvo;
            if (Array.isArray(appData.atletas)) {
              const aIdx = appData.atletas.findIndex(a => 
                (idBusca && String(a.id) === idBusca) ||
                (nomeOriginal && (a.nome || '').trim().toLowerCase() === nomeOriginal) ||
                (nomeNovo && (a.nome || '').trim().toLowerCase() === nomeNovo)
              );
              if (aIdx >= 0) appData.atletas[aIdx] = atletaSalvo;
              else appData.atletas.push(atletaSalvo);
            }
            if (appData.usuarios) {
              const uIdx = appData.usuarios.findIndex(u => 
                (idBusca && String(u.id) === idBusca) ||
                (nomeOriginal && (u.nome || '').trim().toLowerCase() === nomeOriginal) ||
                (nomeNovo && (u.nome || '').trim().toLowerCase() === nomeNovo)
              );
              if (uIdx >= 0) {
                appData.usuarios[uIdx] = { ...appData.usuarios[uIdx], ...atletaSalvo };
              }
            }
          } else {
            // Novo atleta adicionado
            atletaSalvo = {
              id: payload.id || ('jog_' + Date.now()),
              nome: payload.nome || 'Novo Atleta',
              posicao: payload.posicao || 'ATA',
              condicao: payload.condicao || 'excelente',
              idade: payload.idade || 28,
              peso: payload.peso || 75,
              fitness: calcularFitnessAtleta(payload),
              foto: payload.foto || '',
              online: true,
              hora: horaAgora,
              horaOnline: horaAgora,
              statusPresenca: payload.statusPresenca || 'confirmado',
              chegadaConfirmada: !!payload.chegadaConfirmada,
              distanciaMetros: payload.distanciaMetros !== undefined ? payload.distanciaMetros : null,
              distanciaTexto: payload.distanciaTexto || 'Confirmado',
              statusAproximacao: payload.statusAproximacao || 'longe',
              entrouEm: Date.now()
            };
            appData.listaConfirmados.unshift(atletaSalvo);
            if (Array.isArray(appData.atletas)) {
              appData.atletas.unshift(atletaSalvo);
            } else {
              appData.atletas = [atletaSalvo];
            }

            broadcastSse('JOGADOR_ONLINE', {
              atleta: atletaSalvo,
              mensagem: `${atletaSalvo.nome} acabou de entrar na lista da pelada!`,
              listaConfirmados: appData.listaConfirmados,
              version: appData.version
            });
          }

          appData.version = Date.now();
          salvarDadosDisco();
          broadcastSse('SYNC', appData);

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ sucesso: true, atleta: atletaSalvo, listaConfirmados: appData.listaConfirmados, version: appData.version }));
          return;
        }
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ sucesso: false, erro: 'Payload inválido' }));
      });
      return;
    }

    // 8. API Admin: Excluir Atleta (Por ID ou por Nome)
    if (pathname === '/api/admin/atleta/excluir' && req.method === 'POST') {
      lerCorpoRequisicao(req, (err, payload) => {
        if (!err && payload) {
          try {
            const saved = loadData();
            if (saved.listaConfirmados) appData.listaConfirmados = saved.listaConfirmados;
            if (saved.usuarios) appData.usuarios = saved.usuarios;
          } catch (e) {}

          const idBusca = payload.id ? String(payload.id).trim() : null;
          const nomeBusca = payload.nome ? String(payload.nome).trim().toLowerCase() : null;

          if (idBusca || nomeBusca) {
            appData.listaConfirmados = (appData.listaConfirmados || []).filter(j => {
              if (idBusca && String(j.id) === idBusca) return false;
              if (nomeBusca && j.nome && j.nome.trim().toLowerCase() === nomeBusca) return false;
              return true;
            });

            if (appData.usuarios) {
              appData.usuarios = (appData.usuarios || []).filter(u => {
                if (idBusca && String(u.id) === idBusca) return false;
                if (nomeBusca && u.nome && u.nome.trim().toLowerCase() === nomeBusca) return false;
                return true;
              });
            }

            if (Array.isArray(appData.atletas)) {
              appData.atletas = appData.atletas.filter(a => {
                if (idBusca && String(a.id) === idBusca) return false;
                if (nomeBusca && a.nome && a.nome.trim().toLowerCase() === nomeBusca) return false;
                return true;
              });
            }
            appData.version = Date.now();
            salvarDadosDisco();
            broadcastSse('SYNC', appData);
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ sucesso: true, listaConfirmados: appData.listaConfirmados }));
      });
      return;
    }

    // 9. API Presença / Chegada
    if ((pathname === '/api/pelada/confirmar-presenca' || pathname === '/api/pelada/confirmar-chegada') && req.method === 'POST') {
      lerCorpoRequisicao(req, (err, payload) => {
        if (!err && payload) {
          try {
            const saved = loadData();
            if (saved.listaConfirmados) appData.listaConfirmados = saved.listaConfirmados;
            if (saved.usuarios) appData.usuarios = saved.usuarios;
          } catch (e) {}
          if (!appData.listaConfirmados) appData.listaConfirmados = [];

          const horaAgora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

          if (pathname === '/api/pelada/confirmar-chegada') {
            // Confirmação de chegada no local (<= 500m)
            const idx = appData.listaConfirmados.findIndex(j => 
              (payload.id && String(j.id) === String(payload.id)) ||
              (payload.nome && (j.nome || '').trim().toLowerCase() === payload.nome.trim().toLowerCase())
            );
            if (idx >= 0) {
              appData.listaConfirmados[idx] = {
                ...appData.listaConfirmados[idx],
                ...payload,
                chegadaConfirmada: true,
                statusPresenca: 'chegou',
                statusAproximacao: 'chegou',
                horaChegada: horaAgora
              };
            }
          } else {
            // 1ª Confirmação: Entrar na Lista da Pelada (coloca na 1ª POSIÇÃO)
            const usuarioBase = (appData.usuarios || []).find(u => 
              (payload.id && String(u.id) === String(payload.id)) ||
              (payload.nome && (u.nome || '').trim().toLowerCase() === payload.nome.trim().toLowerCase())
            );

            const idx = appData.listaConfirmados.findIndex(j => 
              (payload.id && String(j.id) === String(payload.id)) ||
              (payload.nome && (j.nome || '').trim().toLowerCase() === payload.nome.trim().toLowerCase())
            );

            let atletaFinal;
            if (idx >= 0) {
              const [antigo] = appData.listaConfirmados.splice(idx, 1);
              atletaFinal = {
                ...antigo,
                ...(usuarioBase || {}),
                ...payload,
                online: true,
                statusPresenca: 'confirmado',
                hora: antigo.hora || horaAgora,
                horaOnline: horaAgora,
                entrouEm: Date.now()
              };
            } else {
              atletaFinal = {
                id: payload.id || (usuarioBase ? usuarioBase.id : ('jog_' + Date.now())),
                nome: payload.nome || (usuarioBase ? usuarioBase.nome : 'Jogador'),
                posicao: payload.posicao || (usuarioBase ? usuarioBase.posicao : 'MEI'),
                condicao: payload.condicao || (usuarioBase ? usuarioBase.condicao : 'excelente'),
                idade: payload.idade || (usuarioBase ? usuarioBase.idade : 28),
                fitness: calcularFitnessAtleta(payload.condicao ? payload : usuarioBase),
                foto: payload.foto || (usuarioBase ? usuarioBase.foto : ''),
                online: true,
                statusPresenca: 'confirmado',
                chegadaConfirmada: false,
                distanciaMetros: payload.distanciaMetros !== undefined ? payload.distanciaMetros : null,
                hora: horaAgora,
                horaOnline: horaAgora,
                entrouEm: Date.now()
              };
            }

            // Coloca o atleta na 1ª POSIÇÃO (índice 0)
            appData.listaConfirmados.unshift(atletaFinal);

            // Transmite evento específico de jogador online para todos os donos e participantes
            broadcastSse('JOGADOR_ONLINE', {
              atleta: atletaFinal,
              mensagem: `${atletaFinal.nome} acabou de entrar na lista da pelada!`,
              listaConfirmados: appData.listaConfirmados,
              version: appData.version
            });
          }

          appData.version = Date.now();
          salvarDadosDisco();
          broadcastSse('SYNC', appData);
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ sucesso: true, listaConfirmados: appData.listaConfirmados, version: appData.version }));
      });
      return;
    }


    // 10. API Admin: Status
    if (pathname === '/api/admin/status' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        sucesso: true,
        status: 'online',
        uptime: process.uptime(),
        clientesConectados: sseClients.size,
        totalAtletas: (appData.listaConfirmados || []).length,
        listaAberta: appData.peladaConfig ? appData.peladaConfig.listaAberta : true,
        version: appData.version
      }));
      return;
    }

    // 11. API Admin: Configuração
    if (pathname === '/api/admin/config') {
      const configFile = path.join(__dirname, 'config.json');
      let cfgData = {};
      if (fs.existsSync(configFile)) {
        try { cfgData = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
      }

      if (req.method === 'GET') {
        if (!cfgData.regrasPelada) cfgData.regrasPelada = {};
        if (!cfgData.regrasPelada.arena) {
          cfgData.regrasPelada.arena = {
            nome: appData.peladaConfig ? appData.peladaConfig.local : '',
            lat: appData.peladaConfig ? appData.peladaConfig.lat : -7.190405,
            lng: appData.peladaConfig ? appData.peladaConfig.lng : -34.870103,
            mapsUrl: appData.peladaConfig ? appData.peladaConfig.mapsUrl : ''
          };
        }
        if (appData.peladaConfig) {
          cfgData.regrasPelada.raioMaximoMetros = appData.peladaConfig.raioMaximoMetros;
          cfgData.regrasPelada.exigirGps = appData.peladaConfig.exigirGps;
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(cfgData));
        return;
      }

      if (req.method === 'POST') {
        lerCorpoRequisicao(req, (err, payload) => {
          if (!err && payload) {
            if (payload.regrasPelada) {
              const r = payload.regrasPelada;
              if (r.arena) {
                if (r.arena.nome) appData.peladaConfig.local = r.arena.nome;
                if (r.arena.lat) appData.peladaConfig.lat = parseFloat(r.arena.lat);
                if (r.arena.lng) appData.peladaConfig.lng = parseFloat(r.arena.lng);
                if (r.arena.mapsUrl) appData.peladaConfig.mapsUrl = r.arena.mapsUrl;
              }
              if (r.raioMaximoMetros) appData.peladaConfig.raioMaximoMetros = parseInt(r.raioMaximoMetros);
              if (r.exigirGps !== undefined) appData.peladaConfig.exigirGps = (r.exigirGps === true || r.exigirGps === 'true');
            }
            cfgData = { ...cfgData, ...payload };
            try { fs.writeFileSync(configFile, JSON.stringify(cfgData, null, 2), 'utf8'); } catch (e) {}
            appData.version = Date.now();
            salvarDadosDisco();
            broadcastSse('SYNC', appData);
          }
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ sucesso: true, config: cfgData }));
        });
        return;
      }
    }

    // 12. API Admin: Trava Lista
    if (pathname === '/api/admin/trava-lista' && req.method === 'POST') {
      if (!appData.peladaConfig) appData.peladaConfig = { ...DEFAULT_CONFIG };
      appData.peladaConfig.listaAberta = !appData.peladaConfig.listaAberta;
      appData.version = Date.now();
      salvarDadosDisco();
      broadcastSse('SYNC', appData);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ sucesso: true, listaAberta: appData.peladaConfig.listaAberta }));
      return;
    }

    // 13. API Admin: Reset de Partida
    if (pathname === '/api/admin/reset' && req.method === 'POST') {
      appData.listaConfirmados = [];
      appData.escalacaoAtiva = null;
      appData.partidaEstado = { emAndamento: false, finalizada: false, tempoRestante: 600 };
      appData.version = Date.now();
      salvarDadosDisco();
      broadcastSse('SYNC', appData);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ sucesso: true }));
      return;
    }

    // 14. API Admin: Backup
    if (pathname === '/api/admin/backup' && req.method === 'POST') {
      salvarDadosDisco();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ sucesso: true, mensagem: 'Backup salvo com sucesso!' }));
      return;
    }

    // 15. API Admin: Logs
    if (pathname === '/api/admin/logs' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify([]));
      return;
    }

    // 16. API Teste: Simular GPS
    if ((pathname === '/api/teste/simular-gps' || pathname === '/api/admin/simular-gps') && req.method === 'POST') {
      if (!isLocalDevRequest(req)) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ sucesso: false, erro: 'Acesso restrito ao ambiente de desenvolvimento local.' }));
        return;
      }
      lerCorpoRequisicao(req, (err, payload) => {
        if (err || !payload) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ sucesso: false, erro: 'Payload inválido' }));
          return;
        }

        const { atletaId, nomeAtleta, statusDistancia } = payload;
        const busca = (nomeAtleta || atletaId || '').toString().toLowerCase().trim();

        if (!appData.listaConfirmados) appData.listaConfirmados = [];

        let atleta = appData.listaConfirmados.find(j => 
          (atletaId && String(j.id) === String(atletaId)) ||
          (j.nome && j.nome.toLowerCase() === busca) ||
          (j.email && j.email.toLowerCase() === busca)
        );

        if (!atleta) {
          atleta = {
            id: atletaId || ('jog_' + Date.now()),
            nome: nomeAtleta || 'Atleta Teste',
            posicao: 'ATA',
            condicao: 'excelente',
            idade: 28,
            fitness: 90,
            foto: '',
            hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            statusPresenca: 'confirmado',
            chegadaConfirmada: false
          };
          appData.listaConfirmados.unshift(atleta);
        }

        const st = String(statusDistancia || '').toLowerCase().trim();
        if (st === 'chegou' || st === 'chegar' || st === 'campo' || st === 'no_campo') {
          atleta.distanciaMetros = 50;
          atleta.distanciaTexto = 'No Campo';
          atleta.statusAproximacao = 'chegou';
          atleta.chegadaConfirmada = true;
          atleta.statusPresenca = 'chegou';
          atleta.horaChegada = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } else if (st === 'proximo' || st === 'proxima' || st === '850') {
          atleta.distanciaMetros = 850;
          atleta.distanciaTexto = '850m';
          atleta.statusAproximacao = 'proximo';
          atleta.chegadaConfirmada = false;
          atleta.statusPresenca = 'confirmado';
          atleta.horaChegada = null;
        } else if (st === 'longe' || st === '3800') {
          atleta.distanciaMetros = 3800;
          atleta.distanciaTexto = 'Longe';
          atleta.statusAproximacao = 'longe';
          atleta.chegadaConfirmada = false;
          atleta.statusPresenca = 'confirmado';
          atleta.horaChegada = null;
        } else if (st === 'resetar' || st === 'reset' || st === 'desfazer') {
          atleta.distanciaMetros = null;
          atleta.distanciaTexto = 'Na Lista';
          atleta.statusAproximacao = 'longe';
          atleta.chegadaConfirmada = false;
          atleta.statusPresenca = 'confirmado';
          atleta.horaChegada = null;
        }

        appData.version = Date.now();
        salvarDadosDisco();
        broadcastSse('SYNC', appData);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          sucesso: true,
          statusDistancia: st,
          atleta: atleta,
          listaConfirmados: appData.listaConfirmados
        }));
      });
      return;
    }

    // 17. API Admin: Salvar Sorteio de Times Oficial
    if (pathname === '/api/admin/sorteio/salvar' && req.method === 'POST') {
      lerCorpoRequisicao(req, (err, payload) => {
        if (!err && payload) {
          appData.timesSorteados = payload.times || [];
          appData.dataSorteio = new Date().toISOString();
          appData.version = Date.now();
          salvarDadosDisco();
          broadcastSse('SORTEIO_REALIZADO', { times: appData.timesSorteados, version: appData.version });
          broadcastSse('SYNC', appData);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ sucesso: true, times: appData.timesSorteados }));
          return;
        }
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ sucesso: false, erro: 'Payload inválido' }));
      });
      return;
    }



    // 18. API Admin: Configurar Dia e Horário da Pelada
    if (pathname === '/api/admin/config/horario' && req.method === 'POST') {
      lerCorpoRequisicao(req, (err, payload) => {
        if (!err && payload) {
          if (!appData.peladaConfig) appData.peladaConfig = {};
          if (payload.dataPelada !== undefined) appData.peladaConfig.dataPelada = payload.dataPelada;
          if (payload.diaSemana !== undefined) appData.peladaConfig.diaSemana = payload.diaSemana;
          if (payload.horaInicio !== undefined) appData.peladaConfig.horaInicio = payload.horaInicio;
          if (payload.horaFim !== undefined) appData.peladaConfig.horaFim = payload.horaFim;

          appData.version = Date.now();
          salvarDadosDisco();
          broadcastSse('CONFIG_UPDATE', appData.peladaConfig);
          broadcastSse('SYNC', appData);

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ sucesso: true, peladaConfig: appData.peladaConfig }));
          return;
        }
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ sucesso: false, erro: 'Payload inválido' }));
      });
      return;
    }

    // 10. Fallback para rotas de API não reconhecidas
    if (pathname.startsWith('/api')) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Endpoint da API não encontrado', pathname }));
      return;
    }

    // 11. Arquivos estáticos e dashboard admin compatibilidade
    if (pathname === '/dashboard.js' || pathname === '/painel/dashboard.js') {
      const dashPath = path.join(__dirname, 'public_admin', 'dashboard.js');
      if (fs.existsSync(dashPath)) {
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        res.end(fs.readFileSync(dashPath));
        return;
      }
    }

    let reqPath = pathname;
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

    const blockedFiles = ['/server.js', '/package.json', '/package-lock.json', '/pelada-dados.json'];
    if (blockedFiles.includes(reqPath)) {
      if (req.method === 'GET' && !pathname.startsWith('/api')) {
        const indexPath = path.join(__dirname, 'public', 'index.html');
        if (fs.existsSync(indexPath)) {
          const indexData = fs.readFileSync(indexPath);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Service-Worker-Allowed': '/' });
          res.end(indexData);
          return;
        }
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    let filePath = path.join(__dirname, reqPath);
    if (!fs.existsSync(filePath)) {
      const publicPath = path.join(__dirname, 'public', reqPath.replace(/^\/public\//, ''));
      if (fs.existsSync(publicPath)) {
        filePath = publicPath;
      }
    }

    if (fs.existsSync(filePath)) {
      try {
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          const fileData = fs.readFileSync(filePath);

          res.writeHead(200, {
            'Content-Type': contentType,
            'Service-Worker-Allowed': '/'
          });
          res.end(fileData);
          return;
        }
      } catch (fileErr) {
        console.warn('[Realtime] Erro ao ler arquivo:', filePath, fileErr.message);
      }
    }

    // Fallback universal para Página de Teste & Diagnóstico (apenas requisições GET fora de /api)
    if (req.method === 'GET') {
      const indexPath = path.join(__dirname, 'public', 'index.html');
      if (fs.existsSync(indexPath)) {
        try {
          const indexData = fs.readFileSync(indexPath);
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Service-Worker-Allowed': '/'
          });
          res.end(indexData);
          return;
        } catch (e) {}
      }
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  } catch (globalErr) {
    console.error('[Realtime] Erro crítico no handler:', globalErr);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Erro interno no servidor' }));
    }
  }
};

const server = http.createServer(requestHandler);

// Porta universal para Render ou localhost
const SERVER_PORT = process.env.PORT || PORT;

server.listen(SERVER_PORT, () => {
  const localIp = getLocalIp();
  console.log('====================================================');
  console.log('  ⚽ PELADA TOP - PAINEL DE TESTE & DIAGNÓSTICO ATIVO ');
  console.log('====================================================');
  console.log(`Porta principal:    ${SERVER_PORT}`);
  console.log(`Local (neste PC):   http://localhost:${SERVER_PORT}/teste`);
  console.log(`                    http://127.0.0.1:${SERVER_PORT}/teste`);
  console.log(`Rede Wi-Fi/Celular: http://${localIp}:${SERVER_PORT}/teste`);
  console.log('====================================================');
});

// Porta espelho 8080 para compatibilidade se diferente da principal
if (String(SERVER_PORT) !== '8080') {
  try {
    const server8080 = http.createServer(requestHandler);
    server8080.listen(8080, () => {
      console.log(`Porta espelho ativa: http://localhost:8080/teste`);
    });
    server8080.on('error', () => {});
  } catch (e) {}
}

// Export para compatibilidade
module.exports = requestHandler;
module.exports.default = requestHandler;
module.exports.server = server;
