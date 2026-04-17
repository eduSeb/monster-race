/* ═══════════════════════════════════════════
   MONSTER RACE — JavaScript (game.js)
   Fonctionnement :
   - Chiffres 0–20 affichés en ordre croissant
   - Web Speech API pour reconnaissance vocale
   - Monstre haut (joueur) avance sur bonne réponse
   - Monstre bas (timer) avance automatiquement
   - Victoire si joueur finit, défaite si timer finit
 ═══════════════════════════════════════════ */

'use strict';

// ──────────────────────────────────────────
// AUDIO ENGINE (Web Audio API)
// ──────────────────────────────────────────
const AudioEngine = {
  ctx: null,

  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  },

  /** Joue une note simple */
  playNote(frequency, duration, type = 'sine', volume = 0.1) {
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },

  /** Son de succès (petit bip joyeux) */
  success() {
    this.playNote(523.25, 0.2, 'sine'); // C5
    setTimeout(() => this.playNote(659.25, 0.3, 'sine'), 100); // E5
  },

  /** Son d'erreur (petit bruit sourd) */
  error() {
    this.playNote(220, 0.3, 'triangle', 0.15); // A3
  },

  /** Mélodie de victoire */
  victory() {
    const notes = [
      { f: 261.63, d: 0.2 }, // C4
      { f: 329.63, d: 0.2 }, // E4
      { f: 392.00, d: 0.2 }, // G4
      { f: 523.25, d: 0.4 }, // C5
      { f: 392.00, d: 0.2 }, // G4
      { f: 523.25, d: 0.8 }, // C5 (final)
    ];

    notes.forEach((n, i) => {
      setTimeout(() => {
        this.playNote(n.f, n.d, 'triangle', 0.1);
      }, i * 200);
    });
  },

  /** Musique de fond (Boucle douce) */
  bgInterval: null,
  musicEnabled: true,

  startBackgroundMusic() {
    if (this.bgInterval || !this.musicEnabled) return;
    this.init();
    
    const melody = [
      261.63, 293.66, 329.63, 392.00, // C4, D4, E4, G4
      329.63, 293.66, 261.63, 196.00  // E4, D4, C4, G3
    ];
    let index = 0;

    this.bgInterval = setInterval(() => {
      if (!this.musicEnabled) return;
      this.playNote(melody[index], 0.8, 'sine', 0.03); // Volume très bas
      index = (index + 1) % melody.length;
    }, 1000);
  },

  stopBackgroundMusic() {
    if (this.bgInterval) {
      clearInterval(this.bgInterval);
      this.bgInterval = null;
    }
  },

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) this.stopBackgroundMusic();
    else this.startBackgroundMusic();
    return this.musicEnabled;
  }
};

// ──────────────────────────────────────────
// CONSTANTES
// ──────────────────────────────────────────
let NUMBERS = Array.from({ length: 21 }, (_, i) => i); // par défaut 0..20
// Vitesse initiale (gérée maintenant par le réglage sur l'écran d'accueil)
const TRACK_LEFT_OFFSET = 5;      // % de départ
const TRACK_RIGHT_OFFSET = 88;    // % d'arrivée (laisse place au drapeau)

