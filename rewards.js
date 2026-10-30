// =====================================================================
//  REWARDS
//  Things that keep people coming back: snake skins you unlock by
//  playing, achievements, and a new challenge every day.
//  Everything is saved in the browser, so it's per device.
//
//    1. SKINS         the list, and what unlocks each one
//    2. ACHIEVEMENTS  the list, and what earns each one
//    3. DAILY         the challenges, one picked for each day
//    4. SAVING        lifetime totals, kept in the browser
//
//  game.js uses it like this:
//    Rewards.startGame(mode)       when a game starts
//    Rewards.note('apple')         when something happens to your snake
//                                  (returns any new unlocks, to show them)
//    Rewards.skin()                the skin you're wearing
// =====================================================================


// =====================================================================
//  1. SKINS
//  How each one looks is in drawSnakeBody() in game.js (section 3n).
//  unlocked: a test on your lifetime totals (see section 4).
// =====================================================================

const SKINS = [
  { key: 'classic', name: 'Classic', how: 'Yours from the start',      unlocked: t => true },
  { key: 'tiger',   name: 'Tiger',   how: 'Play 5 games',              unlocked: t => t.games >= 5 },
  { key: 'leopard', name: 'Leopard', how: 'Eat 100 apples in all',     unlocked: t => t.apples >= 100 },
  { key: 'rainbow', name: 'Rainbow', how: 'Get a x5 combo',            unlocked: t => t.bestCombo >= 5 },
  { key: 'gold',    name: 'Gold',    how: 'Score 50 in one game',      unlocked: t => t.bestScore >= 50 },
  { key: 'lava',    name: 'Lava',    how: '3 daily challenges',       unlocked: t => t.dailiesDone >= 3 },
];


// =====================================================================
//  2. ACHIEVEMENTS
// =====================================================================

const ACHIEVEMENTS = [
  { key: 'firstBite', icon: '🍎', name: 'First bite',    how: 'Eat an apple',                   earned: t => t.apples >= 1 },
  { key: 'combo3',    icon: '🔥', name: 'Hot streak',    how: 'Get a x3 combo',                 earned: t => t.bestCombo >= 3 },
  { key: 'combo8',    icon: '☄️', name: 'Unstoppable',   how: 'Get a x8 combo',                 earned: t => t.bestCombo >= 8 },
  { key: 'score25',   icon: '⭐', name: '25 club',       how: 'Score 25 in one game',           earned: t => t.bestScore >= 25 },
  { key: 'score100',  icon: '💯', name: 'Century',       how: 'Score 100 in one game',          earned: t => t.bestScore >= 100 },
  { key: 'maze',      icon: '🧩', name: 'Maze runner',   how: 'Beat a maze',                    earned: t => t.mazes >= 1 },
  { key: 'gulp',      icon: '😋', name: 'Gulp',          how: 'Swallow a snake',                earned: t => t.swallows >= 1 },
  { key: 'smash',     icon: '🪨', name: 'Rock breaker',  how: 'Smash a rock',                   earned: t => t.smashes >= 1 },
  { key: 'collector', icon: '🎁', name: 'Collector',     how: '50 power-ups in all',       earned: t => t.powerUps >= 50 },
  { key: 'survivor',  icon: '⏱️', name: 'Survivor',      how: 'Last 3 minutes',     earned: t => t.bestTime >= 180 },
  { key: 'monster',   icon: '🍏', name: 'Apple monster', how: '500 apples in all',          earned: t => t.apples >= 500 },
  { key: 'regular',   icon: '🎮', name: 'Regular',       how: 'Play 25 games',                  earned: t => t.games >= 25 },
  { key: 'daily',     icon: '📅', name: 'Challenger',    how: 'Finish a daily challenge',       earned: t => t.dailiesDone >= 1 },
  { key: 'streak',    icon: '🗓️', name: 'On a roll',     how: '3 days in a row', earned: t => t.bestStreak >= 3 },
];


// =====================================================================
//  3. DAILY CHALLENGE
//  A different one each day (the same for everyone). done: a test on
//  this game's numbers (see newGame() below).
// =====================================================================

const DAILY_CHALLENGES = [
  { text: 'Score 30 in one game',          done: g => g.score >= 30 },
  { text: 'Get a x4 combo',                done: g => g.bestCombo >= 4 },
  { text: 'Eat 25 apples in one game',     done: g => g.apples >= 25 },
  { text: 'Beat a maze',                   done: g => g.mazes >= 1 },
  { text: 'Take 5 power-ups in one game',  done: g => g.powerUps >= 5 },
  { text: 'Last 2 minutes in one game',    done: g => g.time >= 120 },
  { text: 'Score 20 in Medium',            done: g => g.score >= 20 && g.mode === 'medium' },
  { text: 'Swallow a computer snake',      done: g => g.swallows >= 1 },
  { text: 'Smash 2 rocks in one game',     done: g => g.smashes >= 2 },
];

// Today, as a day number (days since 1970) and as text like 2026-10-30.
// Days change at midnight where the player is.
function today() {
  const now = new Date();
  const number = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  return { number, text: new Date(number * 86400000).toISOString().slice(0, 10) };
}

