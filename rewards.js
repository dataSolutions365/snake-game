// =====================================================================
//  REWARDS
//  Things that keep people coming back: snake skins you unlock by
//  playing, achievements, a new challenge every day, items you win and
//  use when you choose, and a prize for opening the game each day.
//  Everything is saved in the browser, so it's per device.
//
//    1. SKINS         the list, and what unlocks each one
//    2. ACHIEVEMENTS  the list, and what earns each one
//    3. DAILY         the challenges, one picked for each day
//    3b. ITEMS        won from challenges and logins, used in a game
//    3c. DAILY LOGIN  a prize each day, a grand prize on day 7
//    4. SAVING        lifetime totals, kept in the browser
//    5. LEVELS        more of the game opens up as you play
//
//  game.js uses it like this:
//    Rewards.startGame(mode)       when a game starts
//    Rewards.note('apple')         when something happens to your snake
//                                  (returns any new unlocks, to show them)
//    Rewards.skin()                the skin you're wearing
//    Rewards.useItem('shield')     spend one item (true if you had one)
//    Rewards.checkLogin()          today's login prize (once a day)
// =====================================================================


// =====================================================================
//  1. SKINS
//  How each one looks is in drawSnakeBody() in game.js (section 3n).
//  unlocked: a test on your lifetime totals (see section 4).
//  power: what wearing it does, in Easy, Medium and online (see
//  skinPower() in game.js, section 3o). Not with 2 players on one computer.
// =====================================================================

