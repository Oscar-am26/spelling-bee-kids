const https = require('https');

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!API_KEY) return res.status(503).json({ error: 'TTS no configurado' });

  const voiceId = req.query.voiceId;
  if (!voiceId) return res.status(400).json({ error: 'Voice ID requerido' });

  let rawBody = '';
  if (req.body && typeof req.body === 'object') {
    rawBody = JSON.stringify(req.body);
  } else {
    await new Promise((resolve, reject) => {
      req.on('data', c => rawBody += c);
      req.on('end', resolve);
      req.on('error', reject);
    });
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${voiceId}`,
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(rawBody),
      },
    };
    const upstream = https.request(options, (upRes) => {
      res.setHeader('Content-Type', upRes.headers['content-type'] || 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store');
      res.status(upRes.statusCode);
      upRes.pipe(res);
      upRes.on('end', resolve);
    });
    upstream.on('error', () => { res.status(502).json({ error: 'Error TTS' }); resolve(); });
    upstream.write(rawBody);
    upstream.end();
  });
};
