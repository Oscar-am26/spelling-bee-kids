const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── Leer .env manualmente (sin dependencias externas) ──────────────────────
function loadEnv() {
  try {
    const lines = fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (key && val) process.env[key] = val;
    }
  } catch (e) {
    console.warn('Advertencia: no se encontró el archivo .env');
  }
}
loadEnv();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
if (!ELEVENLABS_API_KEY) {
  console.error('ERROR: ELEVENLABS_API_KEY no está definida en .env');
}

const PORT = 8000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav',
};

// ── Rate limiting básico por IP ────────────────────────────────────────────
const rateLimitMap = new Map(); // ip → { count, resetAt }
const RATE_LIMIT   = 60;        // máx peticiones TTS por ventana
const RATE_WINDOW  = 60_000;    // ventana de 1 minuto (ms)

function isRateLimited(ip) {
  const now  = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// ── Proxy hacia ElevenLabs ─────────────────────────────────────────────────
function handleTTSProxy(req, res, voiceId) {
  const clientIp = req.socket.remoteAddress;

  if (isRateLimited(clientIp)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Demasiadas peticiones. Espera un momento.' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    const options = {
      hostname: 'api.elevenlabs.io',
      path:     `/v1/text-to-speech/${voiceId}`,
      method:   'POST',
      headers:  {
        'xi-api-key':   ELEVENLABS_API_KEY,   // ← la key NUNCA sale del servidor
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const upstream = https.request(options, (upRes) => {
      res.writeHead(upRes.statusCode, {
        'Content-Type':  upRes.headers['content-type'] || 'audio/mpeg',
        'Cache-Control': 'no-store',
      });
      upRes.pipe(res);
    });

    upstream.on('error', (err) => {
      console.error('Error proxy ElevenLabs:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No se pudo conectar con ElevenLabs' }));
    });

    upstream.write(body);
    upstream.end();
  });
}

// ── Servidor principal ─────────────────────────────────────────────────────
http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  // Endpoint proxy TTS: POST /api/tts/<voiceId>
  if (req.method === 'POST' && urlPath.startsWith('/api/tts/')) {
    const voiceId = urlPath.slice('/api/tts/'.length);
    if (!voiceId) { res.writeHead(400); res.end('Voice ID requerido'); return; }
    handleTTSProxy(req, res, voiceId);
    return;
  }

  // Archivos estáticos
  if (urlPath === '/') urlPath = '/index.html';
  const filePath    = path.join(ROOT, urlPath);
  const ext         = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });

}).listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Proxy TTS: POST /api/tts/<voiceId>`);
  console.log(`API key cargada: ${ELEVENLABS_API_KEY ? 'SÍ ✓' : 'NO ✗ — revisa .env'}`);
});