// Variantes de prononciation — enrichies pour jeunes enfants (maternelle).
// Les accents sont supprimés par normalize(), inutile de les répéter.
const FR_WORDS = {
   0: ['zero', 'zewo', 'zebo', '0'],
   1: ['un', 'une', 'eun', '1'],
   2: ['deux', 'deu', '2'],
   3: ['trois', 'twa', 'twoi', 'tros', '3'],
   4: ['quatre', 'katr', 'kat', 'catre', 'katre', '4'],
   5: ['cinq', 'sank', 'sink', '5'],
   6: ['six', 'si', 'sis', '6'],
   7: ['sept', 'set', 'sete', '7'],
   8: ['huit', 'wit', 'wuit', 'huite', '8'],
   9: ['neuf', 'nef', '9'],
  10: ['dix', 'dis', '10'],
  11: ['onze', 'onz', '11'],
  12: ['douze', 'douz', '12'],
  13: ['treize', 'trez', 'treze', 'treiz', '13', 'teize'],
  14: ['quatorze', 'katorz', 'catorze', '14'],
  15: ['quinze', 'kenz', 'kinze', '15'],
  16: ['seize', 'sez', 'seiz', 'seze', '16'],
  17: ['dix-sept', 'dix sept', '17'],
  18: ['dix-huit', 'dix huit', '18'],
  19: ['dix-neuf', 'dix neuf', '19'],
  20: ['vingt', 'vin', 'vint', '20'],
  21: ['vingt-et-un', '21'],
  // ... (on garde les nombres longs tels quels)
  21: ['vingt-et-un', 'vingt et un', '21'],
  22: ['vingt-deux', 'vingt deux', '22'],
  23: ['vingt-trois', 'vingt trois', '23'],
  24: ['vingt-quatre', 'vingt quatre', '24'],
  25: ['vingt-cinq', 'vingt cinq', '25'],
  26: ['vingt-six', 'vingt six', '26'],
  27: ['vingt-sept', 'vingt sept', '27'],
  28: ['vingt-huit', 'vingt huit', '28'],
  29: ['vingt-neuf', 'vingt neuf', '29'],
  30: ['trente', 'trent', '30'],
  31: ['trente-et-un', 'trente et un', '31'],
  32: ['trente-deux', '32'],
  33: ['trente-trois', '33'],
  34: ['trente-quatre', '34'],
  35: ['trente-cinq', '35'],
  36: ['trente-six', '36'],
  37: ['trente-sept', '37'],
  38: ['trente-huit', '38'],
  39: ['trente-neuf', '39'],
  40: ['quarante', 'quarant', '40'],
  41: ['quarante-et-un', 'quarante et un', '41'],
  42: ['quarante-deux', '42'],
  43: ['quarante-trois', '43'],
  44: ['quarante-quatre', '44'],
  45: ['quarante-cinq', '45'],
  46: ['quarante-six', '46'],
  47: ['quarante-sept', '47'],
  48: ['quarante-huit', '48'],
  49: ['quarante-neuf', '49'],
  50: ['cinquante', 'cinquant', '50'],
};

// ──────────────────────────────────────────
// SVG MONSTRES (inline)
// ──────────────────────────────────────────
function monsterSVG_A(size = 100) {
  // Monstre vert rigolo — yeux ronds, grandes oreilles
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="62" rx="32" ry="28" fill="#4ADE80"/><ellipse cx="20" cy="44" rx="11" ry="15" fill="#4ADE80"/><ellipse cx="80" cy="44" rx="11" ry="15" fill="#4ADE80"/><ellipse cx="20" cy="44" rx="6" ry="9" fill="#FCA5A5"/><ellipse cx="80" cy="44" rx="6" ry="9" fill="#FCA5A5"/><circle cx="50" cy="44" r="28" fill="#4ADE80"/><circle cx="40" cy="38" r="10" fill="#fff"/><circle cx="60" cy="38" r="10" fill="#fff"/><circle cx="42" cy="39" r="5.5" fill="#1E293B"/><circle cx="62" cy="39" r="5.5" fill="#1E293B"/><path d="M38 52 Q50 63 62 52" fill="none" stroke="#15803D" stroke-width="2.5" stroke-linecap="round"/><rect x="44" y="53" width="5" height="5" rx="1" fill="#fff"/><rect x="51" y="53" width="5" height="5" rx="1" fill="#fff"/><ellipse cx="38" cy="90" rx="10" ry="7" fill="#4ADE80"/><ellipse cx="62" cy="90" rx="10" ry="7" fill="#4ADE80"/><ellipse cx="38" cy="93" rx="12" ry="6" fill="#1D4ED8"/><ellipse cx="62" cy="93" rx="12" ry="6" fill="#1D4ED8"/>
  </svg>`;
}

function monsterSVG_B(size = 100) {
  // Monstre violet moustachu (Timer)
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M34 20 Q28 4 36 12" fill="none" stroke="#C084FC" stroke-width="7" stroke-linecap="round"/><path d="M66 20 Q72 4 64 12" fill="none" stroke="#C084FC" stroke-width="7" stroke-linecap="round"/><ellipse cx="50" cy="62" rx="30" ry="26" fill="#A855F7"/><circle cx="50" cy="43" r="27" fill="#A855F7"/><circle cx="40" cy="37" r="10" fill="#FDE68A"/><circle cx="60" cy="37" r="10" fill="#FDE68A"/><circle cx="41" cy="38" r="5" fill="#1E293B"/><circle cx="61" cy="38" r="5" fill="#1E293B"/><path d="M40 53 Q50 57 60 53" fill="none" stroke="#7E22CE" stroke-width="2.5" stroke-linecap="round"/><path d="M43 58 Q50 66 57 58" fill="none" stroke="#7E22CE" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="38" cy="89" rx="10" ry="7" fill="#A855F7"/><ellipse cx="62" cy="89" rx="10" ry="7" fill="#A855F7"/><ellipse cx="38" cy="93" rx="12" ry="6" fill="#DC2626"/><ellipse cx="62" cy="93" rx="12" ry="6" fill="#DC2626"/>
  </svg>`;
}

