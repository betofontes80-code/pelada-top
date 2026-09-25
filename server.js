const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;
const DATA_FILE = path.join(__dirname, 'pelada-dados.json');

// MIME types suportados
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
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
  exigirGps: true
};

const DEFAULT_CONFIRMADOS = [];

// Estado na memória
let appData = {
  listaConfirmados: DEFAULT_CONFIRMADOS,
  peladaConfig: DEFAULT_CONFIG,
  escalacaoAtiva: null,
  partidaEstado: { emAndamento: false, finalizada: false, tempoRestante: 600 },
  version: Date.now()
};

// Carregar dados salvos se existirem
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.listaConfirmados) appData.listaConfirmados = parsed.listaConfirmados;
    if (parsed.peladaConfig) appData.peladaConfig = parsed.peladaConfig;
    if (parsed.escalacaoAtiva !== undefined) appData.escalacaoAtiva = parsed.escalacaoAtiva;
    if (parsed.partidaEstado !== undefined) appData.partidaEstado = parsed.partidaEstado;
    if (parsed.version) appData.version = parsed.version;
    console.log('[Realtime] Dados da pelada carregados do arquivo local.');
  } else {
    fs.writeFileSync(DATA_FILE, JSON.stringify(appData, null, 2), 'utf8');
  }
} catch (e) {
  console.warn('[Realtime] Erro ao carregar dados salvos:', e.message);
}

// Salvar no disco
function salvarDadosDisco() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(appData, null, 2), 'utf8');
  } catch (e) {
    console.error('[Realtime] Erro ao salvar dados no disco:', e.message);
  }
}

// Conexões ativas de Server-Sent Events (SSE) para transmissão em tempo real
const sseClients = new Set();

function broadcastSse(tipo, payload) {
  const dataString = `data: ${JSON.stringify({ type: tipo, ...payload })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(dataString);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Obter IP da rede local Wi-Fi / Ethernet
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 1. API: Obter estado atual em tempo real
  if (pathname === '/api/pelada' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(appData));
    return;
  }

  // 2. API: Atualizar estado (Check-in, edição de atleta, exclusão, trava)
  if (pathname === '/api/pelada' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (payload.listaConfirmados !== undefined) {
          appData.listaConfirmados = payload.listaConfirmados;
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
        appData.version = Date.now();
        salvarDadosDisco();

        // Notifica todos os participantes conectados instantaneamente via SSE
        broadcastSse('SYNC', appData);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, version: appData.version }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 3. API: Transmissão em tempo real Server-Sent Events (SSE)
  if (pathname === '/api/stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(`data: ${JSON.stringify({ 
      type: 'CONNECTED', 
      version: appData.version, 
      listaConfirmados: appData.listaConfirmados, 
      peladaConfig: appData.peladaConfig,
      escalacaoAtiva: appData.escalacaoAtiva,
      partidaEstado: appData.partidaEstado
    })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 4. Arquivos Estáticos (HTML, JS, CSS, Ícones, Imagens)
  let reqPath = pathname;
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Service-Worker-Allowed': '/'
    });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log('====================================================');
  console.log('    ⚽ PELADA TOP - SERVIDOR REALTIME PWA ATIVO     ');
  console.log('====================================================');
  console.log(`Local (neste PC):   http://localhost:${PORT}`);
  console.log(`Rede Wi-Fi/Celular: http://${localIp}:${PORT}`);
  console.log('Todos os participantes conectados verão a lista em TEMPO REAL!');
  console.log('====================================================');
});
