const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const cats = ['certification','science','content'];
const norm = w => w.toLowerCase().replace(/-/g,'_').replace(/ /g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'');

let missing = [];
cats.forEach(cat => {
  const catRx = new RegExp('"' + cat + '"\\s*:\\s*\\[[\\s\\S]*?\\]\\s*[,}]');
  const block = html.match(catRx);
  if (!block) { console.log('no block for', cat); return; }
  const words = [...block[0].matchAll(/"w":\s*"([^"]+)"/g)].map(m => m[1]);
  words.forEach(w => {
    const n = norm(w);
    if (!fs.existsSync('assets/' + cat + '/' + n + '.png')) {
      missing.push({cat, word: w, file: n + '.png'});
    }
  });
});
console.log('Missing:', missing.length);
missing.forEach(m => console.log('[' + m.cat + ']', JSON.stringify(m.word), '->', m.file));
