const https = require('https');

module.exports = function (req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!API_KEY) { res.status(503).json({ error: 'TTS no configurado' }); return; }

  const voiceId = req.query.voiceId;
  if (!voiceId) { res.status(400).json({ error: 'Voice ID requerido' }); return; }

  const body = JSON.stringify(req.body);
  const options = {
    hostname: 'api.elevenlabs.io',
    path: `/v1/text-to-speech/${voiceId}`,
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
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
};
