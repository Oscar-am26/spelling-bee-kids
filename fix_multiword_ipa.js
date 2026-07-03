const https = require('https');
const fs = require('fs');

const IPA_PATH = require('path').join(__dirname, 'ipa_results.json');
const existing = JSON.parse(fs.readFileSync(IPA_PATH, 'utf8'));

const db = JSON.parse(fs.readFileSync(require('path').join(__dirname, 'db.json'), 'utf8'));
const multiWord = [...db.certification, ...db.science, ...db.content]
  .map(w => w.w.toLowerCase())
  .filter(w => w.includes(' ') || w.includes('-'));

console.log('Multi-word phrases:', multiWord.length);

function fetchOneWord(word) {
  return new Promise((resolve) => {
    const lookup = word.replace(/[^a-z']/gi, '').toLowerCase();
    if (!lookup) { resolve(null); return; }
    https.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lookup)}`, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) { resolve(null); return; }
        try {
          const json = JSON.parse(data);
          resolve(json[0]?.phonetics?.find(p => p.text)?.text || json[0]?.phonetic || null);
        } catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function main() {
  for (let i = 0; i < multiWord.length; i++) {
    const phrase = multiWord[i];
    const words = phrase.split(/[\s-]+/);
    const parts = [];
    for (const w of words) {
      const ipa = await fetchOneWord(w);
      if (ipa) parts.push(ipa);
      await new Promise(r => setTimeout(r, 350));
    }
    const combined = parts.length > 0 ? parts.join(' ') : null;
    existing[phrase] = combined;
    console.log(`[${i+1}/${multiWord.length}] "${phrase}": ${combined || 'NOT FOUND'}`);
  }

  fs.writeFileSync(IPA_PATH, JSON.stringify(existing, null, 2));
  console.log('\nSaved to ipa_results.json');
}

main().catch(console.error);
