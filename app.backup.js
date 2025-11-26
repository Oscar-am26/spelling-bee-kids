
// Basic PWA install
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js');
  });
}

const el = (id)=>document.getElementById(id);
const levelsBox = el('levels');
const wordLabel = el('wordLabel');
const wordImg = el('wordImage');
const btnNormal = el('btnSpeakNormal');
const btnSpelled = el('btnSpeakSpelled');
const btnReveal = el('btnReveal');
const input = el('answerInput');
const btnCheck = el('btnCheck');
const def = el('definition');
const feedback = el('feedback');
const btnDojo = el('btnDojo');
const btnResetLevel = el('btnResetLevel');
const btnCustomLevels = el('btnCustomLevels');
const btnPrev = el('btnPrev');
const btnNext = el('btnNext');
const autoShowDef = el('autoShowDef');
const btnOpenPicker = el('btnOpenPicker');
const pickSearch = el('pickSearch');
const pickerPanel = el('pickerPanel');
const customBox = el('customBox');
const customLevelName = el('customLevelName');
const customWords = el('customWords');
const btnSaveCustom = el('btnSaveCustom');
const customList = el('customList');
const statusText = el('statusText');
const masteredCount = el('masteredCount');

let data = null;
let currentLevelIdx = 0;
let currentIdx = 0;
let mustHearNormal = false;
let mustHearSpelled = false;

const STORAGE_KEY = 'sb_mastered_v1';
const CUSTOM_KEY = 'sb_custom_levels_v1';
const INDEX_KEY = 'sb_idx_v1';
const LEVEL_KEY = 'sb_level_v1';

function loadMastered() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveMastered(obj) { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }

function loadCustom() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]'); } catch { return []; }
}
function saveCustom(arr) { localStorage.setItem(CUSTOM_KEY, JSON.stringify(arr)); }

function updateMasteredBadge() {
  const m = loadMastered();
  const count = Object.keys(m).length;
  masteredCount.textContent = `⭐ Mastered: ${count}`;
}


async function loadData() {
  // Try network fetch first if running over http(s)
  const isFile = location.protocol === 'file:';
  if (!isFile) {
    try {
      const base = await fetch('data/words.json').then(r=>r.json());
      const customLevels = loadCustom().map(name => ({ name, custom: true, words: [] }));
      data = { levels: [...base.levels, ...customLevels] };
      return;
    } catch (e) {
      console.warn('Fetch failed, falling back to embedded dataset:', e);
    }
  }
  // Fallback to embedded dataset from words.js
  const base = (window.SB_WORDS || {levels:[]});
  const customLevels = loadCustom().map(name => ({ name, custom: true, words: [] }));
  data = { levels: [...base.levels, ...customLevels] };
}


function renderLevels() {
  levelsBox.innerHTML = '';
  data.levels.forEach((lv, i) => {
    const b = document.createElement('button');
    b.textContent = lv.name + (lv.custom ? ' ✨' : '');
    b.className = (i === currentLevelIdx ? 'active' : '');
    b.addEventListener('click', () => { currentLevelIdx = i; currentIdx = 0; pickWord(); renderLevels(); });
    levelsBox.appendChild(b);
  });
}

