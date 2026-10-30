// =====================================================================
//  ERRORS
//  If something breaks in the game, two things happen:
//    1. The error is saved in the Firestore database (the "errors" list),
//       so you can see what went wrong at the bottom of stats.html, or in
//       the Firebase console under Firestore Database -> errors.
//       Nothing about who was playing is saved, just what broke and on
//       what kind of device/browser.
//    2. The player sees a "Something went wrong" box with a button to
//       start again, instead of a stuck screen.
//
//  game.js also keeps the game running after an error where it can
//  (see the end of game.js).
// =====================================================================

const GAME_VERSION = 36;   // matches the ?v= number in index.html
const MAX_ERRORS_SAVED = 5; // per page load, so one stuck error can't flood the list

let errorsSaved = 0;

// Save one error. where: what the game was doing (which screen, which mode).
// showBox: false for errors the player wouldn't notice anyway.
function reportError(error, where = '', showBox = true) {
  try {
    console.error(error);
    if (showBox) showErrorBox();
    if (errorsSaved >= MAX_ERRORS_SAVED) return;
    errorsSaved += 1;
    if (typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG || typeof firebase === 'undefined' || !firebase.firestore) return;
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    const cut = (text, n) => String(text || '').slice(0, n);
    firebase.firestore().collection('errors').add({
      message: cut(error && error.message ? error.message : error, 500),
      stack: cut(error && error.stack, 1500),
      where: cut(where || whatsHappening(), 200),
      version: GAME_VERSION,
      device: cut(navigator.userAgent, 300),
      at: firebase.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
  } catch (e) { }
}

// Which screens are open, and the game mode, e.g. "GameOver medium".
function whatsHappening() {
  try {
    if (typeof phaserGame === 'undefined') return 'loading';
    return phaserGame.scene.getScenes(true).map(scene => scene.scene.key + (scene.modeKey ? ' ' + scene.modeKey : '')).join(', ');
  } catch (e) { return '?'; }
}

// The "Something went wrong" box, with a button that reloads the page.
function showErrorBox() {
  if (document.getElementById('error-box')) return;
  const box = document.createElement('div');
  box.id = 'error-box';
  box.style.cssText = 'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:50;background:#222;color:#fff;'
    + 'border:2px solid #ff6666;border-radius:8px;padding:12px 16px;font:16px monospace;text-align:center;max-width:90%;';
  box.innerHTML = 'Oops, something went wrong. 🐍<br>';
  const button = document.createElement('button');
  button.textContent = 'Start again';
  button.style.cssText = 'margin-top:8px;font:18px monospace;padding:8px 16px;border:none;border-radius:6px;background:#7cfc00;cursor:pointer;';
  button.onclick = () => location.reload();
  box.append(button);
  document.body.append(box);
}

// Errors the game didn't catch itself. Only ones from the game's own files
// show the box (browser add-ons can cause errors too). Failed promises are
// usually a dropped connection, so they're only saved.
window.addEventListener('error', event => {
  const ours = !event.filename || event.filename.startsWith(location.origin);
  reportError(event.error || event.message, '', ours);
});
window.addEventListener('unhandledrejection', event => reportError(event.reason, 'promise: ' + whatsHappening(), false));
