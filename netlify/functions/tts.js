const https = require('https');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API key no configurada' }) };
  }

  // La URL llega como /.netlify/functions/tts/<voiceId>
  const voiceId = event.path.split('/tts/')[1];
  if (!voiceId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Voice ID requerido' }) };
  }

  const body = event.body;

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

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: { 'Content-Type': res.headers['content-type'] || 'audio/mpeg' },
          body: buffer.toString('base64'),
          isBase64Encoded: true,
        });
      });
    });

    req.on('error', (err) => {
      resolve({ statusCode: 502, body: JSON.stringify({ error: err.message }) });
    });

    req.write(body);
    req.end();
  });
};