function monsterSVG_C(size = 100) {
  // Monstre bleu indigo — cornes et un seul œil
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 15 L50 2 L60 15" fill="#6366F1"/><ellipse cx="50" cy="60" rx="35" ry="30" fill="#6366F1"/><circle cx="50" cy="45" r="15" fill="#fff"/><circle cx="50" cy="45" r="8" fill="#1E293B"/><circle cx="52" cy="43" r="3" fill="#fff"/><path d="M40 70 Q50 80 60 70" fill="none" stroke="#312E81" stroke-width="3" stroke-linecap="round"/><ellipse cx="35" cy="90" rx="12" ry="6" fill="#F43F5E"/><ellipse cx="65" cy="90" rx="12" ry="6" fill="#F43F5E"/>
  </svg>`;
}

function monsterSVG_D(size = 100) {
  // Monstre orange — antennes et dents de lapin
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <line x1="40" y1="20" x2="35" y2="5" stroke="#F59E0B" stroke-width="3"/><circle cx="35" cy="5" r="4" fill="#F59E0B"/><line x1="60" y1="20" x2="65" y2="5" stroke="#F59E0B" stroke-width="3"/><circle cx="65" cy="5" r="4" fill="#F59E0B"/><ellipse cx="50" cy="62" rx="30" ry="28" fill="#F59E0B"/><circle cx="50" cy="45" r="25" fill="#F59E0B"/><circle cx="42" cy="40" r="6" fill="#fff"/><circle cx="58" cy="40" r="6" fill="#fff"/><circle cx="42" cy="40" r="3" fill="#000"/><circle cx="58" cy="40" r="3" fill="#000"/><path d="M42 60 Q50 68 58 60" fill="none" stroke="#92400E" stroke-width="2"/><rect x="46" y="61" width="4" height="6" fill="#fff"/><rect x="51" y="61" width="4" height="6" fill="#fff"/><ellipse cx="38" cy="92" rx="12" ry="6" fill="#10B981"/><ellipse cx="62" cy="92" rx="12" ry="6" fill="#10B981"/>
  </svg>`;
}

