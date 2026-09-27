const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 8080;
// Define o diretório de dados correto para a Vercel (/tmp) ou local (__dirname)
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL || !!process.env.NOW_REGION || !!process.env.VERCEL_ENV || !!process.env.AWS_REGION || !!process.env.LAMBDA_TASK_ROOT;
const IS_VERCEL = isVercel;
const TMP_DIR = process.platform === 'win32' ? os.tmpdir() : '/tmp';
const DATA_FILE = path.join(isVercel ? TMP_DIR : __dirname, 'pelada-dados.json');

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
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
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

    // 1. API: Realtime SSE (/api/stream ou /api/realtime)
    const isStreamRoute = pathname === '/api/stream' ||
                          pathname === '/api/realtime' ||
                          pathname === '/api/stream.js' ||
                          pathname === '/api/realtime.js';

    if (isStreamRoute && req.method === 'GET') {
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
        res.end();
        return;
      }

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
        const saved = loadData();
        if (saved.listaConfirmados) appData.listaConfirmados = saved.listaConfirmados;
        if (saved.peladaConfig) appData.peladaConfig = saved.peladaConfig;
        if (saved.escalacaoAtiva !== undefined) appData.escalacaoAtiva = saved.escalacaoAtiva;
        if (saved.partidaEstado !== undefined) appData.partidaEstado = saved.partidaEstado;
        if (saved.usuarios) appData.usuarios = saved.usuarios;
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
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ sucesso: true }));
      });
      return;
    }

    // 7. API Admin: Salvar Atleta
    if (pathname === '/api/admin/atleta/salvar' && req.method === 'POST') {
      lerCorpoRequisicao(req, (err, payload) => {
        if (!err && payload) {
          try {
            const saved = loadData();
            if (saved.listaConfirmados) appData.listaConfirmados = saved.listaConfirmados;
          } catch (e) {}
          if (!appData.listaConfirmados) appData.listaConfirmados = [];
          const idx = appData.listaConfirmados.findIndex(j => String(j.id) === String(payload.id));
          if (idx >= 0) {
            appData.listaConfirmados[idx] = { ...appData.listaConfirmados[idx], ...payload };
          } else {
            appData.listaConfirmados.push(payload);
          }
          appData.version = Date.now();
          salvarDadosDisco();
          broadcastSse('SYNC', appData);
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ sucesso: true }));
      });
      return;
    }

    // 8. API Admin: Excluir Atleta
    if (pathname === '/api/admin/atleta/excluir' && req.method === 'POST') {
      lerCorpoRequisicao(req, (err, payload) => {
        if (!err && payload && payload.id) {
          try {
            const saved = loadData();
            if (saved.listaConfirmados) appData.listaConfirmados = saved.listaConfirmados;
          } catch (e) {}
          appData.listaConfirmados = (appData.listaConfirmados || []).filter(j => String(j.id) !== String(payload.id));
          appData.version = Date.now();
          salvarDadosDisco();
          broadcastSse('SYNC', appData);
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ sucesso: true }));
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
          } catch (e) {}
          if (!appData.listaConfirmados) appData.listaConfirmados = [];
          const idx = appData.listaConfirmados.findIndex(j => String(j.id) === String(payload.id));
          if (idx >= 0) {
            appData.listaConfirmados[idx] = { ...appData.listaConfirmados[idx], ...payload };
          } else {
            appData.listaConfirmados.push(payload);
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

    // 10. Fallback para rotas de API não reconhecidas
    if (pathname.startsWith('/api')) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Endpoint da API não encontrado', pathname }));
      return;
    }

    // 11. Arquivos estáticos
    let reqPath = pathname;
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

    const blockedFiles = ['/server.js', '/package.json', '/vercel.json', '/package-lock.json', '/pelada-dados.json'];
    if (blockedFiles.includes(reqPath)) {
      if (req.method === 'GET' && !pathname.startsWith('/api')) {
        const indexPath = path.join(__dirname, 'index.html');
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

    // Fallback para SPA (apenas requisições GET fora de /api)
    if (req.method === 'GET') {
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

// Porta universal para Render, Vercel ou localhost
const SERVER_PORT = process.env.PORT || PORT;

server.listen(SERVER_PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log('====================================================');
  console.log('    ⚽ PELADA TOP - SERVIDOR REALTIME PWA ATIVO     ');
  console.log('====================================================');
  console.log(`Porta ativa:        ${SERVER_PORT}`);
  console.log(`Local (neste PC):   http://localhost:${SERVER_PORT}`);
  console.log(`Rede Wi-Fi/Celular: http://${localIp}:${SERVER_PORT}`);
  console.log('====================================================');
});

// Export para compatibilidade
module.exports = requestHandler;
module.exports.default = requestHandler;
module.exports.server = server;
