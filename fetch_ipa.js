const https = require('https');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');
const IPA_PATH = path.join(__dirname, 'ipa_results.json');

const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const existing = fs.existsSync(IPA_PATH) ? JSON.parse(fs.readFileSync(IPA_PATH, 'utf8')) : {};

// Get all words from db
const allWords = [...db.certification, ...db.science, ...db.content].map(w => w.w.toLowerCase());

// Only fetch words that don't have IPA yet (empty or missing)
const toFetch = allWords.filter(w => !existing[w] || !existing[w].trim());

console.log(`Total words: ${allWords.length}`);
console.log(`Already have IPA: ${allWords.filter(w => existing[w] && existing[w].trim()).length}`);
console.log(`Need to fetch: ${toFetch.length}`);

function fetchIPA(word) {
  return new Promise((resolve) => {
    // For multi-word phrases, use the first meaningful word
    const lookup = word.split(' ')[0].replace(/[^a-z]/gi, '').toLowerCase();
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lookup)}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        try {
          const json = JSON.parse(data);
          const ipa = json[0]?.phonetics?.find(p => p.text)?.text || json[0]?.phonetic || null;
          resolve(ipa);
        } catch(e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const results = { ...existing };
  let found = 0;
  let notFound = 0;

  for (let i = 0; i < toFetch.length; i++) {
    const word = toFetch[i];
    const ipa = await fetchIPA(word);

    if (ipa) {
      results[word] = ipa;
      found++;
      console.log(`[${i+1}/${toFetch.length}] ${word}: ${ipa}`);
    } else {
      results[word] = null;
      notFound++;
      console.log(`[${i+1}/${toFetch.length}] ${word}: NOT FOUND`);
    }

    // Save progress every 20 words
    if ((i + 1) % 20 === 0) {
      fs.writeFileSync(IPA_PATH, JSON.stringify(results, null, 2));
      console.log(`  --> Progress saved (${i+1}/${toFetch.length})`);
    }

    // Rate limiting: 350ms between requests
    await sleep(350);
  }

  fs.writeFileSync(IPA_PATH, JSON.stringify(results, null, 2));
  console.log(`\nDone! Found: ${found}, Not found: ${notFound}`);

  // Summary
  const withIPA = allWords.filter(w => results[w]);
  console.log(`\nTotal words with IPA: ${withIPA.length}/${allWords.length}`);
}

main().catch(console.error);
