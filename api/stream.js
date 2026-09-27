module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.writeHead(200);
  res.end(JSON.stringify({
    status: 'ok',
    message: 'SSE persistente desativado no ambiente Serverless da Vercel para evitar timeouts de 300s. O app utiliza sincronizacao via polling HTTP em /api/pelada a cada 3.5s.'
  }));
};
