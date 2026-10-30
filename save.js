// =====================================================================
//  SAVE CODES
//  Carry your progress to another device without an account. Get a code
//  like K7Q4-M2XP on the Rewards screen, then type it on another device
//  to load the same skins, items, achievements, login week and best scores.
//
//  The progress is saved in the Firestore database (the "saves" list)
//  under the code. No names, emails or passwords: just the game's own
//  numbers. Anyone with the code can load it, so keep it to yourself.
//
//  Once a device has a code, it keeps itself up to date: every few
//  seconds it checks whether anything changed and saves it, and when the
//  game opens it loads anything newer from your other devices.
// =====================================================================

// What gets carried over: the names it's saved under in the browser.
const SAVED_KEYS = ['snakeRewards', 'snakeSkin', 'snakeColor', 'snakeInitials', 'snakeName',
  'snakeHighScore_easy', 'snakeHighScore_medium', 'snakeHighScore_twoplayer'];
const SAVE_CHECK_EVERY = 5000; // milliseconds between checks for changes
const CODE_LETTERS_SAVE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I, easy to read out

function readLocal(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function writeLocal(key, value) {
  try { if (value === null || value === undefined) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch (e) { }
}

// Everything to carry over, as one piece of text.
function snapshot() {
  const data = {};
  SAVED_KEYS.forEach(key => { const value = readLocal(key); if (value !== null) data[key] = value; });
  return JSON.stringify(data);
}

function savesList() {
  if (typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG || typeof firebase === 'undefined' || !firebase.firestore) return null;
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  return firebase.firestore().collection('saves');
}

// "K7Q4M2XP" -> "K7Q4-M2XP", and back again (also tidies up what's typed).
const showCode = code => code.slice(0, 4) + '-' + code.slice(4);
const cleanCode = typed => String(typed || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

function myCode() { return readLocal('snakeSaveCode'); }

// Send this device's progress up (if it has a code).
async function upload() {
  const list = savesList(), code = myCode();
  if (!list || !code) return;
  const data = snapshot();
  const savedAt = Number(readLocal('snakeSavedAt')) || Date.now();
  await list.doc(code).set({ data, savedAt });
  writeLocal('snakeLastSent', data);
}

// Copy saved progress onto this device, then reload so the game uses it.
function applyRemote(remote) {
  const data = JSON.parse(remote.data);
  SAVED_KEYS.forEach(key => writeLocal(key, data[key] !== undefined ? data[key] : null));
  writeLocal('snakeSavedAt', String(remote.savedAt));
  writeLocal('snakeLastSent', remote.data);
  location.reload();
}

// Every few seconds: did anything change? Then note when, and save it.
function watchForChanges() {
  setInterval(() => {
    if (!myCode()) return;
    const now = snapshot();
    if (now === readLocal('snakeLastSent')) return;
    writeLocal('snakeSavedAt', String(Date.now()));
    upload().catch(() => {}); // no connection: try again next time
  }, SAVE_CHECK_EVERY);
}

// When the game opens: load anything newer from another device.
async function syncOnOpen() {
  const list = savesList(), code = myCode();
  if (!list || !code) return;
  const doc = await list.doc(code).get();
  if (!doc.exists) { await upload(); return; }
  const remote = doc.data();
  const changedHere = snapshot() !== readLocal('snakeLastSent');
  const localAt = changedHere ? Date.now() : Number(readLocal('snakeSavedAt')) || 0;
  if (remote.savedAt > localAt && remote.data !== snapshot()) applyRemote(remote);
}

// Firebase's own message is no help to a kid.
function friendly(error) {
  if (error && error.code === 'permission-denied') return new Error('Saving is switched off right now. Ask a grown-up to check the save code setup.');
  if (error && error.code === 'unavailable') return new Error('No connection. Try again in a bit.');
  return error;
}

window.SaveCode = {
  available: () => !!savesList(),
  code: () => (myCode() ? showCode(myCode()) : null),

  // Make a new code for this device and save its progress under it.
  create() { return this.makeCode().catch(e => { throw friendly(e); }); },
  load(typed) { return this.loadCode(typed).catch(e => { throw friendly(e); }); },

  async makeCode() {
    const list = savesList();
    if (!list) throw new Error('Saving isn\'t set up.');
    for (let tries = 0; tries < 5; tries++) {
      let code = '';
      for (let i = 0; i < 8; i++) code += CODE_LETTERS_SAVE[Math.floor(Math.random() * CODE_LETTERS_SAVE.length)];
      if ((await list.doc(code).get()).exists) continue; // already taken: pick another
      writeLocal('snakeSaveCode', code);
      writeLocal('snakeSavedAt', String(Date.now()));
      await upload();
      return showCode(code);
    }
    throw new Error('Couldn\'t make a code. Try again.');
  },

  // Load someone's code on this device (replaces what's here).
  async loadCode(typed) {
    const list = savesList(), code = cleanCode(typed);
    if (!list) throw new Error('Saving isn\'t set up.');
    if (code.length !== 8) throw new Error('A code is 8 letters and numbers, like K7Q4-M2XP.');
    const doc = await list.doc(code).get();
    if (!doc.exists) throw new Error('No progress saved under ' + showCode(code) + '. Check the code.');
    writeLocal('snakeSaveCode', code);
    applyRemote(doc.data());
  },
};

window.addEventListener('DOMContentLoaded', () => {
  syncOnOpen().catch(() => {});
  watchForChanges();
});
