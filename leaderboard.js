// =====================================================================
//  LEADERBOARD
//  The top 10 scores for each single-player mode, saved in Firebase's
//  Firestore database. Players enter 3 initials, arcade style.
//
//    1. SETTINGS
//    2. TALKING TO FIRESTORE
//    3. SCREENS        the HTML panel drawn on top of the game
//
//  Each mode has its own list in the database: scores_easy and
//  scores_medium. To give a new mode a leaderboard, add it to
//  BOARD_MODES below AND add a matching block to the Firestore rules.
// =====================================================================


// =====================================================================
//  1. SETTINGS
// =====================================================================

const BOARD_MODES = ['easy', 'medium'];
const BOARD_SIZE = 10;

// Initials we don't allow.
const BAD_INITIALS = ['ASS', 'FUK', 'FUC', 'FCK', 'FKU', 'SEX', 'FAG', 'KKK', 'CUM', 'TIT', 'DIK', 'DIC', 'NIG', 'NGR',
  'SHT', 'SHI', 'POO', 'PEE', 'WTF', 'STFU', 'GAY', 'JIZ', 'COK', 'KUM', 'XXX', 'HOE', 'FKN', 'FKU', 'NAZ', 'PIS', 'VAG'];


// =====================================================================
//  2. TALKING TO FIRESTORE
// =====================================================================

let firestoreDb = null;

function leaderboardAvailable() {
  return typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG !== null
    && typeof firebase !== 'undefined' && typeof firebase.firestore === 'function';
}

function scoresFor(mode) {
  if (!firestoreDb) {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    firestoreDb = firebase.firestore();
  }
  return firestoreDb.collection('scores_' + mode);
}

// The top scores for a mode, best first: [{ name, score }, ...]
async function topScores(mode) {
  const snap = await scoresFor(mode).orderBy('score', 'desc').limit(BOARD_SIZE).get();
  return snap.docs.map(doc => doc.data());
}

// Would this score get onto the board?
async function makesTheBoard(mode, score) {
  if (!BOARD_MODES.includes(mode) || score < 1) return false;
  const top = await topScores(mode);
  return top.length < BOARD_SIZE || score > top[top.length - 1].score;
}

async function saveScore(mode, name, score) {
  await scoresFor(mode).add({ name, score, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
}


// =====================================================================
//  3. SCREENS
// =====================================================================

const Board = {
  el: id => document.getElementById(id),
  mode: 'easy',

  // Show the top 10 for a mode. highlight = { name, score } to light up a new entry.
  async show(mode, highlight) {
    this.mode = mode;
    this.el('board').hidden = false;
    this.el('initials-form').hidden = true;
    this.el('board-list-wrap').hidden = false;
    document.querySelectorAll('#board-tabs button').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    const list = this.el('board-list');
    list.innerHTML = '<li class="note">Loading...</li>';
    try {
      const top = await topScores(mode);
      list.innerHTML = '';
      if (top.length === 0) list.innerHTML = '<li class="note">No scores yet. Be the first!</li>';
      let lit = false;
      top.forEach((entry, i) => {
        const li = document.createElement('li');
        li.textContent = (i + 1 + '.').padEnd(4) + entry.name + '  ' + entry.score;
        if (highlight && !lit && entry.name === highlight.name && entry.score === highlight.score) {
          li.className = 'mine';
          lit = true;
        }
        list.append(li);
      });
    } catch (e) {
      list.innerHTML = '<li class="note">Couldn\'t load the leaderboard. Check your connection.</li>';
    }
  },

  // Ask for initials, save the score, then show the board.
  askInitials(mode, score) {
    this.mode = mode;
    this.el('board').hidden = false;
    this.el('initials-form').hidden = false;
    this.el('board-list-wrap').hidden = true;
    this.el('initials-score').textContent = score;
    this.el('initials-error').textContent = '';
    const input = this.el('initials-input');
    input.value = loadInitials();
    input.focus();
    this.pendingScore = score;
  },

  async submitInitials() {
    const name = this.el('initials-input').value.toUpperCase().replace(/[^A-Z]/g, '');
    if (name.length !== 3) {
      this.el('initials-error').textContent = 'Use exactly 3 letters.';
      return;
    }
    if (BAD_INITIALS.includes(name)) {
      this.el('initials-error').textContent = 'Pick different initials.';
      return;
    }
    saveInitials(name);
    this.el('initials-save').disabled = true;
    try {
      await saveScore(this.mode, name, this.pendingScore);
      this.show(this.mode, { name, score: this.pendingScore });
    } catch (e) {
      this.el('initials-error').textContent = 'Couldn\'t save. Check your connection and try again.';
    }
    this.el('initials-save').disabled = false;
  },

  hide() {
    this.el('board').hidden = true;
  },

  isOpen() {
    return !this.el('board').hidden;
  },
};

function loadInitials() {
  try { return localStorage.getItem('snakeInitials') || ''; } catch (e) { return ''; }
}
function saveInitials(name) {
  try { localStorage.setItem('snakeInitials', name); } catch (e) { }
}

window.addEventListener('DOMContentLoaded', () => {
  const el = id => document.getElementById(id);
  BOARD_MODES.forEach(mode => {
    const b = document.createElement('button');
    b.textContent = MODES[mode].name;
    b.dataset.mode = mode;
    b.onclick = () => Board.show(mode);
    el('board-tabs').append(b);
  });
  el('initials-save').onclick = () => Board.submitInitials();
  el('initials-skip').onclick = () => Board.show(Board.mode);
  el('board-close').onclick = () => Board.hide();
  el('initials-input').addEventListener('keydown', e => {
    e.stopPropagation(); // don't let typing reach the game
    if (e.key === 'Enter') Board.submitInitials();
  });
});


// =====================================================================
//  The parts game.js uses.
// =====================================================================

const Leaderboard = {
  available: leaderboardAvailable,
  modes: BOARD_MODES,
  show: mode => Board.show(mode),
  makesTheBoard,
  askInitials: (mode, score) => Board.askInitials(mode, score),
  isOpen: () => Board.isOpen(),
};
