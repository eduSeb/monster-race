// Mini serveur HTTP statique pour La Course des Monstres
// Lance avec : node serveur.js
const http = require('http');
const fs   = require('fs');
const path = require('path');
const PORT = 8765;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(__dirname, urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('404 Not Found');
      return;
    }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  ✅  Jeu disponible sur : http://localhost:${PORT}`);
  console.log('  Appuie Ctrl+C pour arrêter le serveur.\n');

  // Ouvrir Chrome automatiquement
  const { exec } = require('child_process');
  const url = `http://localhost:${PORT}`;
  const cmds = [
    `start chrome "${url}"`,
    `start msedge "${url}"`,
    `start "" "${url}"`,
  ];
  let tried = 0;
  function tryOpen() {
    if (tried >= cmds.length) return;
    exec(cmds[tried++], err => { if (err) tryOpen(); });
  }
  tryOpen();
});