function speak(text, spell=false) {
  if (!('speechSynthesis' in window)) return;
  if (spell) { speakSpelled(text); return; }
  const u = new SpeechSynthesisUtterance();
  u.text = text;
  u.lang = 'en-US';
  u.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

function speakSpelled(text){
  const letters = (text||'').toUpperCase().split('').filter(ch => /[A-Z]/.test(ch));
  let i = 0;
  const intervalMs = 1200; // ~1.2s por letra (ajustable a 1000–2000ms)
  function sayNext(){
    if (i >= letters.length) return;
    const u = new SpeechSynthesisUtterance();
    u.text = letters[i];
    u.lang = 'en-US';
    u.rate = 0.9; // tono claro
    u.onend = () => { i++; setTimeout(sayNext, 50); };
    window.speechSynthesis.speak(u);
    if (i === 0 && window.speechSynthesis.cancel) {
      // ensure no overlap
    }
  }
  window.speechSynthesis.cancel();
  // Kick off first letter, then schedule spacing using setInterval-like pacing
  (function loop(idx){
    if (idx >= letters.length) return;
    const u = new SpeechSynthesisUtterance();
    u.text = letters[idx];
    u.lang = 'en-US';
    u.rate = 0.9;
    u.onend = () => setTimeout(()=>loop(idx+1), intervalMs - 200); // approx gap
    window.speechSynthesis.speak(u);
  })(0);
}


function pickWord() {
  const lv = data.levels[currentLevelIdx];
  if (!lv || !lv.words || lv.words.length === 0) { 
    wordLabel.textContent = 'No words in this level yet.'; 
    wordImg.src = ''; wordImg.alt='';
    return;
  }
  currentIdx = (currentIdx) % lv.words.length;
  const w = lv.words[currentIdx];
  wordLabel.textContent = 'Listen and spell…';
  def.textContent = '';
  input.value = '';
  feedback.textContent = '';
  feedback.className = 'feedback';
  btnReveal.disabled = true;
  mustHearNormal = true;
  mustHearSpelled = true;
  if (w.image) { wordImg.src = w.image; wordImg.alt = w.word; } else { wordImg.removeAttribute('src'); wordImg.alt=''; }
  $1
  try { sessionStorage.setItem(INDEX_KEY, String(currentIdx)); sessionStorage.setItem(LEVEL_KEY, String(currentLevelIdx)); } catch {}

  if (autoShowDef && autoShowDef.checked) { reveal(); }
}

function reveal() {
  def.style.display='block';
  const lv = data.levels[currentLevelIdx];
  const w = lv.words[currentIdx];
  def.textContent = w.definition || '';
  input.focus();
}

function check() {
  const lv = data.levels[currentLevelIdx];
  const w = lv.words[currentIdx];
  const a = (input.value || '').trim().toLowerCase();
  const target = (w.word || '').trim().toLowerCase();
  if (!a) return;
  if (a === target) {
    feedback.textContent = 'Correct!';
    feedback.className = 'feedback ok';
    ding(); confettiBurst(700, 160);
    // Mark mastered
    const m = loadMastered();
    m[w.word] = true;
    saveMastered(m);
    updateMasteredBadge();
    maybeCelebrate();
    // Next
    currentIdx = (currentIdx + 1) % lv.words.length;
    setTimeout(pickWord, 700);
  } else {
    feedback.textContent = 'Try again';
    feedback.className = 'feedback bad';
    buzz();
  }
}

function ding(){
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = 880; o.type='sine'; g.gain.value=0.0001;
    o.connect(g).connect(ctx.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.2);
    o.stop(ctx.currentTime+0.25);
  } catch {}
}
function buzz(){
  try {
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = 150; o.type='square'; g.gain.value=0.0001;
    o.connect(g).connect(ctx.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime+0.3);
    o.stop(ctx.currentTime+0.32);
  } catch {}
}


function confettiBurst(duration=600, count=120){
  const c = document.createElement('canvas');
  c.width = window.innerWidth; c.height = 300;
  c.style.position='fixed'; c.style.left='0'; c.style.top='0'; c.style.pointerEvents='none'; c.style.zIndex='9999';
  document.body.appendChild(c);
  const ctx = c.getContext('2d');
  const parts = Array.from({length:count}, ()=> ({
    x: Math.random()*c.width,
    y: -20 - Math.random()*80,
    vx: (Math.random()-0.5)*3,
    vy: 2+Math.random()*4,
    s: 2+Math.random()*6
  }));
  let start = performance.now();
  function frame(t){
    ctx.clearRect(0,0,c.width,c.height);
    parts.forEach(p=>{
      p.x += p.vx; p.y += p.vy; p.vy += 0.05;
      ctx.fillRect(p.x, p.y, p.s, p.s);
    });
    if (t - start < duration) requestAnimationFrame(frame);
    else document.body.removeChild(c);
  }
  requestAnimationFrame(frame);
}

function maybeCelebrate(){
  // thresholds for belts
  const thresholds = {White:0, Yellow:10, Orange:20, Green:30, Blue:40, Brown:55, Black:70};
  const count = Object.keys(loadMastered()).length;
  let unlocked = null;
  for (const [belt,need] of Object.entries(thresholds)) {
    if (count===need) unlocked = belt;
  }
  if (unlocked){
    // go to celebration
    window.location.href = `celebration.html?belt=${encodeURIComponent(unlocked)}`;
  }
}

btnNormal.addEventListener('click', ()=>{
  const lv = data.levels[currentLevelIdx]; if(!lv) return;
  const w = lv.words[currentIdx];
  speak(w.word, false);
  mustHearNormal = false;
  if (!mustHearNormal && !mustHearSpelled) btnReveal.disabled = false;
});
btnSpelled.addEventListener('click', ()=>{
  const lv = data.levels[currentLevelIdx]; if(!lv) return;
  const w = lv.words[currentIdx];
  speak(w.word, true);
  mustHearSpelled = false;
  if (!mustHearNormal && !mustHearSpelled) btnReveal.disabled = false;
});
btnReveal.addEventListener('click', reveal);
btnCheck.addEventListener('click', check);
input.addEventListener('keydown', e=>{ if(e.key==='Enter') check(); });

