const express = require('express');
const https   = require('https');
const path    = require('path');

const app = express();
app.use(express.json());

// Cargar .env en desarrollo local
if (require.main === module) {
  try {
    const fs   = require('fs');
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

// Debug temporal
app.get('/api/debug', (req, res) => {
  const fs = require('fs');
  let files = [];
  try { files = fs.readdirSync(__dirname).slice(0, 30); } catch (e) { files = [e.message]; }
  res.json({ __dirname, url: req.url, originalUrl: req.originalUrl, files });
});

// Servir archivos estáticos desde la raíz del proyecto
app.use(express.static(__dirname, {
  index: 'index.html',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.json')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// POST /api/verify — validar código de acceso
app.post('/api/verify', (req, res) => {
  const { code } = req.body || {};
  const valid = process.env.ACCESS_CODE;
  if (!valid)  return res.status(500).json({ ok: false, error: 'ACCESS_CODE no configurado' });
  if (!code || code.trim().toUpperCase() !== valid.trim().toUpperCase())
    return res.status(401).json({ ok: false });
  res.json({ ok: true });
});

// POST /api/tts/:voiceId — proxy a ElevenLabs
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

// Arranque local
if (require.main === module) {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
}

module.exports = app;
