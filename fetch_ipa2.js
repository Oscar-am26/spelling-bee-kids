const https = require('https');
const fs = require('fs');
const path = require('path');

const IPA_PATH = path.join(__dirname, 'ipa_results.json');
const existing = JSON.parse(fs.readFileSync(IPA_PATH, 'utf8'));

// Only fetch null entries
const toFetch = Object.entries(existing).filter(([k,v]) => v === null).map(([k]) => k);

console.log(`Retrying ${toFetch.length} null entries with longer delay...`);

function fetchIPA(word) {
  return new Promise((resolve) => {
    const lookup = word.split(' ')[0].replace(/[^a-z]/gi, '').toLowerCase();
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lookup)}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) { resolve(null); return; }
        try {
          const json = JSON.parse(data);
          const ipa = json[0]?.phonetics?.find(p => p.text)?.text || json[0]?.phonetic || null;
          resolve(ipa);
        } catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

async function main() {
  let found = 0;
  for (let i = 0; i < toFetch.length; i++) {
    const word = toFetch[i];
    const ipa = await fetchIPA(word);
    if (ipa) {
      existing[word] = ipa;
      found++;
      console.log(`[${i+1}/${toFetch.length}] ${word}: ${ipa}`);
    } else {
      console.log(`[${i+1}/${toFetch.length}] ${word}: STILL NOT FOUND`);
    }
    if ((i + 1) % 20 === 0) fs.writeFileSync(IPA_PATH, JSON.stringify(existing, null, 2));
    await new Promise(r => setTimeout(r, 600));
  }
  fs.writeFileSync(IPA_PATH, JSON.stringify(existing, null, 2));
  const withIPA = Object.entries(existing).filter(([k,v]) => v).length;
  console.log(`\nDone! Newly found: ${found}, Total with IPA: ${withIPA}/${Object.keys(existing).length}`);
}

main().catch(console.error);
