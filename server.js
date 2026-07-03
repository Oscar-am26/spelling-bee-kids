const express = require('express');
const https   = require('https');
const fs      = require('fs');
const path    = require('path');

const app = express();
app.use(express.json());

// Cargar .env en desarrollo local
if (require.main === module) {
  try {
    const lines = fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
    }
  } catch (_) {}
}

// ── Debug temporal ───────────────────────────────────────────────────────
app.get('/api/debug2', (req, res) => {
  const size = (f) => { try { return fs.statSync(path.join(__dirname, f)).size; } catch { return null; } };
  let files = [];
  try { files = fs.readdirSync(__dirname); } catch(e) { files = [e.message]; }
  res.json({
    __dirname, files,
    indexSize: size('index.html'),
    dbSize: size('db.json'),
    assetsDir: (() => { try { return fs.readdirSync(path.join(__dirname, 'assets')).length + ' files'; } catch(e) { return e.message; } })()
  });
});

// ── POST /api/verify ──────────────────────────────────────────────────────
app.post('/api/verify', (req, res) => {
  const { code } = req.body || {};
  const valid = process.env.ACCESS_CODE;
  if (!valid)  return res.status(500).json({ ok: false });
  if (!code || code.trim().toUpperCase() !== valid.trim().toUpperCase())
    return res.status(401).json({ ok: false });
  res.json({ ok: true });
});

// ── POST /api/tts/:voiceId ────────────────────────────────────────────────
app.post('/api/tts/:voiceId', (req, res) => {
  const API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!API_KEY) return res.status(503).json({ error: 'TTS no configurado' });
  const body = JSON.stringify(req.body);
  const options = {
    hostname: 'api.elevenlabs.io',
    path: `/v1/text-to-speech/${req.params.voiceId}`,
    method: 'POST',
    headers: {
      'xi-api-key':     API_KEY,
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  };
  const upstream = https.request(options, (upRes) => {
    res.setHeader('Content-Type', upRes.headers['content-type'] || 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.status(upRes.statusCode);
    upRes.pipe(res);
  });
  upstream.on('error', () => res.status(502).json({ error: 'Error TTS' }));
  upstream.write(body);
  upstream.end();
});

// ── Archivos estáticos (handler manual — express.static no funciona en Vercel serverless) ──
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

app.get('*', (req, res) => {
  // Normalizar: / → index.html
  let urlPath = req.path === '/' ? '/index.html' : req.path;

  // Seguridad: evitar path traversal
  const filePath = path.resolve(__dirname, '.' + urlPath);
  if (!filePath.startsWith(__dirname)) {
    return res.status(403).end('Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) return res.status(404).end('Not found');
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    if (ext === '.json') res.setHeader('Cache-Control', 'no-cache');
    res.end(data);
  });
});

// ── Arranque local ────────────────────────────────────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
}

module.exports = app;
