const fs = require('fs');
const path = require('path');
const os = require('os');

const TMP_FILE = path.join(os.tmpdir(), 'pelada-dados.json');
const ROOT_SEED_FILE = path.join(__dirname, '..', 'pelada-dados.json');

const DEFAULT_CONFIG = {
  listaAberta: true,
  local: 'R. Abelardo Targino da Fonseca - Ernesto Geisel, João Pessoa - PB',
  lat: -7.190405,
  lng: -34.870103,
  mapsUrl: 'https://maps.app.goo.gl/gCjmZDcZEQeDiqhp7',
  raioMaximoMetros: 500,
  exigirGps: true
};

let appData = {
  listaConfirmados: [],
  peladaConfig: DEFAULT_CONFIG,
  escalacaoAtiva: null,
  partidaEstado: { emAndamento: false, finalizada: false, tempoRestante: 600 },
  version: Date.now()
};

function carregarDados() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const raw = fs.readFileSync(TMP_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.listaConfirmados) appData.listaConfirmados = parsed.listaConfirmados;
      if (parsed.peladaConfig) appData.peladaConfig = parsed.peladaConfig;
      if (parsed.escalacaoAtiva !== undefined) appData.escalacaoAtiva = parsed.escalacaoAtiva;
      if (parsed.partidaEstado !== undefined) appData.partidaEstado = parsed.partidaEstado;
      if (parsed.version) appData.version = parsed.version;
      return;
    }
    if (fs.existsSync(ROOT_SEED_FILE)) {
      const raw = fs.readFileSync(ROOT_SEED_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.listaConfirmados) appData.listaConfirmados = parsed.listaConfirmados;
      if (parsed.peladaConfig) appData.peladaConfig = parsed.peladaConfig;
      if (parsed.escalacaoAtiva !== undefined) appData.escalacaoAtiva = parsed.escalacaoAtiva;
      if (parsed.partidaEstado !== undefined) appData.partidaEstado = parsed.partidaEstado;
      if (parsed.version) appData.version = parsed.version;
    }
  } catch (e) {
    console.warn('[Vercel API] Aviso ao carregar dados:', e.message);
  }
}

function salvarDados() {
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(appData, null, 2), 'utf8');
  } catch (e) {
    console.warn('[Vercel API] Aviso ao salvar dados:', e.message);
  }
}

carregarDados();

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  carregarDados();

  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(appData));
  }

  if (req.method === 'POST') {
    // 1. Corpo pré-processado pela Vercel
    if (req.body && typeof req.body === 'object') {
      atualizarEstado(req.body);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, version: appData.version }));
    }

    // 2. Stream já encerrado ou vazio
    if (req.complete || req.readableEnded) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ success: true, version: appData.version }));
    }

    // 3. Leitura com proteção contra travamento (timeout de 3s)
    let body = '';
    let finalizado = false;

    const timer = setTimeout(() => {
      if (!finalizado) {
        finalizado = true;
        try {
          const payload = JSON.parse(body || '{}');
          atualizarEstado(payload);
        } catch (e) {}
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true, version: appData.version }));
      }
    }, 3000);

    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!finalizado) {
        finalizado = true;
        clearTimeout(timer);
        try {
          const payload = JSON.parse(body || '{}');
          atualizarEstado(payload);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, version: appData.version }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'JSON inválido' }));
        }
      }
    });
    return;
  }

  res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
};

function atualizarEstado(payload) {
  if (!payload) return;
  if (payload.listaConfirmados !== undefined) appData.listaConfirmados = payload.listaConfirmados;
  if (payload.peladaConfig !== undefined) appData.peladaConfig = payload.peladaConfig;
  if (payload.escalacaoAtiva !== undefined) appData.escalacaoAtiva = payload.escalacaoAtiva;
  if (payload.partidaEstado !== undefined) appData.partidaEstado = payload.partidaEstado;
  appData.version = payload.version || Date.now();
  salvarDados();
}