function monsterSVG_E(size = 100) {
  // Monstre Dragon d'Or (Légendaire)
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 40 Q5 20 25 30 M80 40 Q95 20 75 30" fill="none" stroke="#FFD700" stroke-width="8" stroke-linecap="round"/><ellipse cx="50" cy="65" rx="35" ry="32" fill="#FFD700"/><circle cx="50" cy="40" r="30" fill="#FFD700"/><circle cx="40" cy="35" r="8" fill="#fff"/><circle cx="60" cy="35" r="8" fill="#fff"/><circle cx="40" cy="35" r="4" fill="#EAB308"/><circle cx="60" cy="35" r="4" fill="#EAB308"/><path d="M40 50 L50 45 L60 50" fill="none" stroke="#B45309" stroke-width="2"/><ellipse cx="30" cy="90" rx="12" ry="8" fill="#B45309"/><ellipse cx="70" cy="90" rx="12" ry="8" fill="#B45309"/><path d="M35 15 L50 2 L65 15" fill="#EF4444"/>
  </svg>`;
}

function getMonsterSVG(type, size) {
  if (type === 'A') return monsterSVG_A(size);
  if (type === 'B') return monsterSVG_B(size);
  if (type === 'C') return monsterSVG_C(size);
  if (type === 'D') return monsterSVG_D(size);
  if (type === 'E') return monsterSVG_E(size);
  return monsterSVG_A(size);
}

// ──────────────────────────────────────────
// ÉTAT DU JEU
// ──────────────────────────────────────────
const state = {
  currentIndex: 0,
  playerPos: 0,
  timerPos: 0,
  timerSpeed: 4500,
  playerMonster: 'A',
  maxNumber: 20,             // nouveau réglage
  isSpeaking: false,         // empêche le micro d'écouter le TTS
  timerHandle: null,
  recognition: null,
  listening: false,
  gameOver: false,
};

// ──────────────────────────────────────────
// RÉFÉRENCES DOM
// ──────────────────────────────────────────
const $$ = id => document.getElementById(id);
const screens = {
  home:  $$('screen-home'),
  game:  $$('screen-game'),
  win:   $$('screen-win'),
  lose:  $$('screen-lose'),
};

// ──────────────────────────────────────────
// NAVIGATION ENTRE ÉCRANS
// ──────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ──────────────────────────────────────────
// INITIALISATION DES MONSTRES (SVG inline)
// ──────────────────────────────────────────
function initMonsterPreviews() {
  // Accueil : vignettes de choix
  const choiceA = $$('choice-A');
  const choiceC = $$('choice-C');
  const choiceD = $$('choice-D');
  const choiceE = $$('choice-E');
  if (choiceA) choiceA.innerHTML = monsterSVG_A(64);
  if (choiceC) choiceC.innerHTML = monsterSVG_C(64);
  if (choiceD) choiceD.innerHTML = monsterSVG_D(64);
  if (choiceE) choiceE.innerHTML = monsterSVG_E(64);

  // Initialiser les monstres sur les écrans
  renderMonstersInGame();
}

function renderMonstersInGame() {
  const monsterPlayer = $$('monster-player');
  const monsterTimer  = $$('monster-timer');
  if (monsterPlayer) monsterPlayer.innerHTML = getMonsterSVG(state.playerMonster, 90);
  if (monsterTimer)  monsterTimer.innerHTML  = monsterSVG_B(90);

  // Victoire / défaite
  const winDisp  = $$('win-monster-display');
  const loseDisp = $$('lose-monster-display');
  if (winDisp)  winDisp.innerHTML  = getMonsterSVG(state.playerMonster, 150);
  if (loseDisp) loseDisp.innerHTML = monsterSVG_B(150);
}

// ──────────────────────────────────────────
// POSITION DES MONSTRES SUR LA PISTE
// ──────────────────────────────────────────
function positionToPercent(pos, total) {
  // pos   : 0..total
  // retourne un % CSS pour `left`
  return TRACK_LEFT_OFFSET + (pos / total) * (TRACK_RIGHT_OFFSET - TRACK_LEFT_OFFSET);
}

function updateMonsterPositions() {
  const total = NUMBERS.length - 1; // 20
  const playerPct = positionToPercent(state.playerPos, total);
  const timerPct  = positionToPercent(state.timerPos, total);

  $$('monster-player').style.left = `${playerPct}%`;
  $$('monster-timer').style.left  = `${timerPct}%`;
}

// ──────────────────────────────────────────
// BANDE DE CHIFFRES
// ──────────────────────────────────────────
let numItems = []; // cache des spans

function buildNumberStrip() {
  const strip = $$('number-strip');
  strip.innerHTML = '';
  numItems = [];
  NUMBERS.forEach(n => {
    const span = document.createElement('span');
    span.className = 'num-item';
    span.textContent = n;
    span.setAttribute('aria-label', `chiffre ${n}`);
    strip.appendChild(span);
    numItems.push(span);
  });
}

function highlightNumber(index) {
  numItems.forEach((el, i) => {
    el.classList.remove('active', 'done');
    if (i < index)  el.classList.add('done');
    if (i === index) el.classList.add('active');
  });
  scrollStripToActive(index);
}

function scrollStripToActive(index) {
  const strip   = $$('number-strip');
  const wrapper = strip.parentElement; // .number-strip-wrapper
  const activeEl = numItems[index];
  if (!activeEl) return;

  // Centre le chiffre actif dans le wrapper
  const wrapperW = wrapper.offsetWidth;
  const itemLeft = activeEl.offsetLeft;
  const itemW    = activeEl.offsetWidth;
  const targetX  = itemLeft + itemW / 2 - wrapperW / 2;

  strip.style.transform = `translateX(${-targetX}px)`;
}

// ──────────────────────────────────────────
// FEEDBACK VISUEL
// ──────────────────────────────────────────
let feedbackTimeout = null;
function showFeedback(type) {
  const el = $$('feedback');
  el.classList.remove('hidden', 'correct', 'wrong', 'show');
  el.textContent = type === 'correct' ? '🎉 Bravo !' : '😬 Essaie encore !';
  el.classList.add(type);
  // Force reflow
  void el.offsetWidth;
  el.classList.add('show');

  if (feedbackTimeout) clearTimeout(feedbackTimeout);
  feedbackTimeout = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.classList.add('hidden'), 300);
  }, 1200);
}

// ──────────────────────────────────────────
// CORRESPONDANCE PHONÉTIQUE (Levenshtein)
// ──────────────────────────────────────────
function normalize(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // supprime les accents
    .replace(/[^a-z0-9\s-]/g, '')
    .trim();
}

/** Distance de Levenshtein entre deux chaînes */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) dp[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      dp[i][j] = b[i-1] === a[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[b.length][a.length];
}

/**
 * Tolérance selon la longueur du mot de référence :
 *  ≤ 2 lettres → correspondance exacte (évite "di" ≈ "dix" et "si")
 *    3–4 lettres → 1 erreur tolérée  (twa→trois, neu→neuf…)
 *    5+  lettres → 2 erreurs tolérées (katre→quatre, treze→treize…)
 */
function fuzzyTol(word) {
  // Stricte rigueur pour les petits chiffres (0-10)
  const isSmallNumber = NUMBERS.indexOf(state.currentIndex) <= 10;
  if (isSmallNumber || word.length <= 3) return 0; 
  if (word.length <= 6) return 1;
  return 2;
}

/**
 * Vérifie si le mot prononcé matche (avec tolérance) l'un des candidats.
 * On compare toujours le MOT PRONONCÉ vs chaque CANDIDAT de référence
 * (et non l'inverse) pour rester dans la tolérance du candidat le plus court.
 */
function fuzzyMatch(spoken, candidates) {
  return candidates.some(c => {
    const cn  = normalize(c);
    const tol = fuzzyTol(cn);
    return levenshtein(spoken, cn) <= tol;
  });
}

// ──────────────────────────────────────────
// VÉRIFIER LA RÉPONSE VOCALE
// ──────────────────────────────────────────
// ──────────────────────────────────────────
// SYNTHÈSE VOCALE (TTS) — BONNE RÉPONSE
// ──────────────────────────────────────────

// Texte à prononcer par chiffre (forme naturelle avec accents)
const FR_SPEECH = {
   0: 'zéro', 1: 'un', 2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq',
   6: 'six', 7: 'sept', 8: 'huit', 9: 'neuf', 10: 'dix',
   11: 'onze', 12: 'douze', 13: 'treize', 14: 'quatorze', 15: 'quinze',
   16: 'seize', 17: 'dix-sept', 18: 'dix-huit', 19: 'dix-neuf', 20: 'vingt',
   21: 'vingt-et-un', 22: 'vingt-deux', 23: 'vingt-trois', 24: 'vingt-quatre', 25: 'vingt-cinq',
   26: 'vingt-six', 27: 'vingt-sept', 28: 'vingt-huit', 29: 'vingt-neuf', 30: 'trente',
   31: 'trente-et-un', 32: 'trente-deux', 33: 'trente-trois', 34: 'trente-quatre', 35: 'trente-cinq',
   36: 'trente-six', 37: 'trente-sept', 38: 'trente-huit', 39: 'trente-neuf', 40: 'quarante',
   41: 'quarante-et-un', 42: 'quarante-deux', 43: 'quarante-trois', 44: 'quarante-quatre', 45: 'quarante-cinq',
   46: 'quarante-six', 47: 'quarante-sept', 48: 'quarante-huit', 49: 'quarante-neuf', 50: 'cinquante',
};

let ttsVoice = null; // voix française mise en cache

/** Sélectionne la meilleure voix française disponible */
function pickFrVoice() {
  if (ttsVoice) return ttsVoice;
  const voices = speechSynthesis.getVoices();
  // Priorité : fr-FR, sinon fr-*, sinon première dispo
  ttsVoice = voices.find(v => v.lang === 'fr-FR')
          || voices.find(v => v.lang.startsWith('fr'))
          || voices[0]
          || null;
  return ttsVoice;
}

/**
 * Prononce le chiffre à voix haute.
 * Pendant la synthèse, on arrête la reconnaissance pour éviter
 * que le micro capte la voix de la machine comme réponse.
 */
function speakNumber(number) {
  if (!window.speechSynthesis) return;

  state.isSpeaking = true; // Signale qu'on parle
  speechSynthesis.cancel(); // annuler toute parole en cours

  const text = FR_SPEECH[number] ?? String(number);
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang  = 'fr-FR';
  utter.rate  = 0.82;
  utter.pitch = 1.1;
  utter.voice = pickFrVoice();

  const finished = () => {
    // Petit délai pour éviter de capter la fin de l'écho
    setTimeout(() => { state.isSpeaking = false; }, 400);
  };

  utter.onend = finished;
  utter.onerror = finished;

  speechSynthesis.speak(utter);
}

// Charger les voix dès que le navigateur les a listées
if (window.speechSynthesis) {
  speechSynthesis.onvoiceschanged = () => { ttsVoice = null; pickFrVoice(); };
}

// ──────────────────────────────────────────
// VÉRIFIER LA RÉPONSE VOCALE
// ──────────────────────────────────────────
function checkAnswer(transcript) {
  const expected  = state.currentIndex;
  const wordList  = FR_WORDS[expected] || [];
  const normFull  = normalize(transcript);

  // 1. Transcription complète ≈ l'un des candidats
  const fullMatch = fuzzyMatch(normFull, wordList);

  // 2. Chaque mot individuel ≈ l'un des candidats
  const spokenTokens = normFull.split(/[\s-]+/).filter(Boolean);
  const tokenMatch   = spokenTokens.some(tok => fuzzyMatch(tok, wordList));

  const isCorrect = fullMatch || tokenMatch;
  console.log(`[check] attendu="${FR_SPEECH[expected]}" transcrit="${normFull}" → ${isCorrect ? '✅' : '❌'}`);

  if (isCorrect) {
    AudioEngine.success(); // 🎉 Son de succès
    showFeedback('correct');
    state.playerPos++;
    updateMonsterPositions();
    checkWin();
    if (!state.gameOver) {
      state.currentIndex++;
      if (state.currentIndex < NUMBERS.length) {
        setTimeout(() => highlightNumber(state.currentIndex), 400);
      }
    }
  } else {
    AudioEngine.error(); // 😕 Son d'erreur
    showFeedback('wrong');
    // Après 700 ms (le feedback s'affiche), prononcer la bonne réponse
    setTimeout(() => {
      if (!state.gameOver) speakNumber(expected);
    }, 700);
  }
}

// ──────────────────────────────────────────
// TIMER
// ──────────────────────────────────────────
function startTimer() {
  if (state.timerHandle) clearInterval(state.timerHandle);
  
  // Utilise la vitesse définie dans les réglages
  state.timerHandle = setInterval(() => {
    if (state.gameOver) return;
    state.timerPos++;
    updateMonsterPositions();
    
    // Animation secousse monstre timer
    const mt = $$('monster-timer');
    if (mt) {
      mt.style.animation = 'none';
      void mt.offsetWidth;
      mt.style.animation = 'bounce-idle .3s ease';
    }
    checkLose();
  }, state.timerSpeed);
}

function stopTimer() {
  if (state.timerHandle) {
    clearInterval(state.timerHandle);
    state.timerHandle = null;
  }
}

// ──────────────────────────────────────────
// CONDITIONS DE FIN
// ──────────────────────────────────────────
function checkWin() {
  // Le joueur a répondu à tous les chiffres
  if (state.playerPos >= NUMBERS.length) {
    endGame('win');
  }
}

function checkLose() {
  // Le timer a atteint la fin
  if (state.timerPos >= NUMBERS.length) {
    endGame('lose');
  }
}

function endGame(result) {
  if (state.gameOver) return;
  state.gameOver = true;
  stopTimer();
  stopListening();

  setTimeout(() => {
    if (result === 'win') {
      AudioEngine.victory(); // 🏆 MÉLODIE DE VICTOIRE
      
      // Débloquer le niveau spécial si on vient de finir le niveau 0-20
      if (state.maxNumber === 20) {
        localStorage.setItem('monster_master_unlocked', 'true');
        checkSecretUnlock();
      }

      // Débloquer le monstre spécial si on vient de finir le Master Level (50)
      if (state.maxNumber === 50) {
        localStorage.setItem('monster_legendary_unlocked', 'true');
        checkSecretUnlock();
      }

      launchConfetti();
      showScreen('win');
    } else {
      showScreen('lose');
    }
  }, 600);
}

// ──────────────────────────────────────────
// CONFETTIS
// ──────────────────────────────────────────
const CONFETTI_COLORS = ['#FF3E6C','#FFD600','#43E97B','#38F9D7','#A855F7','#FF8C42','#60A5FA'];
function launchConfetti() {
  const container = $$('confetti-container');
  container.innerHTML = '';
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]};
      width: ${8 + Math.random() * 10}px;
      height: ${8 + Math.random() * 12}px;
      animation-duration: ${2 + Math.random() * 2.5}s;
      animation-delay: ${Math.random() * 1.5}s;
    `;
    container.appendChild(piece);
  }
}

