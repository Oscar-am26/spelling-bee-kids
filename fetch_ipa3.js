const https = require('https');
const fs = require('fs');
const IPA_PATH = require('path').join(__dirname, 'ipa_results.json');
const existing = JSON.parse(fs.readFileSync(IPA_PATH, 'utf8'));

// Words with alternative lookup strategies
const alternates = {
  'colour': 'color',
  'sweets': 'sweet',
  'have': 'have',
  'kite': 'kite',
  'mouse': 'mouse',
  'skateboard': 'skateboard',
  'arctic tundra': 'tundra',
  'habitats': 'habitat',
  'minerals': 'mineral',
  'nutrients': 'nutrient',
  'oceans': 'ocean',
  'predators': 'predator',
  'reproduction': 'reproduction',
  'temperatures': 'temperature',
  'tropical rainforest': 'rainforest',
  'waterproof': 'waterproof',
  'firefly': 'firefly',
  'floodlight': 'floodlight',
  'irreversible': 'irreversible',
  'polyester': 'polyester',
  'reversible': 'reversible',
  'streetlight': 'streetlight',
  'amphibians': 'amphibian',
  'berries': 'berry',
  'feathers': 'feather',
  'mammals': 'mammal',
  'pinecone': 'pinecone',
  'cafeteria': 'cafeteria',
  'crosswalk': 'crosswalk',
  'double-digit number': 'digit',
  'headphones': 'headphone',
  'lifeguard': 'lifeguard',
};

function fetchIPA(lookup) {
  return new Promise((resolve) => {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lookup)}`;
    https.get(url, (res) => {
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
  let found = 0;
  const entries = Object.entries(alternates);
  for (let i = 0; i < entries.length; i++) {
    const [word, lookup] = entries[i];
    const ipa = await fetchIPA(lookup);
    if (ipa) {
      existing[word] = ipa;
      found++;
      console.log(`${word} (via "${lookup}"): ${ipa}`);
    } else {
      console.log(`${word}: STILL NOT FOUND`);
    }
    await new Promise(r => setTimeout(r, 600));
  }
  fs.writeFileSync(IPA_PATH, JSON.stringify(existing, null, 2));
  const withIPA = Object.values(existing).filter(v => v).length;
  console.log(`\nDone! Newly found: ${found}, Total with IPA: ${withIPA}`);
}

main().catch(console.error);
