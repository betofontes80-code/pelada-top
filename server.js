const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 8080;
// Define o diretório de dados correto para a Vercel (/tmp) ou local (__dirname)
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL || !!process.env.NOW_REGION || !!process.env.VERCEL_ENV || !!process.env.AWS_REGION || !!process.env.LAMBDA_TASK_ROOT;
const IS_VERCEL = isVercel;
const DATA_FILE = path.join(isVercel ? '/tmp' : __dirname, 'pelada-dados.json');

// Função de leitura segura
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
    if (isVercel) {
      const bundledFile = path.join(__dirname, 'pelada-dados.json');
      if (fs.existsSync(bundledFile)) {
        return JSON.parse(fs.readFileSync(bundledFile, 'utf8'));
      }
    }
  } catch (e) {
    console.error("Erro ao ler dados:", e);
  }
  return {};
}

// Função de escrita segura em /tmp
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Erro ao salvar dados:", e);
  }
}

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

// Carregar dados salvos com proteção e fallback
try {
  let carregou = false;

  // 1. Tenta ler o arquivo de dados (no /tmp na Vercel ou local)
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.listaConfirmados) appData.listaConfirmados = parsed.listaConfirmados;
    if (parsed.peladaConfig) appData.peladaConfig = parsed.peladaConfig;
    if (parsed.escalacaoAtiva !== undefined) appData.escalacaoAtiva = parsed.escalacaoAtiva;
    if (parsed.partidaEstado !== undefined) appData.partidaEstado = parsed.partidaEstado;
    if (parsed.version) appData.version = parsed.version;
    carregou = true;
  }

  // 2. Se na Vercel e ainda não existe em /tmp, lê o arquivo empacotado da raiz
  if (!carregou && IS_VERCEL) {
    const bundledFile = path.join(__dirname, 'pelada-dados.json');
    if (fs.existsSync(bundledFile)) {
      const raw = fs.readFileSync(bundledFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.listaConfirmados) appData.listaConfirmados = parsed.listaConfirmados;
      if (parsed.peladaConfig) appData.peladaConfig = parsed.peladaConfig;
      if (parsed.escalacaoAtiva !== undefined) appData.escalacaoAtiva = parsed.escalacaoAtiva;
      if (parsed.partidaEstado !== undefined) appData.partidaEstado = parsed.partidaEstado;
      if (parsed.version) appData.version = parsed.version;
      carregou = true;
    }
  }

  if (carregou) {
    console.log('[Realtime] Dados da pelada carregados com sucesso.');
  } else {
    salvarDadosDisco();
  }
} catch (e) {
  console.warn('[Realtime] Aviso ao carregar dados salvos:', e.message);
}

// Salvar no disco com tratamento seguro para Serverless
function salvarDadosDisco() {
  saveData(appData);
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

// Helper seguro para leitura de corpo de requisição POST (suporta Vercel pre-parsed e stream nativo)
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

  // Proteção Serverless: se o stream já foi consumido pelo runtime da Vercel
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

// Manipulador principal de requisições HTTP (usado tanto localmente quanto na Vercel)
const requestHandler = (req, res) => {
  try {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const hostHeader = req.headers && (req.headers.host || req.headers['x-forwarded-host']);
    const parsedUrl = new URL(req.url, `http://${hostHeader || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // 1. API: Obter estado atual em tempo real
    if ((pathname === '/api/pelada' || pathname === '/api/index.js' || pathname === '/api' || pathname.startsWith('/api/')) && req.method === 'GET' && pathname !== '/api/stream' && pathname !== '/api/realtime') {
      try {
        const saved = loadData();
        if (saved.listaConfirmados) appData.listaConfirmados = saved.listaConfirmados;
        if (saved.peladaConfig) appData.peladaConfig = saved.peladaConfig;
        if (saved.escalacaoAtiva !== undefined) appData.escalacaoAtiva = saved.escalacaoAtiva;
        if (saved.partidaEstado !== undefined) appData.partidaEstado = saved.partidaEstado;
        if (saved.version) appData.version = saved.version;
      } catch (e) {}
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(appData));
      return;
    }

    // 2. API: Atualizar estado (Check-in, edição de atleta, exclusão, trava)
    if ((pathname === '/api/pelada' || pathname === '/api/index.js' || pathname === '/api' || pathname.startsWith('/api/')) && req.method === 'POST') {
      lerCorpoRequisicao(req, (err, payload) => {
        if (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: err.message }));
          return;
        }

        try {
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

          // Notifica participantes conectados instantaneamente via SSE
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

    // 3. API: Transmissão em tempo real Server-Sent Events (SSE)
    if ((pathname === '/api/stream' || pathname === '/api/realtime') && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
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

      if (IS_VERCEL) {
        // Encerra imediatamente na Vercel para impedir Timeout 504 de 300 segundos
        res.end();
        return;
      }

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

    // Fallback: se for navegação e não encontrou, tenta index.html
    const indexPath = path.join(__dirname, 'index.html');
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

// Execução local tradicional (inicia porta apenas quando executado diretamente e fora da Vercel)
if (require.main === module && !IS_VERCEL) {
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
}

// Export para Vercel Serverless Function (suporta chamada direta de função e instância de servidor)
const vercelHandler = (req, res) => {
  return requestHandler(req, res);
};
// Removido para manter Function.prototype.apply funcional

module.exports = vercelHandler;
module.exports.default = vercelHandler;
module.exports.server = server;
