// =====================================================================
//  USAGE STATS
//  Counts how much the game gets played, one tally per day, in the
//  Firestore database (the "stats" list). Nothing about who is playing
//  is saved: no names, no IP addresses, just numbers going up.
//  See them at stats.html.
//
//  Each day is one record named like 2026-10-30 (in UTC), holding:
//    visits, phone_visits, computer_visits   page loads
//    games                                    games started, all modes
//    games_easy, games_easy_snakes,           games started per mode
//    games_medium, games_medium_snakes,       ("_snakes" = computer snakes on)
//    games_twoplayer, games_online
//    rooms                                    online rooms created
//
//  To count something new, add its name to STAT_NAMES here AND to the
//  list in the Firestore rules (FIREBASE_SETUP.md, step 3).
// =====================================================================

const STAT_NAMES = [
  'visits', 'phone_visits', 'computer_visits', 'games', 'rooms',
  'games_easy', 'games_easy_snakes', 'games_medium', 'games_medium_snakes', 'games_twoplayer', 'games_online',
];

// Add 1 to each of these counts for today. If it can't (no connection,
// Firebase not set up), it quietly does nothing; the game never waits on it.
function countStats(...names) {
  try {
    if (typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG || typeof firebase === 'undefined' || !firebase.firestore) return;
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    const today = new Date().toISOString().slice(0, 10);
    const add = {};
    names.filter(name => STAT_NAMES.includes(name)).forEach(name => { add[name] = firebase.firestore.FieldValue.increment(1); });
    firebase.firestore().collection('stats').doc(today).set(add, { merge: true }).catch(() => {});
  } catch (e) { }
}

// Count the visit when the page opens.
window.addEventListener('DOMContentLoaded', () => {
  const phone = window.matchMedia && window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches;
  countStats('visits', phone ? 'phone_visits' : 'computer_visits');
});

// The part game.js and online.js use.
const Stats = {
  // mode is easy, easy_snakes, medium, medium_snakes, twoplayer or online.
  countGame: mode => countStats('games', 'games_' + mode),
  countRoom: () => countStats('rooms'),
};