const SKINS = [
  { key: 'classic', name: 'Classic', how: 'Yours from the start', unlocked: t => true,
    power: 'No power, just a good old snake' },
  { key: 'tiger',   name: 'Tiger',   how: 'Play 5 games',         unlocked: t => t.games >= 5,
    power: '🐯 Pounce: combos last 1.5 sec longer' },
  { key: 'leopard', name: 'Leopard', how: 'Eat 100 apples',       unlocked: t => t.apples >= 100,
    power: '🐆 Sniffer: nearby apples slide to you' },
  { key: 'rainbow', name: 'Rainbow', how: 'Get a x5 combo',       unlocked: t => t.bestCombo >= 5,
    power: '🌈 Lucky: good power-ups last 2x as long' },
  { key: 'gold',    name: 'Gold',    how: 'Score 50 once',        unlocked: t => t.bestScore >= 50,
    power: '💰 Golden apples: every 5th apple +3' },
  { key: 'lava',    name: 'Lava',    how: '3 challenges',         unlocked: t => t.dailiesDone >= 3,
    power: '🔥 Hot head: a free shield every game' },
  { key: 'diamond', name: 'Diamond', how: 'Day 7 prize',          unlocked: t => t.grandPrizes >= 1,
    power: '💎 Unbreakable: shield comes back in 30 sec' },
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
function yesterdayText() {
  return new Date((today().number - 1) * 86400000).toISOString().slice(0, 10);
}


// =====================================================================
//  3b. ITEMS
//  Special power-ups you keep and use when you want, in Easy or Medium
//  (keys 1 to 4, or tap them in the corner). You win one for each daily
//  challenge, and more from the daily login prizes.
//  What each one does is in useItem() in game.js (section 3o).
// =====================================================================

const ITEMS = {
  shield: { icon: '🛡️', name: 'Shield', about: 'Your next crash doesn\'t count' },
  magnet: { icon: '🧲', name: 'Magnet', about: 'Pulls nearby apples to you' },
  freeze: { icon: '❄️', name: 'Freeze', about: 'Computer snakes stop still' },
  double: { icon: '💰', name: 'Double', about: 'Double points' },
};
const ITEM_KEYS = Object.keys(ITEMS);

function giveItems(list) {
  list.forEach(key => { totals.items[key] = (totals.items[key] || 0) + 1; });
}
// "🛡️ Shield + 🧲 Magnet"
function itemNames(list) {
  return list.map(key => ITEMS[key].icon + ' ' + ITEMS[key].name).join(' + ');
}


// =====================================================================
//  3c. DAILY LOGIN
//  Open the game on days in a row to move through a 7-day week: a prize
//  each day, and a grand prize on day 7. Miss a day and the week starts
//  over at day 1. After day 7, a new week starts.
// =====================================================================

const LOGIN_PRIZES = [
  ['magnet'],
  ['shield'],
  ['freeze'],
  ['double'],
  ['magnet', 'shield'],
  ['freeze', 'double'],
  ['shield', 'shield', 'magnet', 'magnet', 'freeze', 'freeze', 'double', 'double'], // the grand prize (+ the Diamond skin)
];

// Called each time the start screen opens. The first time each day, it
// moves you one day along the week, gives you that day's prize and
// returns { day, prize text } to show. Otherwise null.
function checkLogin() {
  const day = today().text;
  if (totals.lastLogin === day) return null;
  const inARow = totals.lastLogin === yesterdayText() && totals.loginDay < 7;
  totals.loginDay = inARow ? totals.loginDay + 1 : 1;
  totals.lastLogin = day;
  const prize = LOGIN_PRIZES[totals.loginDay - 1];
  giveItems(prize);
  let text = itemNames(prize);
  if (totals.loginDay === 7) {
    text = 'GRAND PRIZE! 2 of every item';
    if (totals.grandPrizes === 0) text += ' + the Diamond skin';
    totals.grandPrizes += 1;
  }
  saveTotals();
  return { day: totals.loginDay, prize: text };
}


// =====================================================================
//  4. SAVING
//  Lifetime totals, the skin you picked and the achievements you have.
// =====================================================================

const BLANK_TOTALS = {
  games: 0, apples: 0, bestCombo: 0, bestScore: 0, mazes: 0, swallows: 0, smashes: 0,
  powerUps: 0, bestTime: 0, dailiesDone: 0, lastDaily: '', streak: 0, bestStreak: 0,
  items: {}, loginDay: 0, lastLogin: '', grandPrizes: 0,
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

// =====================================================================
//  5. LEVELS
//  New players start simple: more of the game opens up as they play.
//  games: how many games you need to have played. opens: what it unlocks
//  (game.js asks Rewards.has('medium') and so on).
// =====================================================================

const LEVELS = [
  { games: 0, opens: [],                    says: 'Easy mode',             short: 'Easy' },
  { games: 2, opens: ['medium', 'rewards'], says: 'Medium mode and skins', short: 'Medium & skins' },
  { games: 4, opens: ['items'],             says: 'items and daily prizes', short: 'items & prizes' },
  { games: 6, opens: ['online'],            says: 'online and 2 players',  short: 'online play' },
];

// Your level (1, 2, ...), and what the next one needs.
function level() {
  const n = LEVELS.filter(l => totals.games >= l.games).length;
  const next = LEVELS[n];
  return { level: n, max: !next, gamesLeft: next ? next.games - totals.games : 0, nextSays: next ? next.says : '', nextShort: next ? next.short : '' };
}
const has = feature => LEVELS.some(l => totals.games >= l.games && l.opens.includes(feature));
// The level that opens a feature.
const levelFor = feature => LEVELS.findIndex(l => l.opens.includes(feature)) + 1;

// Everything you have right now, so we can spot what's new after a change.
function unlockedNow() {
  return [
    'level:' + level().level,
    ...SKINS.filter(s => s.unlocked(totals)).map(s => 'skin:' + s.key),
    ...ACHIEVEMENTS.filter(a => a.earned(totals)).map(a => 'ach:' + a.key),
  ];
}

// The messages to show for anything new.
function whatsNew(before) {
  return unlockedNow().filter(key => !before.includes(key)).map(key => {
    const [kind, name] = key.split(':');
    if (kind === 'skin') return '🎨 New skin: ' + SKINS.find(s => s.key === name).name + '!';
    if (kind === 'level') return '⭐ Level ' + name + '! New: ' + LEVELS[name - 1].says;
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
  // It wins you a random item.
  if (totals.lastDaily !== day.text && dailyChallenge().done(game)) {
    totals.streak = totals.lastDaily === yesterdayText() ? totals.streak + 1 : 1;
    totals.bestStreak = Math.max(totals.bestStreak, totals.streak);
    totals.lastDaily = day.text;
    totals.dailiesDone += 1;
    const won = ITEM_KEYS[Math.floor(Math.random() * ITEM_KEYS.length)];
    giveItems([won]);
    messages.push('📅 Daily challenge done! You won ' + itemNames([won]) + '!');
    if (totals.streak > 1) messages.push('🔥 ' + totals.streak + ' days in a row!');
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
  SKINS, ACHIEVEMENTS, ITEMS, LOGIN_PRIZES, LEVELS,
  level, has, levelFor,
  items: () => totals.items,
  useItem(key) {
    if (!totals.items[key]) return false;
    totals.items[key] -= 1;
    saveTotals();
    return true;
  },
  checkLogin,
  login: () => ({ day: totals.lastLogin === today().text || totals.lastLogin === yesterdayText() ? totals.loginDay : 0 }),
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
    const going = totals.lastDaily === day.text || totals.lastDaily === yesterdayText();
    return { text: dailyChallenge().text, done: totals.lastDaily === day.text, streak: going ? totals.streak : 0 };
  },
};
