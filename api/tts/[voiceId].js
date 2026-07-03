const https = require('https');

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'API key no configurada' });

  const { voiceId } = req.query;
  const body = JSON.stringify(req.body);

  return new Promise((resolve) => {
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
      const chunks = [];
      upRes.on('data', c => chunks.push(c));
      upRes.on('end', () => {
        const buf = Buffer.concat(chunks);
        res.setHeader('Content-Type', upRes.headers['content-type'] || 'audio/mpeg');
        res.status(upRes.statusCode).send(buf);
        resolve();
      });
    });

    upstream.on('error', (err) => {
      res.status(502).json({ error: err.message });
      resolve();
    });

    upstream.write(body);
    upstream.end();
  });
}