function dailyChallenge() {
  return DAILY_CHALLENGES[(today().number * 4) % DAILY_CHALLENGES.length];
}


// =====================================================================
//  4. SAVING
//  Lifetime totals, the skin you picked and the achievements you have.
// =====================================================================

const BLANK_TOTALS = {
  games: 0, apples: 0, bestCombo: 0, bestScore: 0, mazes: 0, swallows: 0, smashes: 0,
  powerUps: 0, bestTime: 0, dailiesDone: 0, lastDaily: '', streak: 0, bestStreak: 0,
};

function loadTotals() {
  try { return { ...BLANK_TOTALS, ...JSON.parse(localStorage.getItem('snakeRewards') || '{}') }; } catch (e) { return { ...BLANK_TOTALS }; }
}
function saveTotals() {
  try { localStorage.setItem('snakeRewards', JSON.stringify(totals)); } catch (e) { }
}

let totals = loadTotals();
let game = null; // this game's numbers

function newGame(mode) {
  return { mode, score: 0, apples: 0, bestCombo: 0, mazes: 0, swallows: 0, smashes: 0, powerUps: 0, time: 0 };
}

// Everything you have right now, so we can spot what's new after a change.
function unlockedNow() {
  return [
    ...SKINS.filter(s => s.unlocked(totals)).map(s => 'skin:' + s.key),
    ...ACHIEVEMENTS.filter(a => a.earned(totals)).map(a => 'ach:' + a.key),
  ];
}

// The messages to show for anything new.
function whatsNew(before) {
  return unlockedNow().filter(key => !before.includes(key)).map(key => {
    const [kind, name] = key.split(':');
    if (kind === 'skin') return '🎨 New skin: ' + SKINS.find(s => s.key === name).name + '!';
    const a = ACHIEVEMENTS.find(x => x.key === name);
    return a.icon + ' Achievement: ' + a.name + '!';
  });
}

// Something happened to your snake. Updates this game's numbers and the
// lifetime totals, and returns messages for anything just unlocked.
//   'apple', 'maze', 'swallow', 'smash', 'powerUp': one more
//   'combo' / 'score' / 'time': the new number
function note(what, value) {
  if (!game) return [];
  const before = unlockedNow();
  const messages = [];
  const counts = { apple: 'apples', maze: 'mazes', swallow: 'swallows', smash: 'smashes', powerUp: 'powerUps' };
  if (counts[what]) { game[counts[what]] += 1; totals[counts[what]] += 1; }
  if (what === 'combo') { game.bestCombo = Math.max(game.bestCombo, value); totals.bestCombo = Math.max(totals.bestCombo, value); }
  if (what === 'score') { game.score = value; totals.bestScore = Math.max(totals.bestScore, value); }
  if (what === 'time') { game.time = value; totals.bestTime = Math.max(totals.bestTime, value); }

  // The daily challenge: once a day. Doing it the day after the last one
  // keeps your streak going.
  const day = today();
  if (totals.lastDaily !== day.text && dailyChallenge().done(game)) {
    const yesterday = new Date((day.number - 1) * 86400000).toISOString().slice(0, 10);
    totals.streak = totals.lastDaily === yesterday ? totals.streak + 1 : 1;
    totals.bestStreak = Math.max(totals.bestStreak, totals.streak);
    totals.lastDaily = day.text;
    totals.dailiesDone += 1;
    messages.push('📅 Daily challenge done!' + (totals.streak > 1 ? ' ' + totals.streak + ' days in a row!' : ''));
  }
  messages.push(...whatsNew(before));
  // Score and time change all the time; only save when something else did.
  if (!(what === 'score' || what === 'time') || messages.length) saveTotals();
  return messages;
}

// The skin you're wearing (only one you've unlocked).
function skin() {
  let key = 'classic';
  try { key = localStorage.getItem('snakeSkin') || 'classic'; } catch (e) { }
  const found = SKINS.find(s => s.key === key);
  return found && found.unlocked(totals) ? key : 'classic';
}

window.Rewards = {
  SKINS, ACHIEVEMENTS,
  totals: () => totals,
  // A new game: count it, and return messages for anything that unlocks.
  startGame(mode) {
    const before = unlockedNow();
    game = newGame(mode);
    totals.games += 1;
    saveTotals();
    return whatsNew(before);
  },
  endGame() { saveTotals(); game = null; },
  note,
  skin,
  setSkin(key) { try { localStorage.setItem('snakeSkin', key); } catch (e) { } },
  isUnlocked: key => SKINS.find(s => s.key === key).unlocked(totals),
  hasAchievement: key => ACHIEVEMENTS.find(a => a.key === key).earned(totals),
  // Today's challenge, whether it's done, and the streak (if it's still going).
  daily() {
    const day = today();
    const yesterday = new Date((day.number - 1) * 86400000).toISOString().slice(0, 10);
    const going = totals.lastDaily === day.text || totals.lastDaily === yesterday;
    return { text: dailyChallenge().text, done: totals.lastDaily === day.text, streak: going ? totals.streak : 0 };
  },
};
