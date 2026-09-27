const serverHandler = require('../server.js');

// Mantém o endpoint SSE no mesmo handler usado localmente e evita
// responder com JSON antes que a lógica de realtime seja executada.
module.exports = (req, res) => {
  return serverHandler(req, res);
};