// ──────────────────────────────────────────
// WEB SPEECH API — RECONNAISSANCE VOCALE
// ──────────────────────────────────────────
let recognition = null;
let micPermissionGranted = false;

/**
 * Demande la permission micro UNE SEULE FOIS via getUserMedia,
 * puis initialise la reconnaissance vocale en mode continu.
 * En mode continu, le navigateur ne redemande plus la permission.
 */
async function initSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn('Web Speech API non supportée.');
    // Mode fallback : clic = bonne réponse
    $$('btn-mic').addEventListener('click', () => {
      if (!state.gameOver) checkAnswer(NUMBERS[state.currentIndex].toString());
    });
    const label = $$('btn-mic').querySelector('.mic-label');
    if (label) label.textContent = 'Cliquer !';
    return;
  }

  // — Demander la permission micro une seule fois au chargement —
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    micPermissionGranted = true;
  } catch (err) {
    console.warn('Permission micro refusée :', err);
    micPermissionGranted = false;
    return;
  }

  // — Créer la reconnaissance en mode CONTINU —
  // continuous = true : la session reste ouverte indéfiniment,
  // pas de stop/start en boucle → plus de popup de permission.
  recognition = new SpeechRecognition();
  recognition.lang            = 'fr-FR';
  recognition.continuous      = true;   // ← clé du correctif
  recognition.interimResults  = false;
  recognition.maxAlternatives = 3;

  recognition.onstart = () => {
    state.listening = true;
    $$('btn-mic').classList.add('listening');
    $$('listening-indicator').classList.remove('hidden');
  };

  // onend : en mode continu, ne se déclenche que sur arrêt forcé
  recognition.onend = () => {
    state.listening = false;
    $$('btn-mic').classList.remove('listening');
    $$('listening-indicator').classList.add('hidden');
    // Ne relancer que si le jeu tourne encore et qu'on n'a pas perdu la permission
    if (!state.gameOver && micPermissionGranted) {
      setTimeout(() => startListening(), 400);
    }
  };

  recognition.onerror = (e) => {
    console.warn('Speech error :', e.error);
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      micPermissionGranted = false; // ne pas relancer si refusé
      state.listening = false;
      $$('btn-mic').classList.remove('listening');
      $$('listening-indicator').classList.add('hidden');
    }
    // Pour 'no-speech' ou 'audio-capture', on laisse onend gérer le redémarrage
  };

  // Chaque résultat reçu : vérifier la réponse
  recognition.onresult = (event) => {
    // Si la machine est en train de parler, on ignore le micro pour éviter les boucles
    if (state.isSpeaking) return;

    const idx = event.resultIndex;
    const result = event.results[idx];

    // Vérifier la confiance globale de la transcription
    if (result[0].confidence < 0.25) {
      console.log('Confiance trop faible, ignoré.');
      return;
    }

    const transcripts = [];
    for (let i = 0; i < result.length; i++) {
      transcripts.push(result[i].transcript);
    }
    const transcript = transcripts.join(' ');
    console.log('Transcrit :', transcript);
    checkAnswer(transcript);
  };
}

