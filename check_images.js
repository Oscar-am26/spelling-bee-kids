const fs   = require('fs');
const path = require('path');
const BASE = path.join(__dirname);
const html = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8');

// Extract DB section
const dbStart = html.indexOf('const DB = {');
const dbEnd   = html.indexOf('\n        };', dbStart) + 11;
const dbText  = html.slice(dbStart, dbEnd).replace('const DB = ', '');

const DB = eval('(' + dbText + ')');

const normalize = w =>
  w.toLowerCase()
   .replace(/-/g, '_')
   .replace(/ /g, '_')
   .replace(/_+/g, '_')
   .replace(/^_|_$/g, '')
   .trim();

let missing = [];
for (const [cat, words] of Object.entries(DB)) {
  for (const item of words) {
    const norm     = normalize(item.w);
    const imgPath  = path.join(BASE, 'assets', cat, norm + '.png');
    if (!fs.existsSync(imgPath)) {
      missing.push({ cat, word: item.w, norm });
    }
  }
}

console.log('Total faltantes:', missing.length);
missing.forEach(m =>
  console.log(`  [${m.cat}]  "${m.word}"  ->  ${m.norm}.png`)
);
