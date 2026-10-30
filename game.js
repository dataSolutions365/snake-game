// =====================================================================
//  SNAKE
//  The file is split into numbered sections. Each one has a heading
//  like this, so you can find the part you want to change.
//
//    1. SETTINGS        numbers you can tweak (speed, board size)
//    2. START SCREEN    the title screen you see first
//    3. THE GAME        the snake, food, controls, score and computer snakes
//       (3i covers online games; the rest of online play is in online.js)
//       (3j covers the big world, the cameras, spin and lights out)
//       (3k mazes, 3l rocks, 3m snakes eating snakes, 3n how everything looks,
//        3o items you win and use when you choose)
//    4. GAME OVER       the screen after you crash
//    5. START PHASER    joins the screens together and starts it all
// =====================================================================


// =====================================================================
//  1. SETTINGS
// =====================================================================

const CELL = 20;        // size of one square, in pixels
const MOVE_EVERY = 120; // milliseconds between snake steps (smaller = faster)

// On a computer or a sideways phone, the board is wide: 40 x 30 squares.
// On a phone held upright, it's tall instead, shaped to fit the screen.
const PORTRAIT = window.innerHeight > window.innerWidth;
const COLS = PORTRAIT ? 20 : 40;  // squares across
const ROWS = PORTRAIT ? Math.min(40, Math.floor(20 * window.innerHeight / window.innerWidth)) : 30; // squares down
const WIDTH = COLS * CELL;
const HEIGHT = ROWS * CELL;

// Online, everyone's screen is a different shape, so all online games use
// the same square screens, shrunk to fit each device.
const ONLINE_COLS = 30;
const ONLINE_ROWS = 30;
const ROUND_LENGTH = 120000;      // online rounds last 2 minutes (in milliseconds); highest score wins
const PLAYER_RESPAWN_AFTER = 3000; // online, a crashed snake comes back after this long
const CRASH_COSTS = 5;            // points you lose for crashing online

// Game modes. The player picks one on the start screen.
// To add a new mode (like HARD), copy one of these blocks and change the numbers.
// players: 2 means two people on one keyboard (not shown on phones).
// online: true means a private room with friends on other devices (see online.js).
// It only shows up once Firebase is set up in firebase-config.js.
// computerSnakes: how many, when "Computer snakes" is switched on at the start
//   (1-player modes only; the switch is saved like the color).
// powerUps: the most power-ups on each screen at once (0 = none). With 1,
//   they also come half as often.
// rocks: how many rock piles on each screen. Hit one and you crash.
// mazes: true means mazes show up now and then (see MAZE_ settings below).
// mazeChance: how likely a maze is each time one could show up, from 0
//   (never) to 1 (every time). Leave it out for every time.
// screens: how big the world is. 2 means 2 x 2 screens: you see one at a
// time, and the view flips to the next when you go past the edge.
// (2 players on one keyboard stay on 1 screen, so you can both see.)
const MODES = {
  easy:      { name: 'EASY',      about: 'Fewer power-ups', players: 1, computerSnakes: 3, food: 3,  powerUps: 1, screens: 1, rocks: 0 },
  medium:    { name: 'MEDIUM',    about: 'Rocks in the way', players: 1, computerSnakes: 5, food: 8, powerUps: 3, screens: 2, mazes: true, mazeChance: 0.5, rocks: 6 },
  twoplayer: { name: '2 PLAYERS', about: 'Same computer',   players: 2, computerSnakes: 0, food: 2,  powerUps: 3, screens: 1 },
  online:    { name: 'ONLINE',    about: 'Private room',    online: true, computerSnakes: 0, food: 10, powerUps: 3, screens: 2, mazes: true },
};

// Power-ups and power downs: icons that pop up on the board now and then.
// Run over one to use it. Good ones have a green glow, bad ones a red glow.
//   says:  floats up when you take it
//   about: the line in the legend on the start screen
// What each one does is in usePowerUp() (section 3e). To add one, add a line
// here and a matching part there.
// rocksOnly: only shows up in modes with rocks.
const POWER_UPS = {
  grow:   { icon: '⭐', good: true,  says: '+3',         about: 'Grow 3 longer, +3 points' },
  speed:  { icon: '⚡', good: true,  says: 'FAST!',      about: 'Go twice as fast' },
  ghost:  { icon: '👻', good: true,  says: 'GHOST!',     about: 'Slide through snakes' },
  fat:    { icon: '🦖', good: true,  says: 'DINO!',      about: '2x wider: others crash into you' },
  crush:  { icon: '💪', good: true,  says: 'CRUSH!',     about: 'Smash rocks for free', rocksOnly: true },
  shrink: { icon: '💀', good: false, says: '-3',         about: 'Shrink 3 shorter, -3 points' },
  slow:   { icon: '🐢', good: false, says: 'SLOW...',    about: 'Go half speed' },
  flip:   { icon: '🌀', good: false, says: 'BACKWARDS!', about: 'Controls turn backwards' },
  spin:   { icon: '🌪️', good: false, says: 'SPIN!',      about: 'The screen spins around' },
  dark:   { icon: '🙈', good: false, says: 'LIGHTS OUT!', about: 'You only see right around you' },
  // good: null means it could be either. It turns into one of the others at random.
  mystery: { icon: '❓', good: null, says: '?',          about: 'Surprise! Good or bad?' },
  // Online extras: these only show up in online games (some of them
  // mess with the other players).
  rocket:  { icon: '🚀', good: true, says: 'BLAST OFF!',     about: 'Zoom and fly over snakes, 3 sec', onlineOnly: true },
  goal:    { icon: '🏈', good: true, says: 'FIELD GOAL! +3', about: '+3 points', onlineOnly: true },
  pizza:   { icon: '🍕', good: true, says: 'PIZZA! +5',      about: 'Grow 5 longer, +5 points', onlineOnly: true },
  crown:   { icon: '👑', good: true, says: 'KING! x2',       about: 'Double points for 10 sec', onlineOnly: true },
  magnet:  { icon: '🧲', good: true, says: 'MAGNET!',        about: 'Pulls nearby apples to you', onlineOnly: true },
  rainbow: { icon: '🌈', good: true, says: 'RAINBOW!',       about: 'Turn rainbow for 10 sec', onlineOnly: true },
  ice:     { icon: '🧊', good: true, says: 'FREEZE THEM!',   about: 'Everyone else freezes, 2 sec', onlineOnly: true },
  poop:    { icon: '💩', good: true, says: 'STINKY!',        about: 'Everyone else goes slow, 4 sec', onlineOnly: true },
};
const POWER_UP_EVERY = 5000;     // milliseconds between new power-ups (on each screen)
const POWER_UP_LASTS = 10000;    // milliseconds before an uneaten one disappears (it blinks first)
const POWER_UP_SIZE = 3;         // squares a star adds, or a skull takes away
const EFFECT_LASTS = 5000;       // milliseconds all the others last
const LIGHTS_OUT_SEE = 4;
const ROCK_SMASH_COSTS = 2;      // squares you lose for smashing through a rock

// Mazes: now and then a maze shows up on a screen nobody is on.
// Hit one of its walls and you crash. Go in the green entrance and out
// the red exit and you get the prize. Only in modes with mazes: true
// (they need a big world).
const MAZE_ACROSS = 7;       // most paths across and down (fewer if the screen is small)
const MAZE_DOWN = 5;
const MAZE_PATH_WIDTH = 2;   // how many squares wide the paths are (walls are 1)
const MAZE_FIRST = 10000;    // milliseconds into the game before the first maze
const MAZE_EVERY = 20000;    // milliseconds between one maze going and the next one coming
const MAZE_LASTS = 45000;    // milliseconds a maze stays if nobody gets through (it blinks first)
const MAZE_PRIZE = 10;       // squares longer and points for getting through

// Combos: eat apples quickly, one after another, for bonus points.
// The 2nd apple within COMBO_WINDOW of the last one is a x2 combo (+1),
// the 3rd is x3 (+2), and so on, up to COMBO_MAX_BONUS extra per apple.
const COMBO_WINDOW = 4000;   // milliseconds
const COMBO_MAX_BONUS = 5;

// Skins (unlocked by playing, see rewards.js). Gold and lava have their
// own colors; the others use your color with a pattern on top (see
// drawSnakeBody in 3n).
const SKIN_COLORS = {
  gold:    { body: 0xe8b923, head: 0xffe17a },
  lava:    { body: 0x8b2500, head: 0xff7043 },
  diamond: { body: 0x8fdcf5, head: 0xe3f8ff },
};

// Skin powers (what each one does is in rewards.js, see skinPower() in 3o).
// In games on your own and online (not 2 players on one computer).
// Online they're gentler, so nobody feels unbeatable: Lava and Diamond
// both get one shield per round, and it doesn't come back.
const SKIN_POWERS = {
  solo:   { tigerExtra: 1500, leopardReach: 3, goldBonus: 3, luckyTimes: 2,   diamondBack: 30000 },
  online: { tigerExtra: 750,  leopardReach: 2, goldBonus: 2, luckyTimes: 1.5, diamondBack: 0 },
};
//   tigerExtra:   milliseconds more to keep a combo going
//   leopardReach: apples this close slide to you
//   goldBonus:    extra points for every GOLD_EVERY-th apple
//   luckyTimes:   how much longer good power-ups last with Rainbow
//   diamondBack:  milliseconds until a used Diamond shield comes back (0: never)
const GOLD_EVERY = 5;

// Items (won daily, see rewards.js): how long each lasts once you use it.
// The shield lasts until your next crash.
const ITEM_LASTS = { magnet: 10000, freeze: 8000, double: 15000 };
const MAGNET_REACH = 7;      // apples this many squares away (or closer) get pulled in

// Colors the player can pick for their snake. "head" is a lighter shade for the head.
// To add a color, add a line here.
const PLAYER_COLORS = [
  { name: 'Green',  body: 0x32cd32, head: 0x7cfc00 },
  { name: 'Yellow', body: 0xffd700, head: 0xffff88 },
  { name: 'Pink',   body: 0xff66cc, head: 0xffaee6 },
  { name: 'Cyan',   body: 0x00ced1, head: 0x88ffff },
  { name: 'Purple', body: 0xb36bff, head: 0xdab8ff },
  { name: 'Blue',   body: 0x3fa9f5, head: 0xa8dcff },
  { name: 'Orange', body: 0xffa500, head: 0xffd27a },
  { name: 'White',  body: 0xdddddd, head: 0xffffff },
];

// Player 2's color: the next color in the list after player 1's.
function secondColor(firstIndex) {
  return PLAYER_COLORS[(firstIndex + 1) % PLAYER_COLORS.length];
}

// Computer snakes use these, skipping whichever one the player picked.
const COMPUTER_COLORS = [0x3fa9f5, 0xffa500, 0xb36bff, 0xff66cc, 0x00ced1]; // blue, orange, purple, pink, cyan
const RESPAWN_AFTER = 3000;  // milliseconds before a crashed computer snake comes back
const COMPUTER_MISSES_YOU = 0.25; // chance (0 to 1) a computer snake doesn't notice your body on a step

// Touch screens get swipe controls instead of arrow keys.
// (A phone or tablet's main pointer is a finger, which the browser calls
// "coarse". A laptop with a touch screen still counts as a computer.)
const TOUCH = window.matchMedia
  ? window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches
  : 'ontouchstart' in window;

// The best score for each mode is saved in the browser so it's still there next visit.
// (try/catch because some private-browsing modes block saving.)
function loadHighScore(mode) {
  try { return Number(localStorage.getItem('snakeHighScore_' + mode)) || 0; } catch (e) { return 0; }
}
function saveHighScore(mode, score) {
  try { localStorage.setItem('snakeHighScore_' + mode, score); } catch (e) { }
}

// The player's color choice is saved the same way (as its number in PLAYER_COLORS).
function loadColorChoice() {
  try { return Math.min(Number(localStorage.getItem('snakeColor')) || 0, PLAYER_COLORS.length - 1); } catch (e) { return 0; }
}
function saveColorChoice(i) {
  try { localStorage.setItem('snakeColor', i); } catch (e) { }
}

// How the player steers on a computer: 'keys' (arrow keys), 'wasd' or 'mouse'.
// Picked on the start screen and saved the same way.
const CONTROLS = ['keys', 'wasd', 'mouse'];
function loadControls() {
  try {
    const saved = localStorage.getItem('snakeControls');
    return CONTROLS.includes(saved) ? saved : 'keys';
  } catch (e) { return 'keys'; }
}
// With 2 players on one computer, each picks their own (and they can't
// both pick the same). Player 1 starts on W A S D, player 2 on the arrows.
function loadTwoPlayerControls() {
  try {
    const saved = (localStorage.getItem('snakeControls2') || '').split(',');
    if (CONTROLS.includes(saved[0]) && CONTROLS.includes(saved[1]) && saved[0] !== saved[1]) return saved;
  } catch (e) { }
  return ['wasd', 'keys'];
}
function saveTwoPlayerControls(choices) {
  try { localStorage.setItem('snakeControls2', choices.join(',')); } catch (e) { }
}
// Computer snakes on or off (for Easy and Medium). Off to start with.
function loadSnakesOn() {
  try { return localStorage.getItem('snakeComputerSnakes') === 'on'; } catch (e) { return false; }
}
function saveSnakesOn(on) {
  try { localStorage.setItem('snakeComputerSnakes', on ? 'on' : 'off'); } catch (e) { }
}
function saveControls(choice) {
  try { localStorage.setItem('snakeControls', choice); } catch (e) { }
}

// Quick links: a link like ?mode=easy skips the start screen and goes
// straight into that mode. Add &color=pink to pick a color too.
// Examples:  snake.datasolutions365.com/?mode=easy
//            snake.datasolutions365.com/?mode=medium&color=pink
//            snake.datasolutions365.com/?mode=medium&snakes=on   (computer snakes on)
const LINK = new URLSearchParams(window.location.search);
let quickLinkUsed = false; // only jump in once, so "Change mode" still shows the start screen