btnDojo.addEventListener('click', ()=>{ window.location.href='dojo.html'; });
btnPrev.addEventListener('click', ()=>{ const lv=data.levels[currentLevelIdx]; if(!lv) return; currentIdx = (currentIdx - 1 + lv.words.length) % lv.words.length; pickWord(); });
btnNext.addEventListener('click', ()=>{ const lv=data.levels[currentLevelIdx]; if(!lv) return; currentIdx = (currentIdx + 1) % lv.words.length; pickWord(); });

btnResetLevel.addEventListener('click', ()=>{
  // reset mastered flags for words in current level
  const lv = data.levels[currentLevelIdx];
  const m = loadMastered();
  lv.words.forEach(w=>{ delete m[w.word]; });
  saveMastered(m);
  updateMasteredBadge();
  pickWord();
});
btnCustomLevels.addEventListener('click', ()=>{
  customBox.hidden = !customBox.hidden;
});

btnSaveCustom.addEventListener('click', ()=>{
  const name = (customLevelName.value||'').trim();
  if(!name) return;
  const lines = (customWords.value||'').split('\n').map(s=>s.trim()).filter(Boolean);
  const arr = loadCustom();
  arr.push(name);
  saveCustom(arr);
  // Persist temporary words in memory to current session by extending data (not persisted fully for brevity)
  const words = lines.map(line=>{
    const [w,d] = line.split('|').map(s=> (s||'').trim());
    return {word:w, definition:d||''};
  });
  data.levels.push({name, custom:true, words});
  renderLevels();
  customLevelName.value=''; customWords.value='';
  renderCustomList();
});


function renderPicker(){
  if (pickerPanel.hidden) return;
  const q = (pickSearch.value||'').trim().toLowerCase();
  const all = data.levels.filter(l=>!l.custom).flatMap(l=> l.words.map(w=>({...w, _level:l.name})));
  const filtered = all.filter(w=> (w.word||'').toLowerCase().includes(q) || (w.definition||'').toLowerCase().includes(q));
  pickerPanel.innerHTML = '';
  const grid = document.createElement('div'); grid.className='picker-grid';
  filtered.forEach((w,i)=>{
    const item = document.createElement('label'); item.className='picker-item';
    item.innerHTML = `
      <input type="checkbox" data-word="${w.word}">
      ${w.image?`<img src="${w.image}" alt="">`:'<div style="width:48px;height:48px"></div>'}
      <div><b>${w.word}</b><small>${w.definition||''}</small><div><small>${w._level}</small></div></div>
    `;
    grid.appendChild(item);
  });
  pickerPanel.appendChild(grid);
  const actions = document.createElement('div'); actions.className='picker-actions';
  const btnUse = document.createElement('button'); btnUse.textContent='Add selected to custom text box';
  btnUse.addEventListener('click', ()=>{
    const checks = pickerPanel.querySelectorAll('input[type=checkbox]:checked');
    const lines = Array.from(checks).map(ch => {
      const lbl = ch.closest('.picker-item'); const word = ch.getAttribute('data-word');
      const defEl = lbl.querySelector('small'); const d = defEl? defEl.textContent : '';
      return `${word} | ${d}`;
    });
    const existing = (customWords.value||'').trim();
    customWords.value = (existing? existing + '\n' : '') + lines.join('\n');
    alert(`${lines.length} words added to the custom level box.`);
  });
  actions.appendChild(btnUse);
  pickerPanel.appendChild(actions);
}
btnOpenPicker.addEventListener('click', ()=>{ pickerPanel.hidden = !pickerPanel.hidden; renderPicker(); });
pickSearch && pickSearch.addEventListener('input', renderPicker);

function renderCustomList(){
  const arr = loadCustom();
  customList.innerHTML = '<h4>Saved Custom Levels</h4>';
  if (arr.length===0){ customList.innerHTML += '<p>(none yet)</p>'; return; }
  const ul = document.createElement('ul');
  arr.forEach(name=>{
    const li = document.createElement('li');
    li.textContent = name;
    ul.appendChild(li);
  });
  customList.appendChild(ul);
}

(async function init(){
  await loadData();
  try { currentLevelIdx = parseInt(sessionStorage.getItem(LEVEL_KEY)||'0'); currentIdx = parseInt(sessionStorage.getItem(INDEX_KEY)||'0'); } catch {}
  updateMasteredBadge();
  renderLevels();
  pickWord();
  renderCustomList();
})();
