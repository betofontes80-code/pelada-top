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

const DEFAULT_CONFIRMADOS = [
  { id: '1', nome: 'Beto Artilheiro', posicao: 'ATA', condicao: 'excelente', idade: 28, hora: '18:40', fitness: 98, foto: '' },
  { id: '2', nome: 'Marcos Silva', posicao: 'GOL', condicao: 'excelente', idade: 31, hora: '18:42', fitness: 95, foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-bJFjHM3Cw56hg-NkbJPMXI4BBSd27DSJG1xqrKmgFkRLUWBS9dP4iQV5hp4FfcKK6hittLBeVqZMU_eP8ed-FBF1Fa4LexRd6luPHSu-slQoz3Z90nOHmuowwOnRq7LH-Ku2HUOC6Vv2Czi0ySwIin7XXxizGR5nnpUKi6N_8eWYx6t6btGkpbhcJwh3YsLwKKERBq5hCYR03dGB0JzG3mK3BXfSW8xr1WaG6KNPTb8-Kd9bwyl_' },
  { id: '3', nome: 'Diego Costa', posicao: 'MEI', condicao: 'boa', idade: 42, hora: '18:45', fitness: 92, foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAgUPsqBtwqY-wTXynR-JuTosfEpI-oihJb5PFIeXr75WsV0QP-J_eUqt_gO27HLT0uxXEhL1zVAQOBkIAl6j5a3nQCMFdUx-AgLkxtz_QLXnafJetPeybrjwTin-NQh1D1eIGe1fVQebhJ7B0lFSyv9BRrXxxi50stcf3M9628WLPh2sdLH0F7AUqFOxzunqx3ah3sKBYGcvgE6EkYDOHHhI5wfe72SVasH4oXAJU0z2tK-NXxvI7B' },
  { id: '4', nome: 'Lucas Moura', posicao: 'ATA', condicao: 'regular', idade: 23, hora: '18:47', fitness: 74, foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAyzcRri3mZx0ZcvKW5FXsnPV4ayUzC1W-KdRiKBXl1rUtC4Us7H1an0kcGZSuop3fk7ZrRL73CXPDRawjf8R3xcV9WwkirfUBiNWlvJvwEQt66UDIuWZLO7vcvIEjtSJY9CFqSI0Bay5keXSpoyR5whkC1WpOucC60n3zet1mKr6Xyv5SV3BTXB_YXChTdJA-cpZObxa1a89-ro2zFMDYdRBJN09v2EhRaQ8TlSt1i3PfQSt0P7VPT' },
  { id: '5', nome: 'Carlos Silva', posicao: 'ATA', condicao: 'excelente', idade: 26, hora: '18:50', fitness: 88, foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABblwGh55YW14k26eWxvRk1CHJMBWcbXMVFeRz_m5hEDhbcA0180kKprPICjrmAsYqqSOYExyzmmlKO8Chbu6Iy-K2pM_Ti-Yk3I1dNKd29YauZjFdrPAdF-BDlOn5zVe7Ev6FE9frVzmI7SUK774inGrY3KDrHnjeuzhjIKr1vcm8nZv9J3Jgi_tNjrEKx28qv28kXoQKnWrRrtiTpxKM1MqUX5WLvIzUmezvreDlEYMrhAbYo0Bq' },
  { id: '6', nome: 'Marcos Paulo', posicao: 'MEI', condicao: 'boa', idade: 39, hora: '18:52', fitness: 85, foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDy4JkEBsUdGiZBD37jjx8GXKn4bjEGHbZ-vngcS7VFn6gOfRYVhfpzOB-fBgY6QpZec0QoR1819CW_x5zJZdBjnq0I9AXhJm-3iCbGBMvknMpKgeFzQoyyvWljFlv8UkLfM3wkYB-BO-TN9BQExtuW4P0Wug0MUjLGTfTHDDzLDl2gQEPTii8nQn9ZVXbj6w2Zp17puXN8kzWszozwe9rt1gIsGaMxFaExPoB_yHRxNKlH_uTJKs2D' },
  { id: '7', nome: 'João Pedro', posicao: 'ZAG', condicao: 'boa', idade: 21, hora: '18:55', fitness: 82, foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAnTjNM5tn1vRLvTcQsJdIXHJPGRgs3Ry9ja5UPJVweNooIqqDwusoMbFIQzmH0pIpayOCzxQojyKe93-vlIC8dvVNPQESlN0Ktg0JIedmU7V8EiopLTP9G2tRabcKyurjobjdQ-njx_Dv--uEjjUYdDd6O0iIX3qYPTqjk5WfMjBEN_5jPeDKKc8NOJlouH-p71Zs9JlGvUxP8ykOV5sedVZQcXk_R_XsgU9Eo6l-7EQ3MPTUkC-Rw' },
  { id: '8', nome: 'Felipe Costa', posicao: 'ATA', condicao: 'excelente', idade: 29, hora: '18:58', fitness: 87, foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcRNqUKxDsswQr0ijLpj7q9IzU__uvIVChxXH2LpWLDqdjAWeaeKtGs0ozhtMOnUWTgZHzC3VdauKmeLavSmAvlpv-QLLooqGG11RGmiXrPHUD6vimG21eiHYUSa3eioUK3XF0YsjhGqGW3lGMgLIu5vqg2jSmLmBTzDmWQP6QmkHmhPdCXZVJolzh_gEyM9aXtMIzgpvK2cz4CJeNIoSSJMoEGXSh2_V4bzNkKC4L6F78HVnhmQuM' },
  { id: '9', nome: 'Thiago Alves', posicao: 'GOL', condicao: 'boa', idade: 44, hora: '19:00', fitness: 80, foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfJPCsl6gZd0_Cj1ihhGyAKW1OPba0Jw-G_lB7C4tGioL7llzyOUXc9E2964dOaxTmfDrAxLWhwMiXCJwbbQ2LTRUL2UNvr3cUUxQ2tEwwQYhJNGr4RwtQl6XU0HWdFOVlIxyN5b8dW4MKvokTloGgquHVPCvZQyYqnwf6k-FwFn0RBoVAu-uMY4r7b3V7kpAuBJLahKFsGjNSG8HdC9v_Hak9UXx5D0BZXr_vNbAMXWqivgzOwkV0' },
  { id: '10', nome: 'Rodrigo Zagueiro', posicao: 'ZAG', condicao: 'excelente', idade: 40, hora: '19:02', fitness: 84, foto: '' },
  { id: '11', nome: 'Eduardo Meia', posicao: 'MEI', condicao: 'boa', idade: 33, hora: '19:05', fitness: 86, foto: '' },
  { id: '12', nome: 'Gabriel Volante', posicao: 'VOL', condicao: 'regular', idade: 22, hora: '19:08', fitness: 76, foto: '' }
];

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
