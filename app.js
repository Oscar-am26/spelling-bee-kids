// app.js
// Lógica principal del juego Spelling Bee Kids / Bee Pro
// Ahora con voz femenina, definición en audio y soporte para carpeta img/

// --------- ESTADO GLOBAL ---------
let allLevels = [];
let filteredLevels = [];
let currentCategory = "Certification";
let currentLevelIndex = null;
let currentWordIndex = 0;

let mode = "kids"; // "kids" | "pro"
let stats = {
  stars: 0,
  correctInLevel: 0,
  totalInLevel: 0
};

let proAttemptsLeft = 2;
let deferredPrompt = null;

// Voz seleccionada (femenina si está disponible)
let selectedVoice = null;

// --------- SELECTORES ---------
const levelsListEl = document.getElementById("levelsList");
const levelNameEl = document.getElementById("levelName");
const hintTextEl = document.getElementById("hintText");
const wordImageContainerEl = document.getElementById("wordImageContainer");
const wordImageEl = document.getElementById("wordImage");
const answerInputEl = document.getElementById("answerInput");
const feedbackTextEl = document.getElementById("feedbackText");
const starsCountEl = document.getElementById("starsCount");
const correctCountEl = document.getElementById("correctCount");
const totalCountEl = document.getElementById("totalCount");
const modeLabelEl = document.getElementById("modeLabel");

const btnHearWord = document.getElementById("btnHearWord");
const btnSpellSlow = document.getElementById("btnSpellSlow");
const btnCheck = document.getElementById("btnCheck");
const btnSkip = document.getElementById("btnSkip");

const tabs = document.querySelectorAll(".tab-btn");
const modeKidsBtn = document.getElementById("modeKidsBtn");
const modeProBtn = document.getElementById("modeProBtn");

const levelModal = document.getElementById("levelModal");
const modalMessage = document.getElementById("modalMessage");
const btnNextLevel = document.getElementById("btnNextLevel");
const btnCloseModal = document.getElementById("btnCloseModal");

const installBtn = document.getElementById("installBtn");

// --------- VOZ FEMENINA ---------

function pickFemaleVoice(voices) {
  // Intentar encontrar una voz femenina en inglés
  const byName = voices.find((v) =>
    /female|woman|Samantha|Google US English Female/i.test(v.name)
  );
  if (byName) return byName;

  // Si no hay coincidencia clara, tomar cualquier en-US
  const en = voices.find((v) => v.lang === "en-US");
  if (en) return en;

  // Último recurso: la primera voz disponible
  return voices[0] || null;
}

