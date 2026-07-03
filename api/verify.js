export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).end();

  const { code } = req.body || {};
  const valid = process.env.ACCESS_CODE;

  if (!valid) return res.status(500).json({ ok: false, error: 'ACCESS_CODE no configurado' });
  if (!code || code.trim().toUpperCase() !== valid.trim().toUpperCase()) {
    return res.status(401).json({ ok: false });
  }

  res.status(200).json({ ok: true });
}