function startListening() {
  if (!recognition || state.listening || state.gameOver || !micPermissionGranted) return;
  try { recognition.start(); } catch(e) { /* déjà démarré */ }
}

function stopListening() {
  if (!recognition) return;
  try { recognition.stop(); } catch(e) {}
  state.listening = false;
  $$('btn-mic').classList.remove('listening');
  $$('listening-indicator').classList.add('hidden');
}

// ──────────────────────────────────────────
// DÉMARRER UNE PARTIE
// ──────────────────────────────────────────
function startGame() {
  // Préparer les chiffres selon le niveau choisi
  NUMBERS = Array.from({ length: state.maxNumber + 1 }, (_, i) => i);

  // Réinitialiser état
  state.currentIndex = 0;
  state.playerPos = 0;
  state.timerPos = 0;
  state.gameOver = false;

  // Construire la bande de chiffres
  buildNumberStrip();

  // Réinitialiser positions monstres
  $$('monster-player').style.transition = 'none';
  $$('monster-timer').style.transition  = 'none';
  updateMonsterPositions();
  requestAnimationFrame(() => {
    $$('monster-player').style.transition = '';
    $$('monster-timer').style.transition  = '';
  });

  // Mettre en évidence le 1er chiffre (après rendu)
  showScreen('game');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => highlightNumber(0));
  });

  // Démarrer timer & micro
  setTimeout(() => {
    startTimer();
    startListening();
  }, 800);
}

