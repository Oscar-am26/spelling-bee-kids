module.exports = function (req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { code } = req.body || {};
  const valid = process.env.ACCESS_CODE;
  if (!valid) { res.status(500).json({ ok: false, error: 'ACCESS_CODE no configurado' }); return; }
  if (!code || code.trim().toUpperCase() !== valid.trim().toUpperCase()) {
    res.status(401).json({ ok: false }); return;
  }
  res.status(200).json({ ok: true });
};
