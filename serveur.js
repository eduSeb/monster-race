// Mini serveur HTTP/HTTPS statique pour La Course des Monstres
// Lance avec : node serveur.js
// Le jeu est accessible depuis le PC ET depuis un smartphone sur le même WiFi.
//
// IMPORTANT : Sur smartphone, la Web Speech API nécessite HTTPS.
// Ce serveur génère un certificat auto-signé au premier lancement.
// Sur le téléphone, acceptez l'avertissement de sécurité du navigateur.

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const os    = require('os');

const PORT_HTTP  = 8765;
const PORT_HTTPS = 8443;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

// Handler de requêtes partagé
function handler(req, res) {
  let urlPath = req.url.split('?')[0]; // ignore query strings
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(__dirname, urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('404 Not Found');
      return;
    }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 
      'Content-Type': mime,
      'Cache-Control': 'no-cache' // Force le refresh pendant le dev
    });
    res.end(data);
  });
}

// Récupère l'adresse IP locale pour l'afficher
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'inconnu';
}

// Serveur HTTP (pour localhost PC)
const httpServer = http.createServer(handler);
httpServer.listen(PORT_HTTP, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`\n  ✅  Jeu disponible sur :`);
  console.log(`      PC :         http://localhost:${PORT_HTTP}`);
  console.log(`      Smartphone : http://${ip}:${PORT_HTTP}  (pas de micro !)\n`);
});

// Serveur HTTPS (pour le micro sur smartphone)
// Génère un certificat auto-signé si nécessaire
function startHTTPS() {
  const certPath = path.join(__dirname, 'cert.pem');
  const keyPath  = path.join(__dirname, 'key.pem');
  
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.log('  🔐 Génération du certificat HTTPS auto-signé...');
    try {
      const { execSync } = require('child_process');
      execSync(`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/CN=monster-race"`, { stdio: 'pipe' });
      console.log('  ✅ Certificat créé !\n');
    } catch(e) {
      console.log('  ⚠️  OpenSSL non disponible. Le micro ne fonctionnera pas sur smartphone.');
      console.log('  💡 Sur smartphone, utilisez Chrome et tapez chrome://flags → "Insecure origins treated as secure"');
      console.log(`     puis ajoutez : http://${getLocalIP()}:${PORT_HTTP}\n`);
      return;
    }
  }

  try {
    const options = {
      key:  fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    const httpsServer = https.createServer(options, handler);
    httpsServer.listen(PORT_HTTPS, '0.0.0.0', () => {
      const ip = getLocalIP();
      console.log(`  🔒 HTTPS disponible :`);
      console.log(`      Smartphone (avec micro) : https://${ip}:${PORT_HTTPS}`);
      console.log(`      ⚠️  Acceptez l'avertissement de sécurité sur le téléphone.\n`);
    });
  } catch(e) {
    console.log('  ⚠️  Impossible de démarrer HTTPS :', e.message);
  }
}

startHTTPS();

// Ouvrir Chrome automatiquement sur PC
const { exec } = require('child_process');
const url = `http://localhost:${PORT_HTTP}`;
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

console.log('  Appuie Ctrl+C pour arrêter le serveur.\n');