// ──────────────────────────────────────────
// BOUTONS
// ──────────────────────────────────────────
function setupButtons() {
  // Démarrer la musique au premier clic n'importe où (contrainte navigateur)
  document.body.addEventListener('click', () => {
    AudioEngine.startBackgroundMusic();
  }, { once: true });

  $$('btn-start').addEventListener('click', () => {
    AudioEngine.stopBackgroundMusic();
    startGame();
  });

  // Bouton Musique (optionnel si on l'ajoute plus tard)
  const btnMusic = $$('btn-music');
  if (btnMusic) {
    btnMusic.addEventListener('click', () => {
      const isON = AudioEngine.toggleMusic();
      btnMusic.textContent = isON ? '🎵' : '🔇';
    });
  }

  // Vérifier si le niveau secret est déjà débloqué
  checkSecretUnlock();

  // Sélection du niveau
  const levelBtns = document.querySelectorAll('.level-btn');
  levelBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      levelBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.maxNumber = parseInt(btn.dataset.max);
    });
  });

  // Sélection du monstre
  const choices = document.querySelectorAll('.monster-choice');
  choices.forEach(choice => {
    choice.addEventListener('click', () => {
      choices.forEach(c => c.classList.remove('active'));
      choice.classList.add('active');
      state.playerMonster = choice.dataset.monster;
      renderMonstersInGame();
    });
  });

  // Réglage de la vitesse
  const speedInput = $$('input-speed');
  if (speedInput) {
    state.timerSpeed = parseInt(speedInput.value);
    speedInput.addEventListener('input', (e) => {
      state.timerSpeed = parseInt(e.target.value);
    });
  }

  $$('btn-mic').addEventListener('click', () => {
    if (state.listening) return; // déjà actif
    startListening();
  });

  $$('btn-back').addEventListener('click', () => {
    stopTimer();
    stopListening();
    state.gameOver = true;
    showScreen('home');
    AudioEngine.startBackgroundMusic(); // Relancer la musique au retour
  });

  $$('btn-replay').addEventListener('click', () => startGame());
  $$('btn-retry').addEventListener('click', () => startGame());
}

/** Vérifie localStorage pour afficher le bouton secret et le personnage secret */
function checkSecretUnlock() {
  // Niveau Master
  const masterUnlocked = localStorage.getItem('monster_master_unlocked') === 'true';
  const secretBtn = $$('level-btn-secret');
  if (masterUnlocked && secretBtn) {
    secretBtn.classList.remove('hidden');
  }

  // Monstre Légendaire
  const monsterUnlocked = localStorage.getItem('monster_legendary_unlocked') === 'true';
  const choiceE = $$('choice-E');
  if (monsterUnlocked && choiceE) {
    choiceE.classList.remove('hidden');
  }
}

// ──────────────────────────────────────────
// POINT D'ENTRÉE
// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMonsterPreviews();
  initSpeech();
  setupButtons();
  showScreen('home');
});
