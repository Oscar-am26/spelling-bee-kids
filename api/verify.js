module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let code;
  if (req.body && typeof req.body === 'object') {
    code = req.body.code;
  } else {
    let raw = '';
    await new Promise((resolve, reject) => {
      req.on('data', c => raw += c);
      req.on('end', resolve);
      req.on('error', reject);
    });
    try { code = JSON.parse(raw).code; } catch (_) {}
  }

  const valid = process.env.ACCESS_CODE;
  if (!valid) return res.status(500).json({ ok: false });
  if (!code || code.trim().toUpperCase() !== valid.trim().toUpperCase())
    return res.status(401).json({ ok: false });
  res.status(200).json({ ok: true });
};
