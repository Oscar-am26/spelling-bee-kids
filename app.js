// app.js
// Lógica principal del juego Spelling Bee Kids / Bee Pro

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

// --------- UTILIDADES ---------

function speak(text, { rate = 1, pitch = 1 } = {}) {
  const synth = window.speechSynthesis;
  if (!synth) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = rate;
  utter.pitch = pitch;
  synth.cancel();
  synth.speak(utter);
}

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
    "¡Lo hiciste increíble! Cada letra cuenta 🐝",
    "¡Wow! Tu mente y tu corazón están muy fuertes 💪✨",
    "Cada palabra que aprendes te acerca a tus sueños 📚🌟",
    "¡Qué orgullo! Estás construyendo un cerebro campeón 🧠👑"
  ];
  const msgsPro = [
    "Modo Bee Pro desbloqueado: vas volando alto 🐝🔥",
    "Así se entrena un verdadero campeón de Spelling Bee 🏆",
    "Disciplina + práctica = resultados de concurso 💪",
    "Tus futuros concursos te van a agradecer este esfuerzo 🎤✨"
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

  hintTextEl.textContent = entry.definition || "Escucha la palabra y escríbela.";
  feedbackTextEl.textContent = "";
  feedbackTextEl.className = "feedback";
  answerInputEl.value = "";
  answerInputEl.focus();

  // Imagen
  if (entry.image) {
    wordImageContainerEl.classList.remove("hidden");
    wordImageEl.src = `images/${entry.image}`;
    wordImageEl.alt = entry.word;
  } else {
    wordImageContainerEl.classList.add("hidden");
  }

  // Intentos en modo pro
  if (mode === "pro") {
    proAttemptsLeft = 2;
  }

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
  speak(entry.word, { rate: 0.9, pitch: 1 });
});

btnSpellSlow.addEventListener("click", () => {
  const level = filteredLevels[currentLevelIndex];
  const entry = level.words[currentWordIndex];
  if (!entry) return;

  const letters = entry.word.split("").join(", ");
  speak(letters, { rate: 0.7, pitch: 1 });
});

btnCheck.addEventListener("click", () => {
  const level = filteredLevels[currentLevelIndex];
  const entry = level.words[currentWordIndex];
  if (!entry) return;

  const user = (answerInputEl.value || "").trim().toLowerCase();
  const correct = entry.word.trim().toLowerCase();

  if (!user) {
    feedbackTextEl.textContent = "Escribe algo primero 😉";
    feedbackTextEl.className = "feedback error";
    return;
  }

  if (user === correct) {
    feedbackTextEl.textContent = "¡Correcto! ⭐";
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
    feedbackTextEl.textContent = "Aún no, intenta de nuevo 💛";
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
      "Modo actual: Niños (práctica con intentos ilimitados)";
  } else {
    modeKidsBtn.classList.remove("active");
    modeProBtn.classList.add("active");
    modeLabelEl.textContent =
      "Modo actual: Bee Pro (tipo concurso, 2 intentos por palabra)";
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