// A clickable/tappable button: a box with text on it.
function makeButton(scene, x, y, label, color, onClick, width = 280, fontSize = '22px') {
  const button = scene.add.text(x, y, label, {
    fontSize, color: '#111111', backgroundColor: color, padding: { x: 18, y: 10 }, align: 'center', fixedWidth: width,
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  button.on('pointerdown', () => { Sound.play('click'); onClick(); });
  return button;
}

// Two small buttons to switch sound effects and music on and off (sound.js).
// place: what to do with each button (in the game, it goes on the HUD).
function addSoundButtons(scene, x, y, place = button => button) {
  const style = { fontSize: '16px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 8, y: 5 } };
  const sound = place(scene.add.text(x, y, '', style).setInteractive({ useHandCursor: true }));
  const music = place(scene.add.text(x, y, '', style).setInteractive({ useHandCursor: true }));
  const show = () => {
    sound.setText(Sound.soundOn() ? '🔊 Sound' : '🔇 Sound');
    music.setText(Sound.musicOn() ? '🎵 Music' : '🎵 Off');
    music.x = sound.x + sound.width + 8;
  };
  sound.on('pointerdown', () => { Sound.toggleSound(); show(); });
  music.on('pointerdown', () => { Sound.toggleMusic(); show(); });
  show();
}


// =====================================================================
//  2. START SCREEN
//  A "scene" is one screen of the game. Each screen is its own class.
//  Phaser calls create() once when the screen opens.
// =====================================================================

class StartScene extends Phaser.Scene {
  constructor() { super('Start'); } // 'Start' is this screen's name

  // data: { openRewards: true } to open straight to the Rewards screen.
  create(data = {}) {
    // Phaser reuses this screen each time it opens, so forget the
    // buttons from last time (they're gone now).
    this.p2Label = null;
    this.skinCards = null;
    this.powerShown = null;
    this.loginBox = null;
    this.twoPlayerSetup = null;

    // Opened from a room invite link (?room=ABCDE)? Go to the online menu.
    if (LINK.get('room') && !quickLinkUsed && Online.available()) {
      quickLinkUsed = true;
      this.scene.start('OnlineMenu', { code: LINK.get('room').toUpperCase(), color: loadColorChoice() });
      return;
    }

    // Opened from a quick link? Jump straight into the game.
    const linkMode = (LINK.get('mode') || '').toLowerCase();
    if (MODES[linkMode] && !MODES[linkMode].online && !quickLinkUsed) {
      quickLinkUsed = true;
      const linkColor = PLAYER_COLORS.findIndex(c => c.name.toLowerCase() === (LINK.get('color') || '').toLowerCase());
      const linkSnakes = LINK.get('snakes'); // &snakes=on or &snakes=off
      this.scene.start('Game', { mode: linkMode, color: linkColor >= 0 ? linkColor : loadColorChoice(),
        snakes: linkSnakes ? linkSnakes === 'on' : undefined });
      return;
    }

    addBackdrop(this); // see 3n
    this.add.text(WIDTH / 2, HEIGHT / 2 - 225, 'SNAKE', { fontSize: '64px', color: '#7cfc00', stroke: '#1b5e20', strokeThickness: 8 }).setOrigin(0.5);

    // On a phone: "Swipe to steer". On a computer, that line is the
    // arrow keys / mouse picker instead (see setupControlsPicker).
    const howTo = TOUCH ? 'Swipe to steer\n' : '';
    this.add.text(WIDTH / 2, HEIGHT / 2 - (TOUCH ? 135 : 120), howTo + 'Eat the apples to grow\nDon\'t hit the walls or any snake!',
      { fontSize: '18px', color: '#cccccc', align: 'center', lineSpacing: 8 }).setOrigin(0.5);

    this.setupColorPicker(HEIGHT / 2 - 35);
    this.setupLegend();
    this.setupRewards();
    if (data.openRewards) { this.rewards.setVisible(true); this.showSkinChoice(); }
    addSoundButtons(this, 10, 54);
    if (TestMode.on()) this.setupTestBar(); // see 3p
    if (!TOUCH) this.setupControlsPicker();

    // Leaderboard button in the top-right corner (once Firebase is set up). Keyboard: L
    if (Leaderboard.available()) {
      const showBoard = () => Leaderboard.show('easy');
      this.add.text(WIDTH - 10, 10, '🏆 Leaderboard', { fontSize: '18px', color: '#ffff66', backgroundColor: '#333333', padding: { x: 8, y: 6 } })
        .setOrigin(1, 0).setInteractive({ useHandCursor: true }).on('pointerdown', showBoard);
      this.input.keyboard.on('keydown-L', showBoard);
    }

    this.setupSnakesSwitch(HEIGHT / 2 + (PORTRAIT ? 8 : 25));

    // The first visit each day: today's login prize (see rewards.js).
    const login = Rewards.has('items') && Rewards.checkLogin();
    if (login) this.showLoginPrize(login);

    // One button per mode. Keyboard: 1, 2, 3...
    // On a wide screen they sit side by side (two rows if there are 4);
    // on a phone they stack down the screen.
    // Two-player modes are left off phones, since they need a keyboard.
    // The online mode only shows once Firebase is set up.
    const modeKeys = Object.keys(MODES).filter(key =>
      !(TOUCH && MODES[key].players === 2) && !(MODES[key].online && !Online.available()));
    const buttonColors = ['#7cfc00', '#ffa500', '#3fa9f5', '#ff66cc'];
    const keyNames = ['ONE', 'TWO', 'THREE', 'FOUR'];
    const perRow = modeKeys.length > 3 ? 2 : modeKeys.length;
    modeKeys.forEach((key, i) => {
      const mode = MODES[key];
      const col = i % perRow, row = Math.floor(i / perRow);
      const x = PORTRAIT ? WIDTH / 2 : WIDTH / 2 + (col - (perRow - 1) / 2) * 260;
      const y = PORTRAIT ? HEIGHT / 2 + 75 + i * 100 : HEIGHT / 2 + 80 + row * 105;
      // Tell the game which mode, and which color the player picked.
      // Not unlocked yet (see LEVELS in rewards.js): a grey button that says when.
      const needs = key === 'medium' ? 'medium' : key === 'easy' ? null : 'online';
      const locked = needs && !Rewards.has(needs);
      const start = () => {
        if (Leaderboard.isOpen() || this.legend.visible || this.rewards.visible || this.loginBox) return; // something is showing on top
        if (locked) return;
        if (this.twoPlayerSetup && this.twoPlayerSetup.visible) return;
        if (mode.online) this.scene.start('OnlineMenu', { color: this.colorChoice });
        else if (mode.players === 2) this.showTwoPlayerSetup(key); // pick controls first
        else this.scene.start('Game', { mode: key, color: this.colorChoice });
      };
      makeButton(this, x, y, (locked ? '🔒 ' : TOUCH ? '' : (i + 1) + '. ') + mode.name + '\n' + (locked ? 'Level ' + Rewards.levelFor(needs) : mode.about),
        locked ? '#555555' : buttonColors[i % buttonColors.length], start, PORTRAIT ? 280 : 210, PORTRAIT ? '22px' : '19px');
      if (!mode.online) {
        const under = this.add.text(x, y + 48, 'Best: ' + loadHighScore(key), { fontSize: '16px', color: '#aaaaaa' }).setOrigin(0.5);
        if (mode.players === 2) this.p2Label = under; // filled in by update() below
      }
      this.input.keyboard.on('keydown-' + keyNames[i], start);
    });
  }

  // Phaser calls update() about 60 times per second. Keep player 2's
  // color up to date as player 1 picks theirs.
  update() {
    if (this.p2Label) this.p2Label.setText('P2 is ' + secondColor(this.colorChoice).name);
    if (this.rewards.visible) this.drawSkinCards(); // so rainbow, gold and lava move
  }

  // "🏅 Rewards" (keyboard: R): today's challenge, the skins (pick one to
  // wear, or see how to unlock it) and every achievement.
  // Today's challenge also shows along the bottom of the start screen.
  setupRewards() {
    const daily = Rewards.daily();
    // Until you've unlocked everything, the bottom line says what's next (see LEVELS in rewards.js).
    const lvl = Rewards.level();
    const dailyLine = !lvl.max
      ? '⭐ Level ' + lvl.level + ': ' + lvl.gamesLeft + (PORTRAIT ? '' : ' more') + ' game' + (lvl.gamesLeft > 1 ? 's' : '') + ' to unlock '
        + (PORTRAIT ? lvl.nextShort : lvl.nextSays)
      : (PORTRAIT ? '📅 Today: ' : '📅 Today\'s challenge: ') + daily.text + (daily.done ? '  ✅' : '')
      + (daily.streak > 1 ? '   🔥 ' + daily.streak + ' days in a row' : '');
    this.add.text(WIDTH / 2, HEIGHT - 18, dailyLine, { fontSize: PORTRAIT ? '13px' : '16px', color: '#ffd700', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5);

    const box = this.add.container(0, 0).setDepth(10).setVisible(false);
    this.rewards = box;
    box.add(this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.94).setOrigin(0).setInteractive());
    box.add(this.add.text(WIDTH / 2, 28, '🏅 REWARDS', { fontSize: '30px', color: '#ffd700' }).setOrigin(0.5));
    const items = Rewards.items();
    box.add(this.add.text(WIDTH / 2, 86, '📅 Today: ' + daily.text + (daily.done ? '  ✅ Done!' : PORTRAIT ? '' : '  (wins an item)')
      + '\nFinished: ' + Rewards.totals().dailiesDone + (daily.streak > 1 ? '   🔥 ' + daily.streak + ' days in a row' : '')
      + '\n🎁 Daily login: day ' + Rewards.login().day + ' of 7' + (PORTRAIT ? '' : ' (day 7 = grand prize)')
      + '\n🎒 Items: ' + Object.keys(Rewards.ITEMS).map(key => Rewards.ITEMS[key].icon + (items[key] || 0)).join('  ')
      + (PORTRAIT ? '' : TOUCH ? '  (tap them in a game)' : '  (keys 1-4 in a game)'),
      { fontSize: PORTRAIT ? '13px' : '16px', color: '#ffffff', align: 'center', lineSpacing: 4 }).setOrigin(0.5));

    // The skin cards: 7 in a row, or 4 + 3 on a phone.
    const perRow = PORTRAIT ? 4 : 7, cardW = PORTRAIT ? 92 : 106, cardH = PORTRAIT ? 92 : 112, gap = PORTRAIT ? 6 : 5;
    const top = 166;
    box.add(this.add.text(WIDTH / 2, top - 22, 'SKINS: ' + (TOUCH ? 'tap' : 'click') + (PORTRAIT ? ' one to wear it' : ' one to wear it or see its power'), { fontSize: '16px', color: '#cccccc' }).setOrigin(0.5));
    this.skinCards = Rewards.SKINS.map((skin, i) => {
      const x = WIDTH / 2 + ((i % perRow) - (perRow - 1) / 2) * (cardW + gap);
      const y = top + Math.floor(i / perRow) * (cardH + gap) + cardH / 2;
      const back = this.add.rectangle(x, y, cardW, cardH, 0x222222).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.powerShown = skin.key; // says its power, even when it's locked
          if (!Rewards.isUnlocked(skin.key)) { this.showSkinChoice(); return; }
          Sound.play('click');
          Rewards.setSkin(skin.key);
          this.showSkinChoice();
        });
      const art = this.add.graphics({ x: x - cardW / 2 + 6, y: y - cardH / 2 + 6 }).setScale(PORTRAIT ? 0.48 : 0.56);
      const name = this.add.text(x, y + (PORTRAIT ? 2 : 12), skin.name, { fontSize: PORTRAIT ? '14px' : '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      const note = this.add.text(x, y + (PORTRAIT ? 26 : 36), '', { fontSize: '12px', color: '#aaaaaa', align: 'center', wordWrap: { width: cardW - 8 } }).setOrigin(0.5);
      box.add([back, art, name, note]);
      return { skin, back, art, note };
    });

    // What the skin does (the one you wear, or the last one tapped).
    const cardsEnd = top + Math.ceil(Rewards.SKINS.length / perRow) * (cardH + gap);
    this.powerLine = this.add.text(WIDTH / 2, cardsEnd + 8, '', { fontSize: PORTRAIT ? '13px' : '16px', color: '#7cfc00', align: 'center', wordWrap: { width: WIDTH - 24 } }).setOrigin(0.5, 0);
    box.add(this.powerLine);

    // The achievements: two columns, or one on a phone.
    const listTop = cardsEnd + (PORTRAIT ? 30 : 40);
    const got = Rewards.ACHIEVEMENTS.filter(a => Rewards.hasAchievement(a.key)).length;
    box.add(this.add.text(WIDTH / 2, listTop, 'ACHIEVEMENTS  ' + got + ' / ' + Rewards.ACHIEVEMENTS.length, { fontSize: '16px', color: '#cccccc' }).setOrigin(0.5));
    const lines = Rewards.ACHIEVEMENTS.map(a => (Rewards.hasAchievement(a.key) ? '✅ ' + a.icon + ' ' : '⬜ 🔒 ') + a.name + ': ' + a.how);
    const style = { fontSize: PORTRAIT ? '12px' : '14px', color: '#ffffff', lineSpacing: PORTRAIT ? 1 : 6 };
    if (PORTRAIT) box.add(this.add.text(16, listTop + 18, lines.join('\n'), style));
    else {
      const half = Math.ceil(lines.length / 2);
      box.add(this.add.text(24, listTop + 18, lines.slice(0, half).join('\n'), style));
      box.add(this.add.text(WIDTH / 2 + 4, listTop + 18, lines.slice(half).join('\n'), style));
    }
    if (SaveCode.available()) this.setupSaveCode(box, HEIGHT - (PORTRAIT ? 56 : 78));
    box.add(this.add.text(WIDTH / 2, HEIGHT - 22, TOUCH ? 'Tap here to close' : 'Click here or press R to close',
      { fontSize: '18px', color: '#ffff66' }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => toggle()));

    const toggle = () => { box.setVisible(!box.visible); this.showSkinChoice(); };
    if (!Rewards.has('rewards')) { this.showSkinChoice(); return; } // not yet: no button for it
    this.add.text(WIDTH - 10, 54, '🏅 Rewards', { fontSize: '18px', color: '#111111', backgroundColor: '#ffd700', padding: { x: 8, y: 6 } })
      .setOrigin(1, 0).setInteractive({ useHandCursor: true }).on('pointerdown', toggle);
    this.input.keyboard.on('keydown-R', toggle);
    this.showSkinChoice();
  }

  // Save codes (save.js): show your code, or buttons to get one or load one.
  setupSaveCode(box, y) {
    const button = (label, color, onClick) => this.add.text(0, y, label, { fontSize: PORTRAIT ? '14px' : '16px', color: '#111111', backgroundColor: color, padding: { x: 8, y: 5 } })
      .setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
    const status = this.add.text(WIDTH / 2, y + 20, '', { fontSize: '13px', color: '#aaaaaa', align: 'center', wordWrap: { width: WIDTH - 20 } }).setOrigin(0.5, 0);
    const code = SaveCode.code();
    const loadCode = () => {
      const typed = window.prompt('Type your save code (like K7Q4-M2XP).\nThis replaces the progress on this device.');
      if (!typed) return;
      status.setText('Loading...');
      SaveCode.load(typed).catch(e => status.setText(e.message).setColor('#ff6666'));
    };
    const parts = code
      ? [this.add.text(0, y, '💾 Your save code: ' + code, { fontSize: PORTRAIT ? '14px' : '17px', color: '#7cfc00' }).setOrigin(0, 0.5),
         button('Load another', '#cccccc', loadCode)]
      : [button('💾 Get a save code', '#7cfc00', () => {
          status.setText('Making your code...');
          SaveCode.create().then(() => this.scene.restart({ openRewards: true }))
            .catch(e => status.setText(e.message).setColor('#ff6666'));
        }), button('I have a code', '#cccccc', loadCode)];
    if (!code) status.setText('Play on another device with the same progress. No name or email needed.');
    else status.setText('Type this code on another device to play with the same progress there.');
    // No room for the line under the buttons on a phone: messages cover
    // the buttons for a few seconds instead.
    if (PORTRAIT) {
      status.setVisible(false).setY(y).setOrigin(0.5).setFontSize(14).setBackgroundColor('#000000').setPadding(6, 6, 6, 6);
      const setText = status.setText.bind(status);
      status.setText = text => {
        setText(text).setVisible(true);
        if (this.statusTimer) this.statusTimer.remove();
        this.statusTimer = this.time.delayedCall(5000, () => status.setVisible(false));
        return status;
      };
    }
    let x = WIDTH / 2 - (parts.reduce((total, part) => total + part.width, 0) + 10 * (parts.length - 1)) / 2;
    parts.forEach(part => { part.x = x; x += part.width + 10; });
    box.add([...parts, status]);
  }

  // The daily login prize: a row of 7 days, today's lit up, and what you won.
  showLoginPrize({ day, prize }) {
    const box = this.add.container(0, 0).setDepth(20);
    this.loginBox = box;
    box.add(this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.9).setOrigin(0).setInteractive());
    box.add(this.add.text(WIDTH / 2, HEIGHT / 2 - 150, '🎁 DAILY PRIZE', { fontSize: '34px', color: '#ffd700' }).setOrigin(0.5));
    box.add(this.add.text(WIDTH / 2, HEIGHT / 2 - 105, 'Day ' + day + ' of 7', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5));
    const size = PORTRAIT ? 48 : 70, gap = PORTRAIT ? 5 : 10;
    Rewards.LOGIN_PRIZES.forEach((items, i) => {
      const x = WIDTH / 2 + (i - 3) * (size + gap), y = HEIGHT / 2 - 30;
      const done = i + 1 < day, now = i + 1 === day;
      box.add(this.add.rectangle(x, y, size, size + 16, now ? 0x3d3d1a : 0x222222).setStrokeStyle(3, now ? 0xffd700 : done ? 0x7cfc00 : 0x444444));
      box.add(this.add.text(x, y - size / 2 + 4, 'Day ' + (i + 1), { fontSize: PORTRAIT ? '11px' : '13px', color: '#cccccc' }).setOrigin(0.5, 0));
      const icon = i === 6 ? '🏆' : done ? '✅' : Rewards.ITEMS[items[0]].icon + (items.length > 1 ? '+' : '');
      box.add(this.add.text(x, y + 10, icon, { fontSize: PORTRAIT ? '18px' : '26px' }).setOrigin(0.5));
    });
    box.add(this.add.text(WIDTH / 2, HEIGHT / 2 + 50, 'You got: ' + prize, {
      fontSize: '18px', color: '#7cfc00', align: 'center', wordWrap: { width: WIDTH - 40 } }).setOrigin(0.5));
    box.add(this.add.text(WIDTH / 2, HEIGHT / 2 + 90, 'Come back tomorrow for day ' + (day % 7 + 1) + '. Miss a day and it starts over.',
      { fontSize: '14px', color: '#aaaaaa', align: 'center', wordWrap: { width: WIDTH - 40 } }).setOrigin(0.5));
    const close = () => { box.destroy(); this.loginBox = null; this.scene.restart(); }; // restart so the rewards screen shows the new items
    box.add(makeButton(this, WIDTH / 2, HEIGHT / 2 + 150, TOUCH ? 'Collect!' : 'Collect! (SPACE)', '#ffd700', close));
    this.input.keyboard.once('keydown-SPACE', () => { if (this.loginBox) close(); });
    Sound.play('unlock');
  }

  // Light up the skin being worn, and say how to unlock the others.
  showSkinChoice() {
    const wearing = Rewards.skin();
    const shown = Rewards.SKINS.find(s => s.key === (this.powerShown || wearing));
    this.powerLine.setText(PORTRAIT ? shown.power : shown.name + ' power: ' + shown.power + (shown.key === 'classic' ? '' : '  (a bit less online)'))
      .setColor(Rewards.isUnlocked(shown.key) ? '#7cfc00' : '#aaaaaa');
    this.skinCards.forEach(({ skin, back, note }) => {
      const open = Rewards.isUnlocked(skin.key);
      back.setFillStyle(skin.key === wearing ? 0x3d3d1a : 0x222222).setStrokeStyle(3, skin.key === wearing ? 0xffd700 : 0x444444);
      note.setText(skin.key === wearing ? 'Wearing ✓' : open ? (TOUCH ? 'Tap' : 'Click') + ' to wear' : '🔒 ' + skin.how)
        .setColor(skin.key === wearing ? '#ffd700' : open ? '#7cfc00' : '#aaaaaa');
    });
    if (this.colorLabel) this.colorLabel.setText('Your color: ' + PLAYER_COLORS[this.colorChoice].name
      + (wearing !== 'classic' ? '  (' + Rewards.SKINS.find(s => s.key === wearing).name + ' skin)' : ''));
    this.drawSkinCards();
  }

  // A little snake on each card, in your color with that skin (locked ones dimmed).
  drawSkinCards() {
    const points = [5, 4, 3, 2, 1, 0].map(x => ({ x, y: 0 }));
    this.skinCards.forEach(({ skin, art }) => {
      const colors = SKIN_COLORS[skin.key] || PLAYER_COLORS[this.colorChoice];
      art.clear();
      drawSnakeBody(art, points, { x: 1, y: 0 }, colors.body, colors.head, Rewards.isUnlocked(skin.key) ? 1 : 0.3, true, this.time.now, skin.key);
    });
  }

  // "How to play": a button in the top-left corner (keyboard: P) opens
  // the controls and a list of what every power-up and power down does.
  // On a wide screen it's two columns side by side; on a phone, one long one.
  setupLegend() {
    const controls = ['HOW TO MOVE',
      '⌨️  Pick Arrows, W A S D or Mouse',
      '    on the start screen (C switches)',
      '🖱️  Mouse: your snake follows it',
      '👥  2 players: each picks Arrows,',
      '    W A S D or Mouse before playing',
      '📱  Phone: swipe the way to go',
      '🍎  Eat food to grow',
      '🔥  Eat apples fast, one after another: combo bonus!',
      '💥  Don\'t hit walls or snakes',
      '🗺️  Green edge? Go through it!',
      '🔢  The number on a snake is its size',
      '😋  Run into a smaller snake: eat it!',
      '    Same size or bigger: you crash',
      '🪨  Rocks: longer than the number?',
      '    Smash through (-' + ROCK_SMASH_COSTS + '). If not: crash'];
    const ups = ['POWER-UPS'];
    Object.values(POWER_UPS).filter(pu => pu.good === true && !pu.onlineOnly).forEach(pu => ups.push(pu.icon + '  ' + pu.about));
    const downs = ['POWER DOWNS'];
    Object.values(POWER_UPS).filter(pu => pu.good === false).forEach(pu => downs.push(pu.icon + '  ' + pu.about));
    const extras = [];
    Object.values(POWER_UPS).filter(pu => pu.good === null).forEach(pu => extras.push(pu.icon + '  ' + pu.about));
    extras.push('🌐  Online extras: ' + Object.values(POWER_UPS).filter(pu => pu.onlineOnly).map(pu => pu.icon).join(' '));
    extras.push('🧩  Mazes: find orange on the map.', '    In green, out red: +' + MAZE_PRIZE + '!', '    Hit a wall: crash.',
      '', 'All but ⭐ and 💀 last ' + EFFECT_LASTS / 1000 + ' seconds.');

    const box = this.add.container(0, 0).setDepth(10).setVisible(false);
    box.add(this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.92).setOrigin(0).setInteractive());
    const style = { fontSize: PORTRAIT ? '14px' : '16px', color: '#ffffff', align: 'left', lineSpacing: PORTRAIT ? 5 : 3 };
    if (PORTRAIT) {
      box.add(this.add.text(WIDTH / 2, HEIGHT / 2 - 10, [...controls, '', ...ups, '', ...downs, '', ...extras].join('\n'), style).setOrigin(0.5));
    } else {
      box.add(this.add.text(30, 50, [...controls, '', ...ups].join('\n'), style));
      box.add(this.add.text(WIDTH / 2 + 45, 50, [...downs, '', ...extras].join('\n'), style));
    }
    box.add(this.add.text(WIDTH / 2, HEIGHT - 30, TOUCH ? 'Tap to close' : 'Click or press P to close',
      { fontSize: '18px', color: '#ffff66' }).setOrigin(0.5));
    const toggle = () => box.setVisible(!box.visible);
    box.list[0].on('pointerdown', toggle);

    this.add.text(10, 10, '❔ How to play', { fontSize: '18px', color: '#111111', backgroundColor: '#7cfc00', padding: { x: 8, y: 6 } })
      .setInteractive({ useHandCursor: true }).on('pointerdown', toggle);
    this.input.keyboard.on('keydown-P', toggle);
    this.legend = box;
  }

  // Arrow keys, W A S D or mouse? A row of buttons under the title; the
  // picked one is lit up. The C key moves to the next one. Phones always
  // swipe, so it's only on computers.
  // (With 2 players on one keyboard, it's always W A S D vs the arrows.)
  setupControlsPicker() {
    const y = HEIGHT / 2 - 168;
    const labels = { keys: '⬆️ Arrows', wasd: '🔤 W A S D', mouse: '🖱️ Mouse' };
    const style = { fontSize: '18px', padding: { x: 10, y: 5 } };
    const parts = [this.add.text(0, y, 'Steer with:', { fontSize: '18px', color: '#cccccc' }).setOrigin(0, 0.5)];
    const buttons = {};
    CONTROLS.forEach(choice => {
      buttons[choice] = this.add.text(0, y, labels[choice], style).setOrigin(0, 0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => pick(choice));
      parts.push(buttons[choice]);
    });
    parts.push(this.add.text(0, y, '(C)', { fontSize: '16px', color: '#888888' }).setOrigin(0, 0.5));

    // Line them all up across the middle of the screen.
    const gap = 12;
    let x = WIDTH / 2 - (parts.reduce((total, part) => total + part.width, 0) + gap * (parts.length - 1)) / 2;
    parts.forEach(part => { part.x = x; x += part.width + gap; });

    const show = () => CONTROLS.forEach(choice => {
      const picked = choice === loadControls();
      buttons[choice].setColor(picked ? '#111111' : '#cccccc').setBackgroundColor(picked ? '#3fa9f5' : '#333333');
    });
    const pick = choice => { saveControls(choice); show(); };
    this.input.keyboard.on('keydown-C', () => pick(CONTROLS[(CONTROLS.indexOf(loadControls()) + 1) % CONTROLS.length]));
    show();
  }

  // "Computer snakes: Off / On" for Easy and Medium. Keyboard: S.
  setupSnakesSwitch(y) {
    const style = { fontSize: '18px', padding: { x: 10, y: 5 } };
    const parts = [
      this.add.text(0, y, '🐍 Computer snakes:', { fontSize: '18px', color: '#ffffff' }).setOrigin(0, 0.5),
      this.add.text(0, y, 'Off', style).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => pick(false)),
      this.add.text(0, y, 'On', style).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => pick(true)),
    ];
    if (!TOUCH) parts.push(this.add.text(0, y, '(S)', { fontSize: '16px', color: '#888888' }).setOrigin(0, 0.5));
    let x = WIDTH / 2 - (parts.reduce((total, part) => total + part.width, 0) + 10 * (parts.length - 1)) / 2;
    parts.forEach(part => { part.x = x; x += part.width + 10; });
    const show = () => {
      const on = loadSnakesOn();
      parts[1].setColor(on ? '#cccccc' : '#111111').setBackgroundColor(on ? '#333333' : '#ffa500');
      parts[2].setColor(on ? '#111111' : '#cccccc').setBackgroundColor(on ? '#ffa500' : '#333333');
    };
    const pick = on => { saveSnakesOn(on); show(); };
    this.input.keyboard.on('keydown-S', () => pick(!loadSnakesOn()));
    show();
  }

  // 2 players: before the game starts, each player picks how they steer.
  // Picking something the other player has swaps them.
  showTwoPlayerSetup(modeKey) {
    if (this.twoPlayerSetup) this.twoPlayerSetup.destroy();
    const box = this.add.container(0, 0).setDepth(10);
    this.twoPlayerSetup = box;
    box.add(this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.92).setOrigin(0).setInteractive());
    box.add(this.add.text(WIDTH / 2, HEIGHT / 2 - 170, '2 PLAYERS', { fontSize: '40px', color: '#3fa9f5' }).setOrigin(0.5));
    box.add(this.add.text(WIDTH / 2, HEIGHT / 2 - 125, 'How does each player want to steer?', { fontSize: '18px', color: '#cccccc' }).setOrigin(0.5));

    const choices = loadTwoPlayerControls();
    const labels = { keys: '⬆️ Arrows', wasd: '🔤 W A S D', mouse: '🖱️ Mouse' };
    const colors = [PLAYER_COLORS[this.colorChoice], secondColor(this.colorChoice)];
    const rows = [0, 1].map(player => {
      const y = HEIGHT / 2 - 60 + player * 70;
      const hex = '#' + colors[player].head.toString(16).padStart(6, '0');
      const parts = [this.add.text(0, y, 'Player ' + (player + 1) + ':', { fontSize: '20px', color: hex }).setOrigin(0, 0.5)];
      const buttons = {};
      CONTROLS.forEach(choice => {
        buttons[choice] = this.add.text(0, y, labels[choice], { fontSize: '18px', padding: { x: 10, y: 5 } })
          .setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => pick(player, choice));
        parts.push(buttons[choice]);
      });
      let x = WIDTH / 2 - (parts.reduce((total, part) => total + part.width, 0) + 12 * (parts.length - 1)) / 2;
      parts.forEach(part => { part.x = x; x += part.width + 12; box.add(part); });
      return buttons;
    });
    const show = () => rows.forEach((buttons, player) => CONTROLS.forEach(choice => {
      const picked = choices[player] === choice;
      buttons[choice].setColor(picked ? '#111111' : '#cccccc').setBackgroundColor(picked ? '#3fa9f5' : '#333333');
    }));
    const pick = (player, choice) => {
      const other = 1 - player;
      if (choices[other] === choice) choices[other] = choices[player]; // swap
      choices[player] = choice;
      saveTwoPlayerControls(choices);
      show();
    };
    show();

    const start = () => this.scene.start('Game', { mode: modeKey, color: this.colorChoice });
    const back = () => { box.destroy(); this.twoPlayerSetup = null; };
    box.add(makeButton(this, WIDTH / 2, HEIGHT / 2 + 100, 'Start (SPACE)', '#7cfc00', start));
    box.add(makeButton(this, WIDTH / 2, HEIGHT / 2 + 165, 'Back (ESC)', '#cccccc', back));
    this.input.keyboard.once('keydown-SPACE', () => { if (this.twoPlayerSetup) start(); });
    this.input.keyboard.once('keydown-ESC', () => { if (this.twoPlayerSetup) back(); });
  }

  // A row of colored squares. Click or tap one to pick it (on a computer,
  // the left/right arrow keys work too). The picked one gets a white outline.
  setupColorPicker(y) {
    this.colorChoice = loadColorChoice();
    const size = 32, gap = 10;
    const rowWidth = PLAYER_COLORS.length * size + (PLAYER_COLORS.length - 1) * gap;
    const firstX = WIDTH / 2 - rowWidth / 2 + size / 2;

    this.colorLabel = this.add.text(WIDTH / 2, y - 34, '', { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);
    this.colorOutline = this.add.rectangle(0, y, size + 8, size + 8).setStrokeStyle(3, 0xffffff);

    const pick = i => {
      this.colorChoice = i;
      saveColorChoice(i);
      this.colorOutline.x = firstX + i * (size + gap);
      if (this.skinCards) this.showSkinChoice(); // says the color, and the skin you're wearing
      else this.colorLabel.setText('Your color: ' + PLAYER_COLORS[i].name);
    };

    PLAYER_COLORS.forEach((color, i) => {
      this.add.rectangle(firstX + i * (size + gap), y, size, size, color.body)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => pick(i));
    });

    const count = PLAYER_COLORS.length;
    this.input.keyboard.on('keydown-LEFT', () => pick((this.colorChoice + count - 1) % count));
    this.input.keyboard.on('keydown-RIGHT', () => pick((this.colorChoice + 1) % count));

    pick(this.colorChoice);
  }
}