function initVoices() {
  if (!("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  if (!voices || !voices.length) return;
  selectedVoice = pickFemaleVoice(voices);
}

if ("speechSynthesis" in window) {
  initVoices();
  window.speechSynthesis.onvoiceschanged = initVoices;
}

function speak(text, { rate = 1, pitch = 1 } = {}) {
  if (!("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(text);

  if (selectedVoice) {
    utter.voice = selectedVoice;
  }
  utter.lang = "en-US";
  utter.rate = rate;
  utter.pitch = pitch;

  synth.cancel();
  synth.speak(utter);
}

function speakDefinition(entry) {
  if (!entry) return;
  let def = (entry.definition || "").trim();
  if (!def) {
    // Mensaje de apoyo si no hay definición escrita
    def = `Listen carefully to the word ${entry.word} in a sentence and try to imagine it.`;
  }
  // Definición en audio, un poquito más cálida
  speak(def, { rate: 0.95, pitch: 1.1 });
}

// --------- UTILIDADES ---------

function getStorageKey(levelName) {
  return `spelling_progress_${mode}_${levelName}`;
}

function saveLevelProgress(level, data) {
  const key = getStorageKey(level.name);
  localStorage.setItem(key, JSON.stringify(data));
}

function loadLevelProgress(level) {
  const key = getStorageKey(level.name);
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getLevelStatus(level) {
  // done / current / locked según progreso
  const progressKids = JSON.parse(
    localStorage.getItem(`spelling_progress_kids_${level.name}`) || "null"
  );
  const progressPro = JSON.parse(
    localStorage.getItem(`spelling_progress_pro_${level.name}`) || "null"
  );

  const anyProgress = progressKids || progressPro;

  if (anyProgress && anyProgress.completed) return "done";
  if (anyProgress && !anyProgress.completed) return "current";
  return "locked";
}

function motivationalMessage() {
  const msgsKids = [
    "¡Lo hiciste increíble! Cada letra que practicas, fortalece tu cerebro. 🧠✨",
    "¡Wow! Estás construyendo una relación hermosa con el inglés. 💛",
    "Cada palabra que aprendes te acerca a tus sueños. 📚🌟",
    "Estoy orgullosa de ti, sigues avanzando, paso a pasito. 🐝"
  ];
  const msgsPro = [
    "Modo Bee Pro: estás entrenando como un verdadero campeón. 🏆",
    "Tu disciplina hoy será tu seguridad en los concursos. 💪",
    "Estás volando alto, como una abejita experta. 🐝🔥",
    "Cada nivel que completas es experiencia para tus futuros retos. 🎤"
  ];

  const list = mode === "kids" ? msgsKids : msgsPro;
  return list[Math.floor(Math.random() * list.length)];
}

// --------- CARGA DE DATOS ---------

async function loadWords() {
  try {
    const res = await fetch("data/words.json");
    const data = await res.json();
    allLevels = data.levels || [];
    filterLevelsByCategory();
    renderLevelsList();
  } catch (err) {
    console.error("Error cargando words.json", err);
    hintTextEl.textContent =
      "Hubo un problema al cargar las palabras. Revisa que data/words.json exista.";
  }
}

function filterLevelsByCategory() {
  filteredLevels = allLevels.filter(
    (lvl) => lvl.category && lvl.category.startsWith(currentCategory)
  );
}

// --------- RENDER NIVEL ---------

function renderLevelsList() {
  levelsListEl.innerHTML = "";

  filteredLevels.forEach((level, index) => {
    const status = getLevelStatus(level);
    const li = document.createElement("div");
    li.className = "level-item";
    li.dataset.index = index;

    const nameEl = document.createElement("div");
    nameEl.className = "level-name";
    nameEl.textContent = level.name;

    const statusEl = document.createElement("div");
    statusEl.className = "level-status";

    const badge = document.createElement("span");
    badge.classList.add("badge");

    if (status === "done") {
      badge.classList.add("badge-done");
      badge.textContent = "✔ Completado";
    } else if (status === "current") {
      badge.classList.add("badge-current");
      badge.textContent = "▶ En curso";
    } else {
      badge.classList.add("badge-locked");
      badge.textContent = "• Sin empezar";
    }

    statusEl.appendChild(badge);

    li.appendChild(nameEl);
    li.appendChild(statusEl);

    li.addEventListener("click", () => {
      document
        .querySelectorAll(".level-item")
        .forEach((el) => el.classList.remove("active"));
      li.classList.add("active");
      selectLevel(index);
    });

    levelsListEl.appendChild(li);
  });
}

function selectLevel(index) {
  currentLevelIndex = index;
  currentWordIndex = 0;
  feedbackTextEl.textContent = "";
  feedbackTextEl.className = "feedback";
  answerInputEl.value = "";

  const level = filteredLevels[currentLevelIndex];
  levelNameEl.textContent = level.name;

  // cargar progreso si existe
  const progress = loadLevelProgress(level);
  if (progress) {
    currentWordIndex = Math.min(
      progress.currentWordIndex || 0,
      level.words.length - 1
    );
    stats.stars = progress.stars || 0;
    stats.correctInLevel = progress.correctInLevel || 0;
  } else {
    stats.stars = 0;
    stats.correctInLevel = 0;
  }
  stats.totalInLevel = level.words.length;

  updateStatsUI();
  enableGameControls(true);
  showCurrentWord();
}

function updateStatsUI() {
  starsCountEl.textContent = stats.stars;
  correctCountEl.textContent = stats.correctInLevel;
  totalCountEl.textContent = stats.totalInLevel;
}

function enableGameControls(enabled) {
  answerInputEl.disabled = !enabled;
  btnHearWord.disabled = !enabled;
  btnSpellSlow.disabled = !enabled;
  btnCheck.disabled = !enabled;
  btnSkip.disabled = !enabled;
}

// --------- MOSTRAR PALABRA ---------

function showCurrentWord() {
  const level = filteredLevels[currentLevelIndex];
  const entry = level.words[currentWordIndex];

  if (!entry) return;

  // Ya no mostramos la definición escrita; solo un mensajito neutro
  hintTextEl.textContent =
    "Escucha la explicación y la palabra, luego escribe lo que escuches.";

  feedbackTextEl.textContent = "";
  feedbackTextEl.className = "feedback";
  answerInputEl.value = "";
  answerInputEl.focus();

  // Imagen desde carpeta img/ y se oculta si no carga
  if (entry.image) {
    wordImageContainerEl.classList.remove("hidden");
    wordImageEl.onerror = () => {
      // Si no existe la imagen, ocultamos el recuadro
      wordImageContainerEl.classList.add("hidden");
    };
    wordImageEl.src = `img/${entry.image}`;
    wordImageEl.alt = entry.word;
  } else {
    wordImageContainerEl.classList.add("hidden");
  }

  // Intentos en modo pro
  if (mode === "pro") {
    proAttemptsLeft = 2;
  }

  // Reproducimos la definición / frase de contexto en audio
  speakDefinition(entry);

  saveLevelProgress(level, {
    currentWordIndex,
    stars: stats.stars,
    correctInLevel: stats.correctInLevel,
    completed: false
  });
}

// --------- EVENTOS DE JUEGO ---------

btnHearWord.addEventListener("click", () => {
  const level = filteredLevels[currentLevelIndex];
  const entry = level.words[currentWordIndex];
  if (!entry) return;
  speak(entry.word, { rate: 0.9, pitch: 1.05 });
});

btnSpellSlow.addEventListener("click", () => {
  const level = filteredLevels[currentLevelIndex];
  const entry = level.words[currentWordIndex];
  if (!entry) return;

  const letters = entry.word.split("").join(", ");
  speak(letters, { rate: 0.7, pitch: 1.05 });
});

btnCheck.addEventListener("click", () => {
  const level = filteredLevels[currentLevelIndex];
  const entry = level.words[currentWordIndex];
  if (!entry) return;

  const user = (answerInputEl.value || "").trim().toLowerCase();
  const correct = entry.word.trim().toLowerCase();

  if (!user) {
    feedbackTextEl.textContent = "Escribe algo primero, corazón 😉";
    feedbackTextEl.className = "feedback error";
    return;
  }

  if (user === correct) {
    feedbackTextEl.textContent =
      "¡Muy bien, corazón! 🌟 Lo estás haciendo increíble.";
    feedbackTextEl.className = "feedback ok";
    stats.correctInLevel += 1;

    // estrellas: 1 estrella cada 3 aciertos
    if (stats.correctInLevel % 3 === 0) {
      stats.stars += 1;
      speak("Great job!", { rate: 1, pitch: 1.2 });
    }

    updateStatsUI();
    goToNextWordOrFinish();
  } else {
    feedbackTextEl.textContent =
      "Todavía no coincide, intenta otra vez, estoy contigo 💛";
    feedbackTextEl.className = "feedback error";

    if (mode === "pro") {
      proAttemptsLeft -= 1;
      if (proAttemptsLeft <= 0) {
        feedbackTextEl.textContent =
          "Respuesta incorrecta. Pasamos a la siguiente palabra.";
        goToNextWordOrFinish(false);
      }
    }
  }

  const progress = {
    currentWordIndex,
    stars: stats.stars,
    correctInLevel: stats.correctInLevel,
    completed: false
  };
  saveLevelProgress(level, progress);
});

btnSkip.addEventListener("click", () => {
  goToNextWordOrFinish(false);
});

function goToNextWordOrFinish(addStarIfPerfect = true) {
  const level = filteredLevels[currentLevelIndex];

  if (currentWordIndex < level.words.length - 1) {
    currentWordIndex += 1;
    showCurrentWord();
  } else {
    // FIN DE NIVEL
    const completed = true;

    // Bonus por nivel perfecto en modo Pro
    if (mode === "pro" && addStarIfPerfect) {
      stats.stars += 2;
    }

    saveLevelProgress(level, {
      currentWordIndex: level.words.length - 1,
      stars: stats.stars,
      correctInLevel: stats.correctInLevel,
      completed
    });

    updateStatsUI();
    showLevelCompletedModal();
    renderLevelsList(); // refrescar badges
  }
}

function showLevelCompletedModal() {
  modalMessage.textContent = motivationalMessage();
  levelModal.classList.remove("hidden");
}

// --------- CAMBIAR MODO (KIDS / PRO) ---------

function setMode(newMode) {
  mode = newMode;

  if (mode === "kids") {
    modeKidsBtn.classList.add("active");
    modeProBtn.classList.remove("active");
    modeLabelEl.textContent =
      "Modo Niños 🌟 Practica sin presión, aprende a tu ritmo.";
  } else {
    modeKidsBtn.classList.remove("active");
    modeProBtn.classList.add("active");
    modeLabelEl.textContent =
      "Modo Bee Pro 🐝 Entrenamiento tipo concurso (2 intentos por palabra).";
  }

  // al cambiar de modo, se vuelve a cargar estado del nivel actual (si lo hay)
  if (currentLevelIndex !== null) {
    selectLevel(currentLevelIndex);
  } else {
    renderLevelsList();
  }
}

modeKidsBtn.addEventListener("click", () => setMode("kids"));
modeProBtn.addEventListener("click", () => setMode("pro"));

// --------- TABS DE CATEGORÍA ---------

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentCategory = tab.dataset.category;
    filterLevelsByCategory();
    currentLevelIndex = null;
    levelNameEl.textContent = "Selecciona un nivel";
    hintTextEl.textContent =
      "Elige una categoría y después un nivel para comenzar.";
    enableGameControls(false);
    renderLevelsList();
  });
});

// --------- MODAL ---------

btnCloseModal.addEventListener("click", () => {
  levelModal.classList.add("hidden");
});

btnNextLevel.addEventListener("click", () => {
  levelModal.classList.add("hidden");
  if (currentLevelIndex !== null && currentLevelIndex < filteredLevels.length - 1) {
    selectLevel(currentLevelIndex + 1);
    document
      .querySelectorAll(".level-item")
      [currentLevelIndex + 1].classList.add("active");
  }
});

// --------- PWA: INSTALL PROMPT ---------

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.classList.remove("hidden");
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  if (choice.outcome === "accepted") {
    installBtn.classList.add("hidden");
  }
  deferredPrompt = null;
});

// --------- INIT ---------

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(console.error);
}

loadWords();