// =====================================================================
//  3. THE GAME
// =====================================================================

class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  // ----- 3a. Setup: runs once each time a new game starts -----
  // data is the { mode, color } sent from the start screen.
  create(data) {
    this.modeKey = data.mode;
    this.mode = MODES[data.mode];
    this.colorChoice = data.color;
    this.online = null;        // filled in for online games (see 3i)
    this.outText = null;       // "Crashed!" message, online
    this.timer = null;
    this.lastSentTurn = null;

    // The size of one screen, and of the whole world, in squares.
    // Online games use the shared square screens.
    this.frameCols = this.mode.online ? ONLINE_COLS : COLS;
    this.frameRows = this.mode.online ? ONLINE_ROWS : ROWS;
    this.screens = this.mode.screens || 1;
    this.cols = this.frameCols * this.screens;
    this.rows = this.frameRows * this.screens;

    // A Graphics object is like a blank canvas we can draw shapes on.
    // The board and snakes go on this one; the cameras (see 3j) decide
    // which part of it you see.
    this.field = this.add.image(0, 0, makeField(this, this.cols, this.rows)).setOrigin(0).setDepth(-10); // the grass (see 3n)
    makeSpark(this);
    this.graphics = this.add.graphics();
    this.fog = this.add.graphics().setDepth(5); // for lights out
    this.setupCameras();

    // The players. Each one is a snake: a list of grid positions, item 0 is the head.
    // With one player it starts in the middle of the first screen. With two,
    // player 1 starts at the top facing right and player 2 at the bottom facing left.
    const midX = Math.floor(this.frameCols / 2), midY = Math.floor(this.frameRows / 2);
    const colors = [PLAYER_COLORS[data.color], secondColor(data.color)];
    this.players = [];
    if (this.mode.online) {
      this.setupOnlinePlayers(data.online); // see 3i
    } else if (this.mode.players === 2) {
      const topY = Math.floor(this.rows / 3), bottomY = Math.floor(this.rows * 2 / 3);
      this.players.push(this.makePlayer('P1', colors[0], [{ x: midX, y: topY }, { x: midX - 1, y: topY }, { x: midX - 2, y: topY }], { x: 1, y: 0 }));
      this.players.push(this.makePlayer('P2', colors[1], [{ x: midX, y: bottomY }, { x: midX + 1, y: bottomY }, { x: midX + 2, y: bottomY }], { x: -1, y: 0 }));
    } else {
      this.players.push(this.makePlayer('You', colors[0], [{ x: midX, y: midY }, { x: midX - 1, y: midY }, { x: midX - 2, y: midY }], { x: 1, y: 0 }));
    }
    // "me" is the snake this screen's player controls (player 1 with two on one keyboard).
    // It wears the skin picked on the start screen (online, everyone's comes from the room).
    if (!this.online) {
      this.me = this.players[0];
      this.me.skin = Rewards.skin();
      if (this.players.length === 1) this.skinPower(this.me); // see 3o
    }

    // Score, shown in the top-left corner.
    this.scoreText = this.onHud(this.add.text(10, 10, '', { fontSize: '20px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }));
    this.updateScoreText();
    addSoundButtons(this, 10, HEIGHT - 36, button => this.onHud(button));

    this.setupControls();

    // Food: a list of spots, so there can be more than one piece at a time.
    this.computerSnakes = [];
    this.foods = [];
    this.leftovers = []; // pieces of crashed computer snakes, free to eat (see 3h)
    this.rocks = new Map();      // "x,y" of every rock square -> its pile's power (see 3l)
    this.sizeLabels = new Map(); // the size number on each snake (see 3m)
    this.rockLabels = [];
    this.placeRocks();
    for (let i = 0; i < this.mode.food; i++) this.foods.push(this.freeSpot());

    // Power-ups (see 3e). "clock" counts the milliseconds the game has run.
    this.clock = 0;
    this.powerUps = [];          // { x, y, kind, until }
    this.powerUpIcons = {};      // the emoji drawn on the board for each one
    this.pops = [];              // "+3", "FAST!" etc. to float up after this step
    this.nextPowerUpAt = POWER_UP_EVERY / 2;
    this.maze = null;            // see 3k
    this.nextMazeAt = MAZE_FIRST;

    // Computer snakes (see section 3h).
    // They get the computer colors in order, skipping the players' colors.
    const computerColors = COMPUTER_COLORS.filter(c => !this.players.some(p => p.color.body === c));
    // (In Easy and Medium, only if "Computer snakes" is switched on.)
    this.snakesOn = data.snakes !== undefined ? data.snakes : loadSnakesOn();
    const computerCount = this.mode.players === 1 && !this.snakesOn ? 0 : this.mode.computerSnakes;
    for (let i = 0; i < computerCount; i++) this.spawnComputerSnake(computerColors[i % computerColors.length]);

    // Run step() over and over on a timer, instead of every frame,
    // so the snakes move one square at a time. It runs twice as often as
    // a normal snake moves, so a sped-up snake can move on every tick.
    // Online, only the host runs the game; everyone else draws what the host sends (see 3i).
    if (!this.online || this.online.isHost) {
      this.timer = this.time.addEvent({ delay: MOVE_EVERY / 2, loop: true, callback: this.step, callbackScope: this });
    }
    if (this.online) this.startOnline();

    // Count it for the stats page (stats.js). Online, only the host counts it.
    // Count it for rewards too (rewards.js); a 5th game unlocks a skin.
    // Rewards are earned in games on this device, not online.
    this.toasts = [];
    if (!this.online) this.toast(Rewards.startGame(this.modeKey));
    this.frozenUntil = 0;
    if (!this.online && this.players.length === 1 && Rewards.has('items')) this.setupItemBar(); // see 3o
    if (TestMode.on() && this.players.length === 1) this.setupTestPanel(); // see 3p
    this.events.once('shutdown', () => Rewards.endGame());

    if (!this.online || this.online.isHost) {
      Stats.countGame(this.mode.online ? 'online' : this.mode.players === 1 ? Leaderboard.boardFor(this.modeKey, this.snakesOn) : this.modeKey);
    }

    this.draw();
  }

  // Everything we need to know about one player's snake.
  makePlayer(name, color, body, direction, id) {
    return {
      id, name, color, body,
      direction,               // the way the snake is moving now
      nextDirection: direction, // the way the player last pressed
      score: 0,
      crashed: false,
      grow: 0,                 // squares still to grow (from a star)
      until: {},               // power-ups that last a while: { speed: when it ends, ... }
      skin: 'classic',         // see rewards.js
      combo: 0,                // apples eaten quickly in a row
      lastAteAt: -Infinity,
    };
  }

  // Is this player sped up, a ghost, slowed down or backwards right now?
  has(player, kind) {
    return (player.until[kind] || 0) > this.clock;
  }

  updateScoreText() {
    if (this.players.length === 1) this.scoreText.setText('Score: ' + this.players[0].score + this.comboText(this.players[0]));
    else this.scoreText.setText(this.players.map(p => p.name + ': ' + (p.crashed && !this.online ? 'out' : p.score) + this.comboText(p)).join('    '));
    // Online: how long is left in the round.
    if (this.online) {
      const secondsLeft = Math.max(0, Math.ceil((ROUND_LENGTH - this.clock) / 1000));
      this.scoreText.setText('⏱ ' + Math.floor(secondsLeft / 60) + ':' + String(secondsLeft % 60).padStart(2, '0') + '    ' + this.scoreText.text);
    }
  }

  // "🔥 x3" next to the score while a combo is going.
  comboText(p) {
    return p.combo >= 2 && this.clock - p.lastAteAt <= this.comboWindow(p) ? '  🔥 x' + p.combo : '';
  }

  // How long between apples keeps a combo going (🐯 tiger skin: longer).
  comboWindow(p) {
    return COMBO_WINDOW + (p.power === 'tiger' ? this.skinPowers().tigerExtra : 0);
  }

  // ----- 3b. Controls -----
  // One player: arrow keys or swipes.
  // Two players: player 1 uses W A S D, player 2 uses the arrow keys.
  setupControls() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    // Swipes: remember where the finger went down, and when it lifts,
    // turn whichever way it moved the most (left/right or up/down).
    this.input.on('pointerdown', pointer => { this.swipeStart = { x: pointer.x, y: pointer.y }; });
    this.input.on('pointerup', pointer => {
      if (!this.swipeStart) return;
      const dx = pointer.x - this.swipeStart.x;
      const dy = pointer.y - this.swipeStart.y;
      this.swipeStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return; // too short, just a tap
      if (Math.abs(dx) > Math.abs(dy)) this.turn(this.me, dx > 0 ? 1 : -1, 0);
      else this.turn(this.me, 0, dy > 0 ? 1 : -1);
    });

    // Who steers how, as picked on the start screen: a list of
    // { player, how } where how is 'keys' (arrows), 'wasd' or 'mouse'.
    // With 2 players on one computer, each has their own pick.
    if (TOUCH) this.steering = [];
    else if (this.players.length === 2 && !this.online) {
      const picks = loadTwoPlayerControls();
      this.steering = [{ player: this.players[0], how: picks[0] }, { player: this.players[1], how: picks[1] }];
    } else this.steering = [{ player: this.me, how: loadControls() }];

    // On your own with the mouse picked, the arrow keys still work too:
    // pressing one steers with the keys until the mouse moves again.
    this.mouseSteering = true;
    this.input.on('pointermove', () => { this.mouseSteering = true; });
  }

  // Turn toward the mouse pointer: go whichever way it's furthest away
  // (across or up/down). If that's straight back, go the other way round.
  steerToMouse(me) {
    if (!this.mouseSteering || !me || me.crashed || !me.body.length) return;
    const pointer = this.input.activePointer;
    const spot = this.cameras.main.getWorldPoint(pointer.x, pointer.y); // where the pointer is on the board
    const dx = spot.x - (me.body[0].x + 0.5) * CELL;
    const dy = spot.y - (me.body[0].y + 0.5) * CELL;
    if (Math.abs(dx) < CELL / 2 && Math.abs(dy) < CELL / 2) return; // on the head already
    const across = { x: Math.sign(dx), y: 0 }, upDown = { x: 0, y: Math.sign(dy) };
    const [first, second] = Math.abs(dx) > Math.abs(dy) ? [across, upDown] : [upDown, across];
    const backwards = d => d.x === -me.direction.x && d.y === -me.direction.y;
    const pick = !backwards(first) ? first : (second.x || second.y) ? second : null;
    if (pick) this.turn(me, pick.x, pick.y);
  }

  // Phaser calls update() about 60 times per second. We check the keys here.
  // We only remember the choice; the snake actually turns on its next step.
  update() {
    this.spinScreen(); // see 3j

    // Each player steers the way they picked (see the end of setupControls).
    const arrows = [this.cursors.left, this.cursors.right, this.cursors.up, this.cursors.down];
    const wasd = [this.wasd.A, this.wasd.D, this.wasd.W, this.wasd.S];
    const steer = (player, [left, right, up, down]) => {
      if (left.isDown) this.turn(player, -1, 0);
      if (right.isDown) this.turn(player, 1, 0);
      if (up.isDown) this.turn(player, 0, -1);
      if (down.isDown) this.turn(player, 0, 1);
      return left.isDown || right.isDown || up.isDown || down.isDown;
    };
    this.steering.forEach(({ player, how }) => {
      if (how === 'keys') steer(player, arrows);
      if (how === 'wasd') steer(player, wasd);
      if (how === 'mouse') {
        // On your own, the arrow keys work too, until the mouse moves again.
        if (this.steering.length === 1 && steer(player, arrows)) this.mouseSteering = false;
        this.steerToMouse(player);
      }
    });

    // Draw every frame (not just every step), so snakes glide smoothly
    // from square to square (see 3n).
    this.draw();
  }

  // Used by the keys and swipes.
  turn(player, x, y) {
    if (!player || player.crashed) return;
    if (!this.online && this.has(player, 'flip')) { x = -x; y = -y; } // backwards! (online, the host flips it)
    // Don't let the snake turn straight back into itself.
    if (x === -player.direction.x && y === -player.direction.y) return;
    // Online and not the host: ask the host to turn us (only when it changes,
    // since update() runs 60 times a second while a key is held down).
    if (this.online && !this.online.isHost) {
      if (this.lastSentTurn === x + ',' + y) return;
      this.lastSentTurn = x + ',' + y;
      Online.sendTurn(x, y);
      return;
    }
    player.nextDirection = { x, y };
  }

  // ----- 3c. Movement: one step of the game -----
  step() {
    // Every other tick is a normal step. On the ones in between, only
    // sped-up snakes move. Slowed-down snakes move every fourth tick.
    this.clock += MOVE_EVERY / 2;
    const fullStep = this.clock % MOVE_EVERY === 0;
    const slowStep = this.clock % (MOVE_EVERY * 2) === 0;
    const alive = this.players.filter(p => !p.crashed && !this.has(p, 'ice') // 🧊 frozen: no moving
      && (this.has(p, 'speed') || (this.has(p, 'slow') ? slowStep : fullStep)));
    if (alive.length === 0 && !fullStep) return; // nobody moves this tick

    // First work out where every moving player's new head goes:
    // one square in their current direction.
    alive.forEach(p => {
      p.scoreBefore = p.score; // for 💰 double points (see 3o)
      p.direction = p.nextDirection;
      p.newHead = { x: p.body[0].x + p.direction.x, y: p.body[0].y + p.direction.y };
    });

    // Then check what each one runs into:
    //  - a wall: crash
    //  - a rock: smash through it if you're bigger than its number (see 3l)
    //  - a smaller snake: swallow it! (see 3m)
    //  - its own body, or a snake the same size or bigger: crash
    //    (head-on, the bigger one wins; the same size, both crash)
    // Ghosts don't touch snakes, but still crash into walls and rocks.
    const crashedNow = [];
    const meals = [];
    alive.forEach(p => {
      if (this.smashRock(p, p.newHead)) return;
      if (this.hitsWall(p.newHead)) { crashedNow.push(p); return; }
      if (this.has(p, 'ghost')) return;
      const headOn = alive.find(other => other !== p && !this.has(other, 'ghost') && other.newHead.x === p.newHead.x && other.newHead.y === p.newHead.y);
      const other = headOn || this.snakeAt(p.newHead, alive, p);
      if (!other) return;
      if (other !== p && p.body.length > other.body.length) meals.push([p, other]);
      else crashedNow.push(p);
    });
    crashedNow.forEach(p => this.knockOut(p, true));
    meals.forEach(([eater, victim]) => { if (!eater.crashed) this.swallow(eater, victim); });

    if (this.online) {
      // Online, crashed players come back a few seconds later (see
      // respawnPlayers). The round ends when the time runs out.
      if (this.clock >= ROUND_LENGTH) {
        this.gameOver();
        return;
      }
      if (fullStep) this.respawnPlayers();
    } else if (this.players.some(p => p.crashed)) {
      this.gameOver();
      return;
    }

    // Moving = add a new head at the front, remove the last tail square.
    alive.filter(p => !p.crashed && !p.bounced).forEach(p => {
      this.noteMove(p, this.has(p, 'speed') ? MOVE_EVERY / 2 : this.has(p, 'slow') ? MOVE_EVERY * 2 : MOVE_EVERY); // see 3n
      p.body.unshift(p.newHead);
      if (this.eatFoodAt(p.newHead)) {
        this.pops.push({ x: p.newHead.x, y: p.newHead.y, kind: 'eat' });
        // Ate the food! Skipping pop() leaves the tail where it was,
        // so the snake ends up one square longer.
        p.score += 1;
        this.countCombo(p);
        this.reward(p, 'apple');
      } else if (p.grow > 0) {
        p.grow -= 1; // still growing from a star: keep the tail too
      } else {
        p.body.pop();
      }
      // A dinosaur eats with the wide part of its head too.
      const side = this.fatCells(p)[0];
      if (side && this.eatFoodAt(side)) {
        p.score += 1;
        p.grow += 1;
        this.countCombo(p);
        this.reward(p, 'apple');
      }
      // Smashing a rock costs a couple of squares (never shorter than 2).
      if (p.smashed) {
        p.body.splice(Math.max(2, p.body.length - ROCK_SMASH_COSTS));
        p.smashed = false;
      }
      this.takePowerUpAt(p);
      this.checkMaze(p); // see 3k
    });
    alive.forEach(p => this.afterItems(p)); // shield bounces and double points (see 3o)
    this.updateScoreText();
    if (this.me && !this.me.crashed) {
      this.reward(this.me, 'score', this.me.score);
      const seconds = Math.floor(this.clock / 1000);
      if (seconds !== this.me.secondsNoted) { this.me.secondsNoted = seconds; this.reward(this.me, 'time', seconds); }
    }

    // Now the computer snakes take their step, and power-ups come and go.
    if (fullStep) {
      if (this.clock >= this.frozenUntil) this.moveComputerSnakes(); // ❄️ freeze stops them (see 3o)
      this.pullApples();
      this.updatePowerUps();
      this.updateMaze();
      // A computer snake might have swallowed you.
      if (!this.online && this.players.some(p => p.crashed)) {
        this.gameOver();
        return;
      }
    }

    // Online host: send everyone the new positions.
    if (this.online) {
      Online.sendState({ players: this.players, foods: this.foods, leftovers: this.leftovers,
        powerUps: this.powerUps, pops: this.pops, clock: this.clock });
    }

    this.draw();
    this.showPops(this.pops);
    this.pops = [];
  }

  // ----- 3d. Crash checks -----
  // The edge of the world, a maze wall (see 3k) or a rock (see 3l).
  hitsWall(spot) {
    return spot.x < 0 || spot.x >= this.cols || spot.y < 0 || spot.y >= this.rows
      || !!(this.maze && this.maze.walls.has(spot.x + ',' + spot.y))
      || !!(this.rocks && this.rocks.has(spot.x + ',' + spot.y));
  }

  // Is anything (any snake, food, a wall or a rock) on this square?
  isTaken(spot) {
    if (this.hitsWall(spot)) return true;
    const allBodies = [...this.players.filter(p => !(this.online && p.crashed)).map(p => p.body), ...this.computerSnakes.filter(cs => cs.alive).map(cs => cs.body)];
    return allBodies.some(body => body.some(part => part.x === spot.x && part.y === spot.y))
      || (this.foods || []).some(food => food.x === spot.x && food.y === spot.y)
      || (this.leftovers || []).some(piece => piece.x === spot.x && piece.y === spot.y)
      || (this.powerUps || []).some(pu => pu.x === spot.x && pu.y === spot.y);
  }

  // ----- 3e. Food -----
  freeSpot() {
    // Pick random squares until we find an empty one.
    let spot;
    do {
      spot = {
        x: Phaser.Math.Between(0, this.cols - 1),
        y: Phaser.Math.Between(0, this.rows - 1),
      };
    } while (this.isTaken(spot));
    return spot;
  }

  // If there's food on this spot, eat it and return true. Otherwise return false.
  eatFoodAt(spot) {
    // Red food: eat it and put a new piece somewhere else.
    const i = this.foods.findIndex(food => food.x === spot.x && food.y === spot.y);
    if (i !== -1) {
      this.foods.splice(i, 1);
      this.foods.push(this.freeSpot());
      return true;
    }
    // A leftover piece of a crashed snake: eat it. These don't come back.
    const j = this.leftovers.findIndex(piece => piece.x === spot.x && piece.y === spot.y);
    if (j !== -1) {
      this.leftovers.splice(j, 1);
      return true;
    }
    return false;
  }

  // Another apple: if it's soon after the last one, the combo goes up
  // and gives bonus points. Too slow and it starts again at 1.
  countCombo(p) {
    p.combo = this.clock - p.lastAteAt <= this.comboWindow(p) ? p.combo + 1 : 1;
    p.lastAteAt = this.clock;
    // 💰 Gold skin: every 5th apple is worth more.
    p.apples = (p.apples || 0) + 1;
    if (p.power === 'gold' && p.apples % GOLD_EVERY === 0) {
      p.score += this.skinPowers().goldBonus;
      this.pops.push({ x: p.body[0].x, y: p.body[0].y, kind: 'golden' });
    }
    if (p.combo < 2) return;
    p.score += Math.min(p.combo - 1, COMBO_MAX_BONUS);
    this.pops.push({ x: p.body[0].x, y: p.body[0].y, kind: 'combo' + p.combo });
    this.reward(p, 'combo', p.combo);
  }

  // Tell rewards.js something happened to your snake (not online), and
  // show anything that just unlocked.
  reward(p, what, value) {
    if (this.online || p !== this.me) return;
    this.toast(Rewards.note(what, value));
  }

  // A gold banner that slides down from the top for a few seconds.
  // Several at once stack up under each other.
  toast(messages) {
    messages.forEach(message => {
      const slot = [0, 1, 2, 3].find(i => !this.toasts.some(t => t.slot === i)) ?? 0;
      const text = this.onHud(this.add.text(WIDTH / 2, 0, message, {
        fontSize: '20px', fontStyle: 'bold', color: '#111111', backgroundColor: '#ffd700', padding: { x: 14, y: 8 },
      }).setOrigin(0.5, 0).setDepth(20).setAlpha(0));
      text.slot = slot;
      this.toasts.push(text);
      Sound.play('unlock');
      this.tweens.add({ targets: text, y: 46 + slot * 44, alpha: 1, duration: 300, ease: 'Back.Out' });
      this.tweens.add({ targets: text, alpha: 0, delay: 3200, duration: 400, onComplete: () => {
        this.toasts = this.toasts.filter(t => t !== text);
        text.destroy();
      } });
    });
  }

  // Power-ups: did this player just run over one?
  takePowerUpAt(p) {
    const i = this.powerUps.findIndex(pu => pu.x === p.body[0].x && pu.y === p.body[0].y);
    if (i === -1) return;
    let kind = this.powerUps[i].kind;
    this.powerUps.splice(i, 1);
    // A surprise turns into one of the others.
    if (kind === 'mystery') kind = Phaser.Utils.Array.GetRandom(this.powerUpKinds().filter(k => k !== 'mystery'));
    this.usePowerUp(p, kind);
    this.pops.push({ x: p.body[0].x, y: p.body[0].y, kind });
    this.reward(p, 'powerUp');
  }

  // What each power-up does.
  usePowerUp(p, kind) {
    // The online extras (see POWER_UPS).
    const others = this.players.filter(o => o !== p && !o.crashed);
    const extras = {
      rocket: () => { p.until.speed = p.until.ghost = this.clock + 3000; delete p.until.slow; },
      goal: () => { p.score += 3; },
      pizza: () => { p.grow += 5; p.score += 5; },
      crown: () => { p.until.double = this.clock + 10000; },
      magnet: () => { p.until.magnet = this.clock + ITEM_LASTS.magnet; },
      rainbow: () => { p.until.rainbow = this.clock + 10000; },
      ice: () => others.forEach(o => { o.until.ice = this.clock + 2000; }),
      poop: () => others.forEach(o => { o.until.slow = this.clock + 4000; delete o.until.speed; }),
    };
    if (extras[kind]) { extras[kind](); return; }
    if (kind === 'grow') {
      p.grow += POWER_UP_SIZE;   // grows over the next few steps
      p.score += POWER_UP_SIZE;
    }
    if (kind === 'shrink') {
      p.grow = 0;
      p.body.splice(Math.max(2, p.body.length - POWER_UP_SIZE)); // never shorter than 2
      p.score = Math.max(0, p.score - POWER_UP_SIZE);
    }
    // All the others last a few seconds. Speed and slow cancel each other out.
    if (kind !== 'grow' && kind !== 'shrink') {
      const lucky = p.power === 'rainbow' && POWER_UPS[kind].good; // 🌈 rainbow skin
      p.until[kind] = this.clock + EFFECT_LASTS * (lucky ? this.skinPowers().luckyTimes : 1);
      if (kind === 'speed') delete p.until.slow;
      if (kind === 'slow') delete p.until.speed;
    }
  }

  // The power-ups that can show up in this mode.
  powerUpKinds() {
    return Object.keys(POWER_UPS).filter(kind => (!POWER_UPS[kind].rocksOnly || this.mode.rocks) && (!POWER_UPS[kind].onlineOnly || this.mode.online));
  }

  // Old power-ups disappear; now and then a new one shows up.
  updatePowerUps() {
    this.powerUps = this.powerUps.filter(pu => pu.until > this.clock);
    if (!this.mode.powerUps || this.clock < this.nextPowerUpAt) return;
    const screenCount = this.screens * this.screens;
    const fewer = this.mode.powerUps === 1 ? 2 : 1; // Easy: half as often
    this.nextPowerUpAt = this.clock + POWER_UP_EVERY * fewer / screenCount;
    if (this.powerUps.length >= this.mode.powerUps * screenCount) return;
    const kind = Phaser.Utils.Array.GetRandom(this.powerUpKinds());
    this.powerUps.push({ ...this.freeSpot(), kind, until: this.clock + POWER_UP_LASTS });
  }

  // "+3", "FAST!" or "-3" floats up from where a power-up was taken.
  showPops(pops) {
    pops.forEach(pop => {
      // A burst of sparkles first (see 3n), then the words, if any.
      // A combo's kind has its number on the end, like combo3.
      const combo = pop.kind.startsWith('combo') ? Number(pop.kind.slice(5)) : 0;
      const bursts = { eat: [0xff5252, 8], crash: [0xffaa00, 26], gulp: [0xffffff, 30], smash: [0x9e9e9e, 16], maze: [0xffd700, 40], shield: [0x66ccff, 30], golden: [0xffd700, 20], shieldBack: [0x8fdcf5, 20] };
      if (combo) bursts[pop.kind] = [0xffa000, 10 + combo * 4];
      const [color, count] = bursts[pop.kind] || [POWER_UPS[pop.kind] && POWER_UPS[pop.kind].good === false ? 0xff4444 : 0x7cfc00, 18];
      this.burst(pop.x, pop.y, color, count);
      // A sound too, if it happened on the screen you're looking at.
      const here = this.screenOf(pop);
      if (this.screenShown === null || this.screenShown === here.sx + ',' + here.sy) {
        const kind = POWER_UPS[pop.kind] ? (POWER_UPS[pop.kind].good === false ? 'powerdown' : 'powerup') : combo ? 'combo' : pop.kind === 'shield' ? 'smash' : pop.kind === 'golden' || pop.kind === 'shieldBack' ? 'powerup' : pop.kind;
        Sound.play(kind, combo);
      }
      const extras = {
        maze: { says: 'MAZE BEATEN! +' + MAZE_PRIZE, good: true },
        gulp: { says: 'GULP!', good: true },
        smash: { says: 'SMASH! -' + ROCK_SMASH_COSTS, good: true },
        shield: { says: '🛡️ SAVED!', good: true, color: '#66ccff' },
        golden: { says: '💰 GOLDEN! +' + this.skinPowers().goldBonus, good: true, color: '#ffd700' },
        shieldBack: { says: '💎 SHIELD BACK!', good: true, color: '#8fdcf5' },
      };
      if (combo) extras[pop.kind] = { says: 'COMBO x' + combo + '! +' + Math.min(combo - 1, COMBO_MAX_BONUS), good: true, color: '#ffb300', size: Math.min(20 + combo * 2, 34) };
      const info = extras[pop.kind] || POWER_UPS[pop.kind];
      if (!info) return;
      const text = this.inWorld(this.add.text((pop.x + 0.5) * CELL, pop.y * CELL, info.says, {
        fontSize: (info.size || 22) + 'px', fontStyle: 'bold', color: info.color || (info.good ? '#7cfc00' : '#ff4444'), stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(6));
      this.tweens.add({ targets: text, y: text.y - 40, alpha: 0, duration: 900, onComplete: () => text.destroy() });
    });
  }

  // ----- 3f. Drawing -----
  draw() {
    this.graphics.clear();
    this.drawEdges(); // see 3j
    this.drawMaze();  // see 3k
    this.drawRocks(); // see 3l

    // Power-ups: a green (good) or red (bad) glow, with the emoji on top.
    // Each emoji is its own text object, kept from one draw to the next.
    const g = this.graphics;
    const icons = {};
    this.powerUps.forEach(pu => {
      const info = POWER_UPS[pu.kind];
      if (!info) return;
      const pulse = 0.3 + 0.15 * Math.sin(this.time.now / 250 + pu.x);
      g.fillStyle(info.good === null ? 0xffff66 : info.good ? 0x7cfc00 : 0xff4444, pulse); // yellow for a surprise
      g.fillCircle(pu.x * CELL + CELL / 2, pu.y * CELL + CELL / 2, CELL * 0.8);
      const key = pu.x + ',' + pu.y + ',' + pu.kind;
      const icon = this.powerUpIcons[key] || this.inWorld(this.add.text(0, 0, info.icon, { fontSize: (CELL + 2) + 'px' }).setOrigin(0.5));
      delete this.powerUpIcons[key];
      icon.setPosition((pu.x + 0.5) * CELL, (pu.y + 0.5) * CELL);
      // Blink for the last 2 seconds before it disappears.
      icon.setVisible(pu.until - this.clock > 2000 || Math.floor(this.clock / 240) % 2 === 0);
      icons[key] = icon;
    });
    Object.values(this.powerUpIcons).forEach(icon => icon.destroy()); // ones that are gone
    this.powerUpIcons = icons;

    // Food: shiny red apples that bounce (see 3n).
    this.foods.forEach(food => this.drawApple(food));

    // Leftovers from crashed snakes: glowing beads in that snake's color.
    this.leftovers.forEach(piece => {
      const x = piece.x * CELL + CELL / 2, y = piece.y * CELL + CELL / 2;
      g.fillStyle(0x000000, 0.25);
      g.fillCircle(x + 2, y + 3, CELL * 0.3);
      g.fillStyle(piece.color);
      g.fillCircle(x, y, CELL * 0.3);
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(x - CELL * 0.1, y - CELL * 0.1, CELL * 0.1);
    });

    // Computer snakes: each in its own color, with a lighter head.
    this.computerSnakes.filter(cs => cs.alive).forEach(cs => {
      cs.points = this.smoothBody(cs);
      const frozen = this.clock < this.frozenUntil; // icy blue while ❄️ frozen
      const color = frozen ? 0xa8e6ff : cs.color;
      this.drawSnake(cs.points, cs.direction, color, Phaser.Display.Color.IntegerToColor(color).lighten(20).color);
    });

    // Players' snakes, in their colors. The head is a lighter shade.
    // While a power-up is working: sped up, the head flashes white;
    // a ghost is see-through; slowed down or backwards, the head flashes red.
    // (Online, a player who's out has already turned into leftovers.)
    const flash = Math.floor(this.clock / MOVE_EVERY) % 2 === 0;
    this.players.filter(p => !(this.online && p.crashed)).forEach(p => {
      const frozen = this.has(p, 'ice'); // 🧊 icy blue while frozen
      const colors = frozen ? { body: 0xa8e6ff, head: 0xe3f8ff } : SKIN_COLORS[p.skin] || p.color;
      const skin = this.has(p, 'rainbow') ? 'rainbow' : p.skin; // 🌈 for a while
      let head = colors.head;
      if (flash && this.has(p, 'speed')) head = 0xffffff;
      if (flash && (this.has(p, 'slow') || this.has(p, 'flip'))) head = 0xff4444;
      const alpha = this.has(p, 'ghost') ? 0.4 : 1;
      p.points = this.smoothBody(p);
      // A dinosaur has a second body down one side (drawn first, so it's underneath).
      const side = this.fatCells(p).map((part, i) => ({ x: p.points[i].x + part.x - p.body[i].x, y: p.points[i].y + part.y - p.body[i].y }));
      if (side.length) this.drawSnake(side, p.direction, colors.body, colors.body, alpha, false, skin);
      this.drawSnake(p.points, p.direction, colors.body, head, alpha, true, skin);
      // 🛡️ A blue bubble around the head while you have a shield.
      if (p.shield && p.points.length) {
        this.graphics.lineStyle(3, 0x66ccff, 0.6 + 0.3 * Math.sin(this.time.now / 150));
        this.graphics.strokeCircle((p.points[0].x + 0.5) * CELL, (p.points[0].y + 0.5) * CELL, CELL * 0.95);
      }
    });

    if (this.online) this.updateOutText(); // see 3i
    this.drawSizes();     // see 3m
    this.drawLightsOut(); // see 3j
    this.followMe();
    this.drawMiniMap();
  }

  // Draw one snake (see 3n for how it looks). points are where each part
  // of its body is, in squares (they can be in between squares while it glides).
  // face: false leaves off the head (for a dinosaur's extra side).
// skin: the pattern on the body (see rewards.js).
  drawSnake(points, direction, bodyColor, headColor, alpha = 1, face = true, skin = 'classic') {
    drawSnakeBody(this.graphics, points, direction, bodyColor, headColor, alpha, face, this.time.now, skin);
  }

  // ----- 3g. Game over -----
  gameOver() {
    if (this.timer) this.timer.remove(); // stop everything moving
    this.showPops(this.pops);
    this.pops = [];
    this.cameras.main.shake(200, 0.01);

    // Online, the host tells everyone the result, and every screen
    // (including the host's) switches to game over when it arrives.
    // The highest score wins. A tie for first is a draw.
    if (this.online) {
      const best = Math.max(...this.players.map(p => p.score));
      const top = this.players.filter(p => p.score === best);
      const winner = top.length === 1 ? top[0] : null;
      this.draw();
      Online.endGame({
        winner: winner ? winner.name : null,
        winnerColor: winner ? winner.color.head : null,
        scores: this.players.map(p => p.name + ': ' + p.score).join('    '),
      });
      return;
    }

    // What to send to the game over screen.
    const result = { mode: this.modeKey, color: this.colorChoice, snakes: this.snakesOn };

    if (this.players.length === 1) {
      const score = this.players[0].score;
      const best = loadHighScore(this.modeKey);
      result.score = score;
      result.newBest = score > best;
      result.best = Math.max(best, score);
      if (result.newBest && !TestMode.on()) saveHighScore(this.modeKey, score); // test mode doesn't count
    } else {
      // Two players: whoever didn't crash wins. If both crashed, it's a draw.
      const survivors = this.players.filter(p => !p.crashed);
      result.winner = survivors.length === 1 ? survivors[0].name : null;
      result.winnerColor = survivors.length === 1 ? survivors[0].color.head : null;
      result.scores = this.players.map(p => p.name + ': ' + p.score).join('    ');
    }

    // Wait a moment so you can see where the crash was, then show the
    // game over screen. The { } part passes the results along to it.
    this.time.delayedCall(700, () => this.scene.start('GameOver', result));
  }
}


// =====================================================================
//  3h. COMPUTER SNAKES
//  These are added onto the GameScene class above (that's what
//  "GameScene.prototype" means), so they can use this.players, this.foods, etc.
//  Keeping them here makes the "brain" easy to find.
// =====================================================================

// Put a new computer snake on the board, 3 squares long, away from the player.
GameScene.prototype.spawnComputerSnake = function (color) {
  for (let tries = 0; tries < 200; tries++) {
    const head = this.freeSpot();
    const tail1 = { x: head.x - 1, y: head.y };
    const tail2 = { x: head.x - 2, y: head.y };
    const farFromPlayer = this.players.every(p => Math.abs(head.x - p.body[0].x) + Math.abs(head.y - p.body[0].y) > 8);
    if (farFromPlayer && !this.hitsWall(tail2) && !this.isTaken(tail1) && !this.isTaken(tail2)) {
      this.computerSnakes.push({ body: [head, tail1, tail2], direction: { x: 1, y: 0 }, color, alive: true, grow: 0 });
      return;
    }
  }
  // Board too crowded to fit one in. Try again later.
  this.time.delayedCall(RESPAWN_AFTER, () => this.spawnComputerSnake(color));
};

GameScene.prototype.moveComputerSnakes = function () {
  this.computerSnakes.filter(cs => cs.alive).forEach(cs => {
    if (!cs.alive) return; // swallowed by one that moved before it
    const head = cs.body[0];

    // THE BRAIN, in three simple rules:
    // 1. Look at the 3 ways it could go (it can't turn straight back).
    const options = [
      cs.direction,                                  // straight on
      { x: -cs.direction.y, y: cs.direction.x },     // turn one way
      { x: cs.direction.y, y: -cs.direction.x },     // turn the other way
    ];

    // 2. Throw out any move that hits a wall, a rock, or a snake that's
    //    not smaller than it (smaller ones it's happy to swallow).
    //    Sometimes it doesn't notice your snake, so you can cut it off.
    const seesYou = Math.random() >= COMPUTER_MISSES_YOU;
    const safe = options.filter(dir => {
      const spot = { x: head.x + dir.x, y: head.y + dir.y };
      if (this.hitsWall(spot)) return false;
      const other = this.snakeAt(spot, [], cs);
      if (!other || (!seesYou && this.players.includes(other))) return true;
      return other !== cs && cs.body.length > other.body.length;
    });

    // Nowhere safe to go? It's boxed in and crashes.
    if (safe.length === 0) {
      this.crashComputerSnake(cs);
      return;
    }

    // 3. Of the safe moves, pick the one that gets closest to the nearest food.
    //    Now and then (10% of the time) it picks a random safe move instead,
    //    so it's not perfect and you can beat it.
    let choice;
    if (Math.random() < 0.1) {
      choice = Phaser.Utils.Array.GetRandom(safe);
    } else {
      choice = safe.reduce((best, dir) =>
        this.distanceToFood({ x: head.x + dir.x, y: head.y + dir.y }) <
        this.distanceToFood({ x: head.x + best.x, y: head.y + best.y }) ? dir : best);
    }

    // Move it the same way as the player's snake: new head, drop the tail
    // unless it just ate.
    cs.direction = choice;
    const newHead = { x: head.x + choice.x, y: head.y + choice.y };

    // Same rules as for you: swallow a smaller snake, crash into anything else.
    const other = this.snakeAt(newHead, [], cs);
    if (other && (other === cs || cs.body.length <= other.body.length)) {
      this.crashComputerSnake(cs);
      return;
    }
    if (other) this.swallow(cs, other);

    this.noteMove(cs, MOVE_EVERY);
    cs.body.unshift(newHead);
    if (this.eatFoodAt(newHead)) { /* ate: keep the tail */ }
    else if (cs.grow > 0) cs.grow -= 1;
    else cs.body.pop();
    // Computer snakes gobble up power-ups too, but they do nothing for them.
    this.powerUps = this.powerUps.filter(pu => pu.x !== newHead.x || pu.y !== newHead.y);
  });
};

// A crashed computer snake disappears, and every square of its body is
// left behind as a piece of food anyone can eat. A new one comes later.
// (swallowed: true when another snake ate it, so there's nothing left behind.)
GameScene.prototype.crashComputerSnake = function (cs, swallowed = false) {
  cs.alive = false;
  if (!swallowed) this.pops.push({ x: cs.body[0].x, y: cs.body[0].y, kind: 'crash' });
  if (!swallowed) cs.body.forEach(part => this.leftovers.push({ x: part.x, y: part.y, color: cs.color }));
  this.time.delayedCall(RESPAWN_AFTER, () => {
    this.computerSnakes.splice(this.computerSnakes.indexOf(cs), 1);
    this.spawnComputerSnake(cs.color);
  });
};

// How many squares away is the closest piece of food?
// (Leftovers count as food too, so computer snakes go after them.)
GameScene.prototype.distanceToFood = function (spot) {
  return Math.min(...[...this.foods, ...this.leftovers].map(food => Math.abs(food.x - spot.x) + Math.abs(food.y - spot.y)));
};


// =====================================================================
//  3i. ONLINE GAMES
//  The extra parts the game needs when it's played in an online room.
//  online.js does the talking to Firebase.
// =====================================================================

// Make a snake for everyone in the room. They start in rows spread down
// the board, taking turns facing right and left.
GameScene.prototype.setupOnlinePlayers = function (info) {
  this.online = info; // { myId, isHost, players: [{ id, name, color }] }
  info.players.forEach((p, i) => {
    // (online.js already made sure no two players share a color.)
    // With a big world, everyone starts on their own screen.
    const ownScreen = this.screens > 1 && info.players.length <= this.screens * this.screens;
    const left = ownScreen ? (i % this.screens) * this.frameCols : 0;
    const top = ownScreen ? Math.floor(i / this.screens) * this.frameRows : 0;
    const y = ownScreen ? top + Math.floor(this.frameRows / 2) : Math.floor(this.rows * (i + 1) / (info.players.length + 1));
    // On their own screens, snakes head away from each other, toward the outside wall.
    const goingRight = ownScreen ? i % this.screens === this.screens - 1 : i % 2 === 0;
    const x = ownScreen ? left + Math.floor(this.frameCols * (goingRight ? 1 : 2) / 3) : (goingRight ? 5 : this.cols - 6);
    const step = goingRight ? -1 : 1;
    const body = [{ x, y }, { x: x + step, y }, { x: x + 2 * step, y }];
    const player = this.makePlayer(p.name, PLAYER_COLORS[p.color], body, { x: goingRight ? 1 : -1, y: 0 }, p.id);
    player.skin = p.skin || 'classic';
    this.skinPower(player); // see 3o
    this.players.push(player);
  });
  this.me = this.players.find(p => p.id === info.myId);
};

// Host: bring back crashed players once they've waited long enough.
// They get a new 3-square snake somewhere empty, away from everyone else,
// heading toward the middle of the board.
GameScene.prototype.respawnPlayers = function () {
  this.players.filter(p => p.crashed && this.clock >= p.respawnAt).forEach(p => {
    p.prevBody = null; // don't glide in from where it crashed
    for (let tries = 0; tries < 200; tries++) {
      const head = this.freeSpot();
      const dir = head.x < this.cols / 2 ? { x: 1, y: 0 } : { x: -1, y: 0 };
      const body = [head, { x: head.x - dir.x, y: head.y }, { x: head.x - 2 * dir.x, y: head.y }];
      const farFromOthers = this.players.every(o => o === p || o.crashed
        || Math.abs(head.x - o.body[0].x) + Math.abs(head.y - o.body[0].y) > 6);
      if (farFromOthers && !this.hitsWall(body[2]) && !this.isTaken(body[1]) && !this.isTaken(body[2])) {
        p.body = body;
        p.direction = dir;
        p.nextDirection = dir;
        p.crashed = false;
        return;
      }
    }
    // Board too crowded: try again next step.
  });
};

// Start listening: the host hears everyone's turns; everyone else hears the game state.
GameScene.prototype.startOnline = function () {
  const stops = [];
  if (this.online.isHost) {
    stops.push(Online.onTurns((id, x, y) => {
      const player = this.players.find(p => p.id === id);
      if (player && this.has(player, 'flip')) { x = -x; y = -y; } // backwards!
      if (player && !player.crashed && !(x === -player.direction.x && y === -player.direction.y)) {
        player.nextDirection = { x, y };
      }
    }));
  } else {
    stops.push(Online.onState(state => this.applyOnlineState(state)));
    stops.push(Online.onMaze(maze => this.setMaze(maze)));
  }

  // Chat messages pop up over the board for a few seconds.
  Online.events.onChat = msg => this.showChatBubble(msg);

  // Stop listening when this screen closes.
  this.events.once('shutdown', () => {
    stops.forEach(stop => stop());
    Online.events.onChat = () => {};
  });

};

// Everyone except the host: copy what the host sent, then draw it.
GameScene.prototype.applyOnlineState = function (state) {
  state.players.forEach(sent => {
    const p = this.players.find(q => q.id === sent.id);
    if (!p) return;
    // Remember where it was, so it can glide to where it is now (see 3n).
    const now = this.time.now;
    if (p.body.length && sent.body.length && (p.body[0].x !== sent.body[0].x || p.body[0].y !== sent.body[0].y)) {
      p.prevBody = p.body;
      p.movedAt = now;
      p.moveDur = Phaser.Math.Clamp(now - (p.lastSentAt || now - MOVE_EVERY), 40, 300);
      p.lastSentAt = now;
    }
    p.body = sent.body;
    p.score = sent.score;
    p.crashed = sent.crashed;
    p.until = sent.until;
    p.shield = sent.shield; // so the shield bubble shows
    // Work out which way it's going from its first two squares,
    // so we don't let you ask to turn straight back.
    if (p.body.length > 1) p.direction = { x: p.body[0].x - p.body[1].x, y: p.body[0].y - p.body[1].y };
  });
  this.foods = state.foods;
  this.leftovers = state.leftovers;
  this.powerUps = state.powerUps;
  this.clock = state.clock;
  this.updateScoreText();
  this.draw();
  this.showPops(state.pops);
};

// Online: a message in the middle of the screen while you're waiting to come back.
GameScene.prototype.updateOutText = function () {
  if (!this.me) return;
  if (this.me.crashed && !this.outText) {
    this.outText = this.onHud(this.add.text(WIDTH / 2, HEIGHT / 2, 'Crashed! -' + CRASH_COSTS + ' points\nBack in a moment...',
      { fontSize: '26px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 12, y: 8 }, align: 'center' }).setOrigin(0.5));
  }
  if (!this.me.crashed && this.outText) {
    this.outText.destroy();
    this.outText = null;
  }
};

GameScene.prototype.showChatBubble = function (msg) {
  const color = '#' + PLAYER_COLORS[(msg.color || 0) % PLAYER_COLORS.length].head.toString(16).padStart(6, '0');
  const bubble = this.onHud(this.add.text(WIDTH / 2, 40, msg.name + ': ' + msg.text, {
    fontSize: '18px', color, backgroundColor: '#000000cc', padding: { x: 10, y: 6 },
    wordWrap: { width: WIDTH - 40 },
  }).setOrigin(0.5, 0));
  this.tweens.add({ targets: bubble, alpha: 0, delay: 2500, duration: 500, onComplete: () => bubble.destroy() });
};


// =====================================================================
//  3j. THE BIG WORLD, CAMERAS AND SCREEN EFFECTS
//  The world can be several screens big. Two cameras look at it:
//    - the main camera shows the screen your snake is on, and slides to
//      the next one when you cross an edge (and spins with 🌪️)
//    - the HUD camera shows the score, timer and mini-map, and never moves
// =====================================================================

GameScene.prototype.setupCameras = function () {
  const frameW = this.frameCols * CELL, frameH = this.frameRows * CELL;
  // Online, shrink the screen to fit the device, leaving room for the score.
  const fits = frameW === WIDTH && frameH === HEIGHT;
  const zoom = fits ? 1 : Math.min(1, WIDTH / frameW, (HEIGHT - 40) / frameH);
  const x = (WIDTH - frameW * zoom) / 2;
  const y = fits ? 0 : (HEIGHT - frameH * zoom) / 2 + 15;
  this.cameras.main.setViewport(x, y, frameW * zoom, frameH * zoom).setZoom(zoom);
  this.hudCamera = this.cameras.add(0, 0, WIDTH, HEIGHT);
  this.hudCamera.ignore([this.field, this.graphics, this.fog]);
  if (!fits) this.onHud(this.add.rectangle(x, y, frameW * zoom, frameH * zoom).setOrigin(0).setStrokeStyle(2, 0x666666));
  this.miniMap = this.onHud(this.add.graphics());
  this.screenShown = null;
};

// Things that belong to the HUD (stay put) or the world (move with the view).
GameScene.prototype.onHud = function (thing) {
  this.cameras.main.ignore(thing);
  return thing;
};
GameScene.prototype.inWorld = function (thing) {
  this.hudCamera.ignore(thing);
  return thing;
};

// Which screen is this square on? Screens are numbered across, then down.
GameScene.prototype.screenOf = function (spot) {
  const sx = Phaser.Math.Clamp(Math.floor(spot.x / this.frameCols), 0, this.screens - 1);
  const sy = Phaser.Math.Clamp(Math.floor(spot.y / this.frameRows), 0, this.screens - 1);
  return { sx, sy };
};

// Point the main camera at the screen my snake's head is on.
GameScene.prototype.followMe = function () {
  if (!this.me || !this.me.body.length) return;
  const { sx, sy } = this.screenOf(this.me.body[0]);
  if (this.screenShown === sx + ',' + sy) return;
  const cx = (sx + 0.5) * this.frameCols * CELL, cy = (sy + 0.5) * this.frameRows * CELL;
  if (this.screenShown === null) this.cameras.main.centerOn(cx, cy);
  else this.cameras.main.pan(cx, cy, 250, 'Sine.easeInOut');
  this.screenShown = sx + ',' + sy;
};

// The edges: a gray wall around the outside of the world, and a faint
// green line where you can go through to the next screen.
GameScene.prototype.drawEdges = function () {
  const g = this.graphics, w = this.cols * CELL, h = this.rows * CELL;
  // The outside wall: a wooden fence.
  g.fillStyle(0x5d3a1a);
  g.fillRect(0, 0, w, 5);
  g.fillRect(0, h - 5, w, 5);
  g.fillRect(0, 0, 5, h);
  g.fillRect(w - 5, 0, 5, h);
  g.fillStyle(0x8b5a2b);
  g.fillRect(0, 0, w, 2);
  g.fillRect(0, h - 5, w, 2);
  g.fillRect(0, 0, 2, h);
  g.fillRect(w - 5, 0, 2, h);
  // Ways through to the next screen: a dashed white line.
  g.fillStyle(0xffffff, 0.35);
  for (let i = 1; i < this.screens; i++) {
    for (let d = 0; d < Math.max(w, h); d += 16) {
      if (d < h) g.fillRect(i * this.frameCols * CELL - 1, d, 3, 8);
      if (d < w) g.fillRect(d, i * this.frameRows * CELL - 1, 8, 3);
    }
  }
};

// The mini-map in the top-right corner: one box per screen, the one you're
// on is lighter, and a dot for each player.
GameScene.prototype.drawMiniMap = function () {
  const m = this.miniMap;
  m.clear();
  if (this.screens < 2) return;
  const boxW = 22, boxH = Math.round(22 * this.frameRows / this.frameCols);
  const left = WIDTH - 10 - boxW * this.screens, top = 10;
  m.fillStyle(0x000000, 0.6);
  m.fillRect(left, top, boxW * this.screens, boxH * this.screens);
  for (let sx = 0; sx < this.screens; sx++) {
    for (let sy = 0; sy < this.screens; sy++) {
      if (this.screenShown === sx + ',' + sy) {
        m.fillStyle(0xffffff, 0.25);
        m.fillRect(left + sx * boxW, top + sy * boxH, boxW, boxH);
      }
      if (this.maze && this.maze.sx === sx && this.maze.sy === sy) {
        m.fillStyle(0xffa500, 0.7);
        m.fillRect(left + sx * boxW + 4, top + sy * boxH + 4, boxW - 8, boxH - 8);
      }
      m.lineStyle(1, 0x888888);
      m.strokeRect(left + sx * boxW, top + sy * boxH, boxW, boxH);
    }
  }
  this.players.filter(p => !p.crashed && p.body.length).forEach(p => {
    m.fillStyle(p.color.head);
    m.fillRect(left + p.body[0].x / this.cols * boxW * this.screens - 2, top + p.body[0].y / this.rows * boxH * this.screens - 2, 5, 5);
  });
};

// Spin and lights out only happen on the screen of whoever took them.
// (On one keyboard, the two players share a screen, so it's either of them.)
GameScene.prototype.whoHas = function (kind) {
  if (this.online) return this.me && !this.me.crashed && this.has(this.me, kind) ? this.me : null;
  return this.players.find(p => this.has(p, kind)) || null;
};

// 🌪️ Called 60 times a second: turn the view a little, or turn it back to normal.
GameScene.prototype.spinScreen = function () {
  const cam = this.cameras.main;
  if (this.whoHas('spin')) cam.setRotation(cam.rotation + 0.03);
  else if (cam.rotation !== 0) {
    cam.setRotation(Phaser.Math.Angle.RotateTo(Phaser.Math.Angle.Wrap(cam.rotation), 0, 0.1));
    if (Math.abs(cam.rotation) < 0.01) cam.setRotation(0);
  }
};

// 🙈 Cover everything except a small square around the head.
GameScene.prototype.drawLightsOut = function () {
  this.fog.clear();
  const p = this.whoHas('dark');
  if (!p) return;
  const w = this.cols * CELL, h = this.rows * CELL;
  const x0 = (p.body[0].x - LIGHTS_OUT_SEE) * CELL, y0 = (p.body[0].y - LIGHTS_OUT_SEE) * CELL;
  const x1 = (p.body[0].x + LIGHTS_OUT_SEE + 1) * CELL, y1 = (p.body[0].y + LIGHTS_OUT_SEE + 1) * CELL;
  this.fog.fillStyle(0x000000, 0.97);
  this.fog.fillRect(0, 0, w, y0);         // above
  this.fog.fillRect(0, y1, w, h - y1);    // below
  this.fog.fillRect(0, y0, x0, y1 - y0);  // left
  this.fog.fillRect(x1, y0, w - x1, y1 - y0); // right
};

// 🦖 The squares down one side of a dinosaur (the side to its right).
GameScene.prototype.fatCells = function (p) {
  if (!this.has(p, 'fat')) return [];
  return p.body.map((part, i) => {
    const d = i === 0 ? p.direction : { x: p.body[i - 1].x - part.x, y: p.body[i - 1].y - part.y };
    return { x: part.x - d.y, y: part.y + d.x };
  });
};


// =====================================================================
//  3k. MAZES
//  A maze is a block of walls with a green entrance on its left side and
//  a red exit on its right. Go in the green one and out the red one to win.
//  hitsWall() (section 3d) counts its walls, so snakes crash into them
//  and computer snakes steer around them.
// =====================================================================

// Every step: take the maze away when its time is up, or make a new one.
GameScene.prototype.updateMaze = function () {
  if (!this.mode.mazes || this.screens < 2) return;
  if (this.maze && this.clock >= this.maze.until) this.setMaze(null);
  if (!this.maze && this.clock >= this.nextMazeAt) {
    // Roll the dice (see mazeChance in MODES). No maze this time? Try again later.
    if (Math.random() < (this.mode.mazeChance ?? 1)) this.makeMaze();
    else this.nextMazeAt = this.clock + MAZE_EVERY;
  }
};

// Build a new maze in the middle of a screen that no player is on.
GameScene.prototype.makeMaze = function () {
  // How many paths fit: each path is MAZE_PATH_WIDTH squares plus a wall.
  const across = Math.min(MAZE_ACROSS, Math.floor((this.frameCols - 3) / (MAZE_PATH_WIDTH + 1)));
  const down = Math.min(MAZE_DOWN, Math.floor((this.frameRows - 3) / (MAZE_PATH_WIDTH + 1)));
  const w = across * (MAZE_PATH_WIDTH + 1) + 1, h = down * (MAZE_PATH_WIDTH + 1) + 1;
  const busy = this.players.filter(p => !p.crashed && p.body.length).map(p => this.screenOf(p.body[0]));
  const free = [];
  for (let sx = 0; sx < this.screens; sx++) {
    for (let sy = 0; sy < this.screens; sy++) {
      if (!busy.some(b => b.sx === sx && b.sy === sy)) free.push({ sx, sy });
    }
  }
  if (!free.length || across < 2 || down < 2) {
    this.nextMazeAt = this.clock + 2000; // try again soon
    return;
  }
  const { sx, sy } = Phaser.Utils.Array.GetRandom(free);
  const left = sx * this.frameCols + Math.floor((this.frameCols - w) / 2);
  const top = sy * this.frameRows + Math.floor((this.frameRows - h) / 2);
  const inside = spot => spot.x >= left && spot.x < left + w && spot.y >= top && spot.y < top + h;

  // Don't drop it on top of a snake.
  const snakes = [...this.players.filter(p => !p.crashed).map(p => p.body), ...this.computerSnakes.filter(cs => cs.alive).map(cs => cs.body)];
  if (snakes.some(body => body.some(inside))) {
    this.nextMazeAt = this.clock + 2000;
    return;
  }

  // Plan it on a small grid first: odd spots are paths, even spots are
  // walls. Start with everything a wall, then dig paths with a "random
  // walk that backs up when it's stuck".
  // On the board, each plan spot becomes a block: 1 square for a wall
  // line, MAZE_PATH_WIDTH squares for a path, so the paths come out wide.
  const planW = across * 2 + 1, planH = down * 2 + 1;
  const start = i => Math.floor(i / 2) * (MAZE_PATH_WIDTH + 1) + (i % 2); // where plan spot i begins
  const size = i => i % 2 ? MAZE_PATH_WIDTH : 1;                           // and how many squares it covers
  const block = (px, py) => {
    const squares = [];
    for (let x = 0; x < size(px); x++) for (let y = 0; y < size(py); y++) squares.push((left + start(px) + x) + ',' + (top + start(py) + y));
    return squares;
  };
  const walls = new Set();
  for (let px = 0; px < planW; px++) for (let py = 0; py < planH; py++) block(px, py).forEach(key => walls.add(key));
  const dig = (px, py) => block(px, py).forEach(key => walls.delete(key));
  const visited = new Set(['1,1']);
  const path = [{ x: 1, y: 1 }];
  dig(1, 1);
  while (path.length) {
    const at = path[path.length - 1];
    const next = [{ x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }]
      .map(d => ({ x: at.x + d.x, y: at.y + d.y, d }))
      .filter(n => n.x > 0 && n.x < planW && n.y > 0 && n.y < planH && !visited.has(n.x + ',' + n.y));
    if (!next.length) { path.pop(); continue; }
    const n = Phaser.Utils.Array.GetRandom(next);
    dig(at.x + n.d.x / 2, at.y + n.d.y / 2); // knock down the wall in between
    dig(n.x, n.y);
    visited.add(n.x + ',' + n.y);
    path.push({ x: n.x, y: n.y });
  }

  // A gap on the left side and one on the right (each a list of squares).
  const toSpot = key => { const [x, y] = key.split(',').map(Number); return { x, y }; };
  const gapA = block(0, 1 + 2 * Phaser.Math.Between(0, down - 1)).map(toSpot);
  const gapB = block(planW - 1, 1 + 2 * Phaser.Math.Between(0, down - 1)).map(toSpot);
  [...gapA, ...gapB].forEach(spot => walls.delete(spot.x + ',' + spot.y));

  // Clear rocks, food and power-ups out of the way.
  [...this.rocks.keys()].forEach(key => {
    const [x, y] = key.split(',').map(Number);
    if (inside({ x, y })) this.rocks.delete(key);
  });
  this.foods = this.foods.map(f => walls.has(f.x + ',' + f.y) ? null : f).filter(Boolean);
  this.leftovers = this.leftovers.filter(l => !walls.has(l.x + ',' + l.y));
  this.powerUps = this.powerUps.filter(pu => !walls.has(pu.x + ',' + pu.y));
  this.setMaze({ left, top, w, h, sx, sy, walls, gapA, gapB, until: this.clock + MAZE_LASTS });
  while (this.foods.length < this.mode.food) this.foods.push(this.freeSpot());
};

// Put a maze on the board (or take it away with null). Online, the host
// also sends it to everyone else.
GameScene.prototype.setMaze = function (maze) {
  const isNew = maze && !this.maze;
  this.maze = maze;
  if (!maze) {
    this.nextMazeAt = this.clock + MAZE_EVERY;
    this.players.forEach(p => { p.inMazeFrom = null; });
  }
  if (this.online && this.online.isHost) Online.sendMaze(maze);
  if (isNew) {
    this.showMessage('🧩 A maze appeared! Look for orange on the map');
    Sound.play('mazeAppears');
  }
};

// Did this player go in one gap and out the other?
GameScene.prototype.checkMaze = function (p) {
  const m = this.maze;
  if (!m) return;
  const head = p.body[0];
  const onGap = gap => gap.some(spot => head.x === spot.x && head.y === spot.y);
  const inside = head.x >= m.left && head.x < m.left + m.w && head.y >= m.top && head.y < m.top + m.h;
  if (!inside) { p.inMazeFrom = null; return; }
  // In through the green entrance (A), out through the red exit (B).
  if (onGap(m.gapA) || onGap(m.gapB)) {
    const gap = onGap(m.gapA) ? 'A' : 'B';
    if (p.inMazeFrom === 'A' && gap === 'B') {
      // Made it through!
      p.grow += MAZE_PRIZE;
      p.score += MAZE_PRIZE;
      this.pops.push({ x: head.x, y: head.y, kind: 'maze' });
      this.reward(p, 'maze');
      this.setMaze(null);
      return;
    }
    p.inMazeFrom = gap;
  }
};

GameScene.prototype.drawMaze = function () {
  const m = this.maze;
  if (!m) return;
  // Blink for the last 3 seconds before it goes.
  if (m.until - this.clock < 3000 && Math.floor(this.clock / 240) % 2) return;
  const g = this.graphics;
  m.walls.forEach(key => {
    const [x, y] = key.split(',').map(Number);
    drawBrick(g, x, y);
  });
  // The entrance glows green and the exit red.
  g.fillStyle(0x7cfc00, 0.6);
  m.gapA.forEach(spot => g.fillRect(spot.x * CELL, spot.y * CELL, CELL - 1, CELL - 1));
  g.fillStyle(0xff4444, 0.6);
  m.gapB.forEach(spot => g.fillRect(spot.x * CELL, spot.y * CELL, CELL - 1, CELL - 1));
};

// A message across the middle of the screen for a few seconds.
GameScene.prototype.showMessage = function (text) {
  const message = this.onHud(this.add.text(WIDTH / 2, 100, text, {
    fontSize: '20px', color: '#ffa500', backgroundColor: '#000000cc', padding: { x: 10, y: 6 },
    align: 'center', wordWrap: { width: WIDTH - 40 },
  }).setOrigin(0.5, 0));
  this.tweens.add({ targets: message, alpha: 0, delay: 3000, duration: 500, onComplete: () => message.destroy() });
};


// =====================================================================
//  3l. ROCKS
//  Piles of rocks scattered over each screen (Medium). hitsWall() counts
//  them, so you crash into them and computer snakes steer around them.
// =====================================================================

GameScene.prototype.placeRocks = function () {
  if (!this.mode.rocks) return;
  const starts = this.players.map(p => p.body[0]);
  for (let sx = 0; sx < this.screens; sx++) {
    for (let sy = 0; sy < this.screens; sy++) {
      for (let pile = 0; pile < this.mode.rocks; pile++) {
        // Each pile is a short wiggly line, 3 to 5 rocks long, with a power
        // from 4 to 12. You can smash through if you're longer than that.
        const power = Phaser.Math.Between(4, 12);
        let spot = {
          x: sx * this.frameCols + Phaser.Math.Between(2, this.frameCols - 3),
          y: sy * this.frameRows + Phaser.Math.Between(2, this.frameRows - 3),
        };
        const length = Phaser.Math.Between(3, 5);
        for (let i = 0; i < length; i++) {
          // Keep well away from where the players start, and off the edges.
          const nearStart = starts.some(s => Math.abs(s.x - spot.x) + Math.abs(s.y - spot.y) < 7 || Math.abs(s.y - spot.y) <= 1);
          if (!nearStart && !this.hitsWall(spot) && spot.x > 0 && spot.y > 0 && spot.x < this.cols - 1 && spot.y < this.rows - 1) {
            this.rocks.set(spot.x + ',' + spot.y, power);
          }
          const step = Phaser.Utils.Array.GetRandom([{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]);
          spot = { x: spot.x + step.x, y: spot.y + step.y };
        }
      }
    }
  }
};

// Is there a rock here that this player can smash? Longer than its power
// (or with 💪): the rock breaks, and they'll lose a couple of squares
// once they've moved (unless they have 💪).
GameScene.prototype.smashRock = function (p, spot) {
  const key = spot.x + ',' + spot.y;
  if (!this.rocks.has(key)) return false;
  const crusher = this.has(p, 'crush');
  if (!crusher && p.body.length <= this.rocks.get(key)) return false; // too small: crash
  this.rocks.delete(key);
  if (!crusher) p.smashed = true;
  this.pops.push({ x: spot.x, y: spot.y, kind: 'smash' });
  this.reward(p, 'smash');
  return true;
};

GameScene.prototype.drawRocks = function () {
  const g = this.graphics;
  const labels = [];
  this.rocks.forEach((power, key) => {
    const [x, y] = key.split(',').map(Number);
    drawStone(g, x, y, 0x8a8a8a);
    labels.push({ x, y, power });
  });
  // Every rock shows its power number.
  while (this.rockLabels.length < labels.length) {
    this.rockLabels.push(this.inWorld(this.add.text(0, 0, '', { fontSize: '12px', fontStyle: 'bold', color: '#ffffff', stroke: '#333333', strokeThickness: 3 }).setOrigin(0.5).setDepth(3)));
  }
  this.rockLabels.forEach((text, i) => {
    const rock = labels[i];
    text.setVisible(!!rock);
    if (rock) text.setText(String(rock.power)).setPosition((rock.x + 0.5) * CELL, (rock.y + 0.5) * CELL);
  });
};


// =====================================================================
//  3m. SNAKES EATING SNAKES
//  Run into a smaller snake and you swallow it, growing by its size.
//  Run into one the same size or bigger and you crash. Every snake shows
//  its size as a number that rides along the middle of its body.
// =====================================================================

// Which snake (player or computer) is on this square? The tail square of a
// moving snake is about to move away, so it doesn't count. A dinosaur's wide
// side counts, except for the dinosaur itself (me). Ghosts don't count.
GameScene.prototype.snakeAt = function (spot, moving, me) {
  const here = part => part.x === spot.x && part.y === spot.y;
  const player = this.players.find(p => !p.crashed && !this.has(p, 'ghost')
    && ((moving.includes(p) ? p.body.slice(0, -1) : p.body).some(here) || (p !== me && this.fatCells(p).some(here))));
  if (player) return player;
  return this.computerSnakes.find(cs => cs.alive && (cs === me ? cs.body.slice(0, -1) : cs.body).some(here)) || null;
};

// eater swallows victim: it grows by the victim's size (and scores that many).
GameScene.prototype.swallow = function (eater, victim) {
  const size = victim.body.length;
  eater.grow = (eater.grow || 0) + size;
  if (eater.score !== undefined) eater.score += size;
  this.pops.push({ x: eater.body[0].x, y: eater.body[0].y, kind: 'gulp' });
  this.reward(eater, 'swallow');
  if (this.computerSnakes.includes(victim)) this.crashComputerSnake(victim, true);
  else this.knockOut(victim, false);
};

// A player is out: crashed (leaves food behind) or swallowed (doesn't).
// Online, they lose some points and come back a few seconds later.
GameScene.prototype.knockOut = function (p, leaveFood) {
  if (p.crashed) return;
  // 🛡️ A shield takes the hit instead (see 3o).
  if (p.shield) {
    p.shield = false;
    p.bounced = true;
    if (p.power === 'diamond' && this.skinPowers().diamondBack) p.shieldBackAt = this.clock + this.skinPowers().diamondBack;
    this.pops.push({ x: p.body[0].x, y: p.body[0].y, kind: 'shield' });
    return;
  }
  p.crashed = true;
  if (leaveFood && p.body.length) this.pops.push({ x: p.body[0].x, y: p.body[0].y, kind: 'crash' });
  if (!this.online) return;
  if (leaveFood) p.body.forEach(part => this.leftovers.push({ x: part.x, y: part.y, color: p.color.body }));
  p.score = Math.max(0, p.score - CRASH_COSTS);
  p.respawnAt = this.clock + PLAYER_RESPAWN_AFTER;
  p.until = {};
  p.grow = 0;
};

// The size number on each snake: a dark shade of the snake's color on a
// light badge, sitting on the middle of its body so it moves along with it.
GameScene.prototype.drawSizes = function () {
  const snakes = [
    ...this.players.filter(p => !(this.online && p.crashed) && p.body.length).map(p => {
      const colors = SKIN_COLORS[p.skin] || p.color;
      return { key: p, body: p.body, color: colors.body, badge: colors.head };
    }),
    ...this.computerSnakes.filter(cs => cs.alive).map(cs => ({ key: cs, body: cs.body, color: cs.color, badge: 0xffffff })),
  ];
  const labels = new Map();
  snakes.forEach(({ key, body, color, badge }) => {
    const text = this.sizeLabels.get(key)
      || this.inWorld(this.add.text(0, 0, '', { fontSize: '12px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(3));
    this.sizeLabels.delete(key);
    const points = key.points || body; // where it's drawn right now (see 3n)
    const middle = points[Math.min(points.length - 1, Math.max(1, Math.floor(points.length / 2)))];
    this.graphics.fillStyle(badge);
    this.graphics.fillCircle((middle.x + 0.5) * CELL, (middle.y + 0.5) * CELL, CELL * 0.45);
    text.setText(String(body.length))
      .setColor('#' + Phaser.Display.Color.IntegerToColor(color).darken(45).color.toString(16).padStart(6, '0'))
      .setPosition((middle.x + 0.5) * CELL, (middle.y + 0.5) * CELL);
    labels.set(key, text);
  });
  this.sizeLabels.forEach(text => text.destroy()); // snakes that are gone
  this.sizeLabels = labels;
};


// =====================================================================
//  3o. ITEMS
//  Special power-ups you win (daily challenge, daily login, see
//  rewards.js) and use when you choose, in Easy and Medium: keys 1 to 4,
//  or tap/click them in the bottom-right corner.
// =====================================================================

// The row of item buttons, each with how many you have.
GameScene.prototype.setupItemBar = function () {
  const keys = Object.keys(Rewards.ITEMS);
  const keyNames = ['ONE', 'TWO', 'THREE', 'FOUR'];
  this.itemButtons = {};
  let x = WIDTH - 10;
  const y = PORTRAIT ? HEIGHT - 80 : HEIGHT - 36;
  [...keys].reverse().forEach(key => {
    const button = this.onHud(this.add.text(x, y, '', { fontSize: '16px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 7, y: 5 } })
      .setOrigin(1, 0).setInteractive({ useHandCursor: true }));
    button.on('pointerdown', (pointer, lx, ly, event) => { event.stopPropagation(); this.useItem(key); });
    this.itemButtons[key] = button;
    this.showItem(key);
    x -= button.width + 6;
  });
  keys.forEach((key, i) => this.input.keyboard.on('keydown-' + keyNames[i], () => this.useItem(key)));
};

// "1 🛡️2": the key, the icon and how many. Lit up while it's working.
GameScene.prototype.showItem = function (key) {
  const button = this.itemButtons && this.itemButtons[key];
  if (!button) return;
  const count = Rewards.items()[key] || 0;
  const on = key === 'shield' ? this.me.shield : key === 'freeze' ? this.clock < this.frozenUntil : this.has(this.me, key);
  const number = Object.keys(Rewards.ITEMS).indexOf(key) + 1;
  button.setText((TOUCH ? '' : number + ' ') + Rewards.ITEMS[key].icon + count)
    .setBackgroundColor(on ? '#2e7d32' : '#000000aa').setAlpha(count || on ? 1 : 0.45);
};

GameScene.prototype.useItem = function (key) {
  const me = this.me;
  if (!me || me.crashed || !this.timer || this.timer.paused) return;
  if (key === 'shield' && me.shield) return; // one shield at a time
  if (!Rewards.useItem(key)) return;
  if (key === 'shield') me.shield = true;
  else if (key === 'freeze') this.frozenUntil = this.clock + ITEM_LASTS.freeze;
  else me.until[key] = this.clock + ITEM_LASTS[key];
  Sound.play('powerup');
  this.burst(me.body[0].x, me.body[0].y, 0x66ccff, 20);
  const item = Rewards.ITEMS[key];
  const text = this.inWorld(this.add.text((me.body[0].x + 0.5) * CELL, me.body[0].y * CELL, item.icon + ' ' + item.name.toUpperCase() + '!', {
    fontSize: '22px', fontStyle: 'bold', color: '#66ccff', stroke: '#000000', strokeThickness: 4,
  }).setOrigin(0.5).setDepth(6));
  this.tweens.add({ targets: text, y: text.y - 40, alpha: 0, duration: 1000, onComplete: () => text.destroy() });
};

// After a step: a shielded snake that just bumped into something turns
// to a safe way instead (it doesn't move this step). And double points
// adds this step's points again.
GameScene.prototype.afterItems = function (p) {
  if (p.bounced) {
    p.bounced = false;
    const head = p.body[0];
    const ways = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]
      .filter(d => !(d.x === -p.direction.x && d.y === -p.direction.y));
    const safe = ways.find(d => {
      const spot = { x: head.x + d.x, y: head.y + d.y };
      return !this.hitsWall(spot) && !this.snakeAt(spot, [], p);
    });
    if (safe) { p.direction = safe; p.nextDirection = safe; }
  }
  if (p.shieldBackAt && this.clock >= p.shieldBackAt) {
    p.shieldBackAt = 0;
    p.shield = true;
    this.pops.push({ x: p.body[0].x, y: p.body[0].y, kind: 'shieldBack' });
  }
  if (this.has(p, 'double') && p.score > p.scoreBefore) p.score += p.score - p.scoreBefore;
  if (p === this.me) Object.keys(this.itemButtons || {}).forEach(key => this.showItem(key));
};

// Skin powers (see rewards.js): the skin you wear does something too.
// The others are checked where they happen: 🐯 comboWindow(), 🐆
// pullApples(), 🌈 usePowerUp(), 💰 countCombo(), 💎 knockOut().
GameScene.prototype.skinPowers = function () {
  return this.online ? SKIN_POWERS.online : SKIN_POWERS.solo;
};
GameScene.prototype.skinPower = function (p) {
  p.power = p.skin;
  if (p.power === 'lava' || p.power === 'diamond') p.shield = true; // 🔥💎 start with a shield
};

// =====================================================================
//  3p. TEST MODE (see testmode.js)
//  For the owner: try out any power-up, and see the daily prize box.
// =====================================================================

// Start screen: a "🧪 TEST MODE" button to leave it, and one that shows
// the daily prize box (a different day each press).
StartScene.prototype.setupTestBar = function () {
  const style = color => ({ fontSize: '15px', color: '#111111', backgroundColor: color, padding: { x: 8, y: 5 } });
  const leave = this.add.text(0, HEIGHT - 52, PORTRAIT ? '🧪 Leave test mode' : '🧪 TEST MODE: leave', style('#ff66cc')).setOrigin(0, 0.5)
    .setInteractive({ useHandCursor: true }).on('pointerdown', () => TestMode.stop());
  let day = 0;
  const prize = this.add.text(0, HEIGHT - 52, PORTRAIT ? '🎁 Daily prize' : '🎁 Show a daily prize', style('#ffd700')).setOrigin(0, 0.5)
    .setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (this.loginBox || this.rewards.visible) return;
      day = day % 7 + 1;
      const items = Rewards.LOGIN_PRIZES[day - 1];
      this.showLoginPrize({ day, prize: day === 7 ? 'GRAND PRIZE! 2 of every item + the Diamond skin'
        : items.map(key => Rewards.ITEMS[key].icon + ' ' + Rewards.ITEMS[key].name).join(' + ') });
    });
  leave.x = WIDTH / 2 - (leave.width + prize.width + 10) / 2;
  prize.x = leave.x + leave.width + 10;
};

// In a game: 🧪 in the top-right corner (or T) pauses and shows every
// power-up. Pick one and it lands a few squares in front of your snake.
GameScene.prototype.setupTestPanel = function () {
  const kinds = Object.keys(POWER_UPS);
  const perRow = PORTRAIT ? 5 : 10, size = 52;
  const rows = Math.ceil(kinds.length / perRow);
  const panel = this.onHud(this.add.container(0, 0).setDepth(25).setVisible(false));
  const top = HEIGHT / 2 - (rows * size) / 2;
  panel.add(this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.85).setOrigin(0).setInteractive());
  panel.add(this.add.text(WIDTH / 2, top - 50, '🧪 Pick a power-up to try', { fontSize: '22px', color: '#ff66cc' }).setOrigin(0.5));
  kinds.forEach((kind, i) => {
    const x = WIDTH / 2 + ((i % perRow) - (perRow - 1) / 2) * size;
    const y = top + Math.floor(i / perRow) * size + size / 2;
    const back = this.add.rectangle(x, y, size - 6, size - 6, POWER_UPS[kind].good === false ? 0x5a1f1f : 0x1f4a1f)
      .setInteractive({ useHandCursor: true }).on('pointerdown', (pointer, lx, ly, event) => {
        event.stopPropagation();
        this.dropPowerUp(kind);
        toggle();
      });
    panel.add([back, this.add.text(x, y, POWER_UPS[kind].icon, { fontSize: '26px' }).setOrigin(0.5)]);
  });
  panel.add(this.add.text(WIDTH / 2, top + rows * size + 30, (TOUCH ? 'Tap' : 'Click') + ' here to go back', { fontSize: '18px', color: '#ffff66' })
    .setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', (pointer, lx, ly, event) => { event.stopPropagation(); toggle(); }));
  const toggle = () => {
    if (!this.timer || this.me.crashed) return;
    panel.setVisible(!panel.visible);
    this.timer.paused = panel.visible;
    this.swipeStart = null; // a tap here isn't a swipe
  };
  this.onHud(this.add.text(WIDTH - 10, 10, '🧪', { fontSize: '22px', backgroundColor: '#ff66cc', padding: { x: 6, y: 3 } })
    .setOrigin(1, 0).setDepth(24).setInteractive({ useHandCursor: true })
    .on('pointerdown', (pointer, lx, ly, event) => { event.stopPropagation(); toggle(); }));
  this.input.keyboard.on('keydown-T', toggle);
};

// A power-up on the first free square 3 to 6 squares ahead of you
// (or anywhere free if that's all blocked).
GameScene.prototype.dropPowerUp = function (kind) {
  const head = this.me.body[0], d = this.me.direction;
  const ahead = [3, 4, 5, 6].map(n => ({ x: head.x + d.x * n, y: head.y + d.y * n }))
    .find(spot => spot.x >= 0 && spot.y >= 0 && spot.x < this.cols && spot.y < this.rows && !this.hitsWall(spot) && !this.isTaken(spot));
  this.powerUps.push({ ...(ahead || this.freeSpot()), kind, until: this.clock + POWER_UP_LASTS * 3 });
};

// 🧲 Every step, apples close to a magnet snake slide one square toward it.
// 🐆 The leopard skin does the same, but only from close by.
GameScene.prototype.pullApples = function () {
  this.players.filter(p => !p.crashed && (this.has(p, 'magnet') || p.power === 'leopard')).forEach(p => {
    const head = p.body[0];
    const reach = this.has(p, 'magnet') ? MAGNET_REACH : this.skinPowers().leopardReach;
    this.foods.forEach(food => {
      const dx = head.x - food.x, dy = head.y - food.y;
      if (Math.abs(dx) + Math.abs(dy) > reach || Math.abs(dx) + Math.abs(dy) < 2) return;
      const to = Math.abs(dx) >= Math.abs(dy) ? { x: food.x + Math.sign(dx), y: food.y } : { x: food.x, y: food.y + Math.sign(dy) };
      if (!this.isTaken(to)) { food.x = to.x; food.y = to.y; }
    });
  });
};


// =====================================================================
//  3n. THE LOOK
//  How everything is drawn: the grass, gliding snakes with scales and
//  shading, bouncing apples, stones, bricks and sparkle bursts.
// =====================================================================

// Remember where a snake was just before it moves, so it can glide.
GameScene.prototype.noteMove = function (snake, duration) {
  snake.prevBody = snake.body.map(part => ({ x: part.x, y: part.y }));
  snake.movedAt = this.time.now;
  snake.moveDur = duration;
};

// Where each part of a snake should be drawn right now: part of the way
// from where it was to where it is, depending on how long ago it moved.
GameScene.prototype.smoothBody = function (snake) {
  const t = snake.prevBody ? Phaser.Math.Clamp((this.time.now - snake.movedAt) / snake.moveDur, 0, 1) : 1;
  return snake.body.map((part, i) => {
    const from = snake.prevBody && (snake.prevBody[i] || snake.prevBody[snake.prevBody.length - 1]);
    if (!from || Math.abs(from.x - part.x) + Math.abs(from.y - part.y) > 1.5) return part; // jumped: don't glide
    return { x: from.x + (part.x - from.x) * t, y: from.y + (part.y - from.y) * t };
  });
};

// A burst of sparkles at a square.
GameScene.prototype.burst = function (x, y, color, count) {
  const sparks = this.inWorld(this.add.particles(0, 0, 'spark', {
    speed: { min: 40, max: 180 }, lifespan: { min: 300, max: 700 }, scale: { start: 1, end: 0 },
    tint: color, emitting: false,
  }).setDepth(4));
  sparks.explode(count, (x + 0.5) * CELL, (y + 0.5) * CELL);
  this.time.delayedCall(900, () => sparks.destroy());
};

// An apple: shadow, red body that gently bounces, a shine, a stem and a leaf.
GameScene.prototype.drawApple = function (food) {
  const g = this.graphics;
  const bounce = Math.sin(this.time.now / 180 + food.x * 1.3 + food.y) * 1.5;
  const x = food.x * CELL + CELL / 2, y = food.y * CELL + CELL / 2 + bounce;
  const r = CELL * 0.42;
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(food.x * CELL + CELL / 2 + 2, food.y * CELL + CELL * 0.85, r * 1.8, r * 0.7);
  g.fillStyle(0xb71c1c);
  g.fillCircle(x, y + 1, r);
  g.fillStyle(0xe53935);
  g.fillCircle(x - 1, y, r * 0.85);
  g.fillStyle(0xffffff, 0.7);
  g.fillCircle(x - r * 0.35, y - r * 0.35, r * 0.22);
  g.lineStyle(2, 0x5d4037);
  g.lineBetween(x, y - r * 0.8, x + 1, y - r * 1.25);
  g.fillStyle(0x43a047);
  g.fillEllipse(x + r * 0.45, y - r * 1.05, r * 0.8, r * 0.38);
};

// One stone (for rocks), with a shadow and a shine.
function drawStone(g, x, y, color) {
  const cx = x * CELL + CELL / 2, cy = y * CELL + CELL / 2;
  g.fillStyle(0x000000, 0.3);
  g.fillCircle(cx + 2, cy + 3, CELL * 0.48);
  g.fillStyle(Phaser.Display.Color.IntegerToColor(color).darken(30).color);
  g.fillCircle(cx, cy, CELL * 0.5);
  g.fillStyle(color);
  g.fillCircle(cx - 1, cy - 1, CELL * 0.42);
  g.fillStyle(0xffffff, 0.35);
  g.fillCircle(cx - CELL * 0.18, cy - CELL * 0.18, CELL * 0.14);
}

// One brick of a maze wall.
function drawBrick(g, x, y) {
  g.fillStyle(0x4e342e);
  g.fillRect(x * CELL, y * CELL, CELL, CELL);
  g.fillStyle(0xa1887f);
  g.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 3);
  g.fillStyle(0xd7ccc8, 0.6);
  g.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, 3);
}

// A snake: a smooth round tube with a shadow, a darker outline, a shine
// along its back and diamond-shaped scales, getting thinner toward the
// tail. Then the head, with eyes and a flicking tongue.
// skin: 'classic', or a pattern from rewards.js: tiger stripes, leopard
// spots, rainbow, gold (with a glint running down it), glowing lava or
// twinkling diamond.
function drawSnakeBody(g, points, direction, bodyColor, headColor, alpha, face, now, skin = 'classic') {
  const n = points.length;
  if (!n) return;
  const thick = i => CELL * 0.48 * Math.min(1, (n - i) / 5 + 0.35);

  // Put a circle every third of a square along the body.
  const dots = [];
  for (let i = 0; i < n; i++) {
    const a = points[i], b = points[i + 1];
    const steps = b && Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < 1.5 ? 3 : 1;
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const to = b && steps > 1 ? b : a;
      dots.push({
        x: (a.x + (to.x - a.x) * t + 0.5) * CELL,
        y: (a.y + (to.y - a.y) * t + 0.5) * CELL,
        r: thick(i) + (thick(i + 1) - thick(i)) * t,
      });
    }
  }
  const color = c => Phaser.Display.Color.IntegerToColor(c);
  const dark = color(bodyColor).darken(35).color, light = color(bodyColor).lighten(30).color;

  g.fillStyle(0x000000, 0.25 * alpha);                                      // shadow
  dots.forEach(d => g.fillCircle(d.x + 3, d.y + 4, d.r));
  g.fillStyle(dark, alpha);                                                 // outline
  dots.forEach(d => g.fillCircle(d.x, d.y, d.r));
  g.fillStyle(bodyColor, alpha);                                            // body
  dots.forEach((d, k) => {
    if (skin === 'rainbow') g.fillStyle(Phaser.Display.Color.HSVToRGB((k * 0.035 + now / 1500) % 1, 0.8, 1).color, alpha);
    if (skin === 'lava') {
      const glow = 0.5 + 0.5 * Math.sin(now / 180 + k * 0.6);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(color(0x5d1a00), color(0xff6d00), 100, glow * 100);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), alpha);
    }
    g.fillCircle(d.x, d.y, d.r * 0.8);
  });
  drawSkinPattern(g, dots, skin, alpha, now);
  dots.forEach((d, k) => {                                                  // shine along the back
    const next = dots[k + 1];
    if (!next || Math.abs(next.x - d.x) + Math.abs(next.y - d.y) > CELL) return;
    g.lineStyle(d.r * 0.45, light, alpha * 0.55);
    g.lineBetween(d.x - d.r * 0.22, d.y - d.r * 0.22, next.x - next.r * 0.22, next.y - next.r * 0.22);
  });
  g.fillStyle(dark, alpha * 0.8);                                           // scales
  dots.forEach((d, k) => {
    if (k % 3 !== 1 || k < 4 || skin === 'tiger' || skin === 'leopard') return;
    const s = d.r * 0.38;
    g.fillTriangle(d.x, d.y - s, d.x + s, d.y, d.x - s, d.y);
    g.fillTriangle(d.x - s, d.y, d.x + s, d.y, d.x, d.y + s);
  });
  if (!face) return;

  // Head: a bigger rounded head and snout, pointing the way it's going.
  const h = dots[0], fx = direction.x, fy = direction.y, sx = -fy, sy = fx;
  g.fillStyle(0x000000, 0.25 * alpha);
  g.fillCircle(h.x + 3, h.y + 4, CELL * 0.6);
  g.fillStyle(color(headColor).darken(35).color, alpha);
  g.fillCircle(h.x, h.y, CELL * 0.6);
  g.fillCircle(h.x + fx * CELL * 0.28, h.y + fy * CELL * 0.28, CELL * 0.46);
  g.fillStyle(headColor, alpha);
  g.fillCircle(h.x, h.y, CELL * 0.5);
  g.fillCircle(h.x + fx * CELL * 0.28, h.y + fy * CELL * 0.28, CELL * 0.37);
  g.fillStyle(0xffffff, alpha * 0.5);
  g.fillCircle(h.x - CELL * 0.12, h.y - CELL * 0.12, CELL * 0.12);

  // Eyes: yellow with black slit pupils.
  [-1, 1].forEach(side => {
    const ex = h.x + fx * CELL * 0.12 + sx * side * CELL * 0.26, ey = h.y + fy * CELL * 0.12 + sy * side * CELL * 0.26;
    g.fillStyle(0x000000, alpha);
    g.fillCircle(ex, ey, CELL * 0.17);
    g.fillStyle(0xffeb3b, alpha);
    g.fillCircle(ex, ey, CELL * 0.13);
    g.fillStyle(0x000000, alpha);
    g.fillEllipse(ex + fx * CELL * 0.03, ey + fy * CELL * 0.03, fx ? CELL * 0.18 : CELL * 0.06, fx ? CELL * 0.06 : CELL * 0.18);
  });

  // Tongue: a red forked line, out for a moment every couple of seconds.
  if (Math.floor(now / 300) % 6 === 0) {
    const bx = h.x + fx * CELL * 0.55, by = h.y + fy * CELL * 0.55;
    const tx = h.x + fx * CELL * 0.95, ty = h.y + fy * CELL * 0.95;
    g.lineStyle(2, 0xff1744, alpha);
    g.lineBetween(bx, by, tx, ty);
    g.lineBetween(tx, ty, tx + (fx + sx) * CELL * 0.15, ty + (fy + sy) * CELL * 0.15);
    g.lineBetween(tx, ty, tx + (fx - sx) * CELL * 0.15, ty + (fy - sy) * CELL * 0.15);
  }
}

// The patterns on top of a skin's body (dots: the circles the body is made of).
function drawSkinPattern(g, dots, skin, alpha, now) {
  // Which way the body runs at dot k, turned sideways (for spots on each side).
  const across = k => {
    const a = dots[Math.max(0, k - 1)], b = dots[Math.min(dots.length - 1, k + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
  };
  if (skin === 'tiger') {
    // Black stripes across the body.
    dots.forEach((d, k) => {
      if (k < 3 || k % 4 !== 0) return;
      const side = across(k);
      g.lineStyle(d.r * 0.4, 0x1a1a1a, alpha * 0.9);
      g.lineBetween(d.x - side.x * d.r * 0.78, d.y - side.y * d.r * 0.78, d.x + side.x * d.r * 0.78, d.y + side.y * d.r * 0.78);
    });
  }
  if (skin === 'leopard') {
    // Rings of brown, first on one side and then the other.
    dots.forEach((d, k) => {
      if (k < 3 || k % 2 !== 0) return;
      const side = across(k), flip = (k / 2) % 2 ? 1 : -1;
      const x = d.x + side.x * d.r * 0.38 * flip, y = d.y + side.y * d.r * 0.38 * flip;
      g.fillStyle(0x2b1d0e, alpha);
      g.fillCircle(x, y, d.r * 0.36);
      g.fillStyle(0xc68a3a, alpha);
      g.fillCircle(x, y, d.r * 0.17);
    });
  }
  if (skin === 'gold') {
    // A bright glint that runs from head to tail, over and over.
    const at = Math.floor(now / 25) % (dots.length + 40);
    dots.forEach((d, k) => {
      const near = Math.abs(k - at);
      if (near < 4) {
        g.fillStyle(0xffffff, alpha * (0.7 - near * 0.15));
        g.fillCircle(d.x - d.r * 0.2, d.y - d.r * 0.2, d.r * 0.45);
      }
    });
  }
  if (skin === 'diamond') {
    // Sparkling facets: little white diamonds that twinkle on and off.
    dots.forEach((d, k) => {
      if (k % 3 !== 0) return;
      const twinkle = Math.sin(now / 200 + k * 1.7);
      if (twinkle < 0.2) return;
      const s = d.r * 0.35 * twinkle;
      g.fillStyle(0xffffff, alpha * twinkle);
      g.fillTriangle(d.x, d.y - s, d.x + s * 0.6, d.y, d.x - s * 0.6, d.y);
      g.fillTriangle(d.x - s * 0.6, d.y, d.x + s * 0.6, d.y, d.x, d.y + s);
    });
  }
  if (skin === 'lava') {
    // Little yellow-hot cracks that flicker.
    dots.forEach((d, k) => {
      if (k % 4 !== 2) return;
      g.fillStyle(0xffd54f, alpha * (0.5 + 0.5 * Math.sin(now / 120 + k)));
      g.fillCircle(d.x, d.y, d.r * 0.22);
    });
  }
}

// The grass: a checkerboard of two greens with little tufts, drawn once
// per board size and saved as a picture.
function makeField(scene, cols, rows) {
  const key = 'field-' + cols + 'x' + rows;
  if (scene.textures.exists(key)) return key;
  const canvas = scene.textures.createCanvas(key, cols * CELL, rows * CELL);
  const ctx = canvas.getContext();
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      ctx.fillStyle = (x + y) % 2 ? '#26401f' : '#2b4823';
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
  for (let i = 0; i < cols * rows * 1.5; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(0, 20, 0, 0.35)' : 'rgba(160, 230, 120, 0.12)';
    ctx.fillRect(Math.random() * cols * CELL, Math.random() * rows * CELL, 2, 3);
  }
  canvas.refresh();
  return key;
}

// A small white dot that sparkle bursts are made of (tinted to any color).
function makeSpark(scene) {
  if (scene.textures.exists('spark')) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.fillStyle(0xffffff);
  g.fillCircle(4, 4, 4);
  g.generateTexture('spark', 8, 8);
  g.destroy();
}

// The start and game over screens: the grass, darkened, behind the menus.
function addBackdrop(scene) {
  scene.add.image(0, 0, makeField(scene, COLS, ROWS)).setOrigin(0);
  scene.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.6).setOrigin(0);
}


// =====================================================================
//  ONLINE MENU SCREEN
//  Just a dark background. The menus themselves are HTML (online.js),
//  since typing names and codes is easier in real text boxes.
// =====================================================================

class OnlineMenuScene extends Phaser.Scene {
  constructor() { super('OnlineMenu'); }

  // data can have { color, code } from the start screen or an invite link,
  // or { stay: true } to leave whatever online screen is showing.
  create(data) {
    if (data.color !== undefined) onlineColor = data.color;
    if (!data.stay) Online.showMenu(onlineColor, data.code);
  }
}

// The color the player picked, remembered for online games.
let onlineColor = 0;

// Switch to another screen from anywhere (for things that happen online,
// like the host starting a game while you're on the game over screen).
function goToScene(game, key, data) {
  game.scene.getScenes(true).forEach(scene => scene.scene.stop());
  game.scene.start(key, data);
}

// What to do when things happen in the online room.
function setupOnlineEvents(game) {
  Online.events.onGameStart = info => goToScene(game, 'Game', { mode: 'online', color: onlineColor, online: info });
  Online.events.onGameOver = result => goToScene(game, 'GameOver', { mode: 'online', ...result });
  Online.events.onRoomClosed = () => goToScene(game, 'OnlineMenu', { stay: true });
  Online.events.onExit = () => goToScene(game, 'Start');
}


// =====================================================================
//  4. GAME OVER SCREEN
// =====================================================================

class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  // data is what the game screen sent: the mode and color, plus either
  // { score, best, newBest } for one player or { winner, winnerColor, scores } for two.
  create(data) {
    addBackdrop(this); // see 3n
    Sound.play('gameOver');
    addSoundButtons(this, 10, HEIGHT - 36);
    this.add.text(WIDTH / 2, HEIGHT / 2 - 120, 'GAME OVER', { fontSize: '52px', color: '#ff4444' }).setOrigin(0.5);
    this.add.text(WIDTH / 2, HEIGHT / 2 - 65, MODES[data.mode].name + ' mode', { fontSize: '18px', color: '#aaaaaa' }).setOrigin(0.5);

    if (MODES[data.mode].online) {
      this.showOnlineResult(data);
      return;
    }

    if (MODES[data.mode].players === 1) {
      this.add.text(WIDTH / 2, HEIGHT / 2 - 25, 'Score: ' + data.score, { fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);
      this.add.text(WIDTH / 2, HEIGHT / 2 + 15, data.newBest ? 'New best score!' : 'Best: ' + data.best,
        { fontSize: '20px', color: data.newBest ? '#ffff66' : '#cccccc' }).setOrigin(0.5);
    } else {
      const winnerText = data.winner ? data.winner + ' WINS!' : "It's a draw!";
      const winnerColor = data.winner ? '#' + data.winnerColor.toString(16).padStart(6, '0') : '#ffffff';
      this.add.text(WIDTH / 2, HEIGHT / 2 - 25, winnerText, { fontSize: '32px', color: winnerColor }).setOrigin(0.5);
      this.add.text(WIDTH / 2, HEIGHT / 2 + 15, data.scores, { fontSize: '20px', color: '#cccccc' }).setOrigin(0.5);
    }

    // (The keys do nothing while the leaderboard is open on top.)
    const playAgain = () => { if (!Leaderboard.isOpen()) this.scene.start('Game', { mode: data.mode, color: data.color, snakes: data.snakes }); };
    const changeMode = () => { if (!Leaderboard.isOpen()) this.scene.start('Start'); };

    // Leaderboard: if this score made the top 10, ask for initials.
    // (Easy and Medium each have one board with computer snakes and one without.)
    const board = Leaderboard.boardFor(data.mode, data.snakes);
    const hasBoard = Leaderboard.available() && Leaderboard.modes.includes(board);
    if (hasBoard) {
      Leaderboard.makesTheBoard(board, data.score)
        .then(made => { if (made && this.scene.isActive()) Leaderboard.askInitials(board, data.score); })
        .catch(() => {}); // no connection: just skip it
    }

    // Short pause first, so a swipe that was still happening doesn't
    // press a button by accident.
    this.time.delayedCall(500, () => {
      makeButton(this, WIDTH / 2, HEIGHT / 2 + 85, TOUCH ? 'Play again' : 'Play again (SPACE)', '#7cfc00', playAgain);
      makeButton(this, WIDTH / 2, HEIGHT / 2 + 150, TOUCH ? 'Change mode' : 'Change mode (M)', '#cccccc', changeMode);
      this.input.keyboard.on('keydown-SPACE', playAgain);
      this.input.keyboard.on('keydown-M', changeMode);
      if (hasBoard) {
        const showBoard = () => Leaderboard.show(board);
        makeButton(this, WIDTH / 2, HEIGHT / 2 + 215, TOUCH ? 'Leaderboard' : 'Leaderboard (L)', '#ffff66', showBoard);
        this.input.keyboard.on('keydown-L', showBoard);
      }
    });
  }

  // Online: show who won, and a button back to the room.
  // (The host starts the next game from the room.)
  showOnlineResult(data) {
    const winnerText = data.winner ? data.winner + ' WINS!' : "It's a draw!";
    const winnerColor = data.winner ? '#' + data.winnerColor.toString(16).padStart(6, '0') : '#ffffff';
    this.add.text(WIDTH / 2, HEIGHT / 2 - 25, winnerText, { fontSize: '32px', color: winnerColor }).setOrigin(0.5);
    this.add.text(WIDTH / 2, HEIGHT / 2 + 15, data.scores, { fontSize: '18px', color: '#cccccc', align: 'center', wordWrap: { width: WIDTH - 40 } }).setOrigin(0.5);

    const backToRoom = () => {
      Online.backToRoom();
      this.scene.start('OnlineMenu', { stay: true });
    };
    this.time.delayedCall(500, () => {
      makeButton(this, WIDTH / 2, HEIGHT / 2 + 100, TOUCH ? 'Back to room' : 'Back to room (SPACE)', '#7cfc00', backToRoom);
      this.input.keyboard.once('keydown-SPACE', backToRoom);
    });
  }
}


// =====================================================================
//  5. START PHASER
//  The first screen in the list is the one that opens first.
// =====================================================================

const phaserGame = new Phaser.Game({
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#222222',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [StartScene, GameScene, GameOverScene, OnlineMenuScene]
});
setupOnlineEvents(phaserGame);

// If anything in the game breaks, Phaser would stop drawing and the screen
// would freeze. This catches the error instead: it's saved and the player
// gets a "Start again" button (see errors.js), and the game keeps going.
const phaserStep = phaserGame.step.bind(phaserGame);
phaserGame.step = (time, delta) => {
  try { phaserStep(time, delta); } catch (e) { reportError(e); }
};
