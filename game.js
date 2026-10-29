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
// powerUps: true means the power-up icons below show up in that mode.
// mazes: true means mazes show up now and then (see MAZE_ settings below).
// screens: how big the world is. 2 means 2 x 2 screens: you see one at a
// time, and the view flips to the next when you go past the edge.
// (2 players on one keyboard stay on 1 screen, so you can both see.)
const MODES = {
  easy:      { name: 'EASY',      about: 'Just you',        players: 1, computerSnakes: 0, food: 4,  powerUps: true, screens: 2, mazes: true },
  medium:    { name: 'MEDIUM',    about: 'Computer snakes', players: 1, computerSnakes: 5, food: 8,  powerUps: true, screens: 2, mazes: true },
  twoplayer: { name: '2 PLAYERS', about: 'WASD vs arrows',  players: 2, computerSnakes: 0, food: 2,  powerUps: true, screens: 1 },
  online:    { name: 'ONLINE',    about: 'Private room',    online: true, computerSnakes: 0, food: 10, powerUps: true, screens: 2, mazes: true },
};

// Power-ups and power downs: icons that pop up on the board now and then.
// Run over one to use it. Good ones have a green glow, bad ones a red glow.
//   says:  floats up when you take it
//   about: the line in the legend on the start screen
// What each one does is in usePowerUp() (section 3e). To add one, add a line
// here and a matching part there.
const POWER_UPS = {
  grow:   { icon: '⭐', good: true,  says: '+3',         about: 'Grow 3 longer, +3 points' },
  speed:  { icon: '⚡', good: true,  says: 'FAST!',      about: 'Go twice as fast' },
  ghost:  { icon: '👻', good: true,  says: 'GHOST!',     about: 'Slide through snakes' },
  fat:    { icon: '🦖', good: true,  says: 'DINO!',      about: '2x wider: others crash into you' },
  shrink: { icon: '💀', good: false, says: '-3',         about: 'Shrink 3 shorter, -3 points' },
  slow:   { icon: '🐢', good: false, says: 'SLOW...',    about: 'Go half speed' },
  flip:   { icon: '🌀', good: false, says: 'BACKWARDS!', about: 'Controls turn backwards' },
  spin:   { icon: '🌪️', good: false, says: 'SPIN!',      about: 'The screen spins around' },
  dark:   { icon: '🙈', good: false, says: 'LIGHTS OUT!', about: 'You only see right around you' },
  // good: null means it could be either. It turns into one of the others at random.
  mystery: { icon: '❓', good: null, says: '?',          about: 'Surprise! Could be good or bad' },
};
const POWER_UP_EVERY = 5000;     // milliseconds between new power-ups (on each screen)
const POWER_UP_LASTS = 10000;    // milliseconds before an uneaten one disappears (it blinks first)
const MAX_POWER_UPS = 3;         // most at once (on each screen)
const POWER_UP_SIZE = 3;         // squares a star adds, or a skull takes away
const EFFECT_LASTS = 5000;       // milliseconds all the others last
const LIGHTS_OUT_SEE = 4;

// Mazes: now and then a maze shows up on a screen nobody is on.
// Hit one of its walls and you crash. Go in one gap and out the other
// and you get the prize. Only in modes with mazes: true (they need a big world).
const MAZE_ACROSS = 7;       // maze size in paths (the walls make it 2 x this + 1 squares)
const MAZE_DOWN = 5;
const MAZE_FIRST = 10000;    // milliseconds into the game before the first maze
const MAZE_EVERY = 20000;    // milliseconds between one maze going and the next one coming
const MAZE_LASTS = 45000;    // milliseconds a maze stays if nobody gets through (it blinks first)
const MAZE_PRIZE = 10;       // squares longer and points for getting through        // with lights out, how many squares around your head you can see

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
const TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

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

// Quick links: a link like ?mode=easy skips the start screen and goes
// straight into that mode. Add &color=pink to pick a color too.
// Examples:  snake.datasolutions365.com/?mode=easy
//            snake.datasolutions365.com/?mode=medium&color=pink
const LINK = new URLSearchParams(window.location.search);
let quickLinkUsed = false; // only jump in once, so "Change mode" still shows the start screen

// A clickable/tappable button: a box with text on it.
function makeButton(scene, x, y, label, color, onClick, width = 280, fontSize = '22px') {
  const button = scene.add.text(x, y, label, {
    fontSize, color: '#111111', backgroundColor: color, padding: { x: 18, y: 10 }, align: 'center', fixedWidth: width,
  }).setOrigin(0.5).setInteractive({ useHandCursor: true });
  button.on('pointerdown', onClick);
  return button;
}


// =====================================================================
//  2. START SCREEN
//  A "scene" is one screen of the game. Each screen is its own class.
//  Phaser calls create() once when the screen opens.
// =====================================================================

class StartScene extends Phaser.Scene {
  constructor() { super('Start'); } // 'Start' is this screen's name

  create() {
    this.p2Label = null;

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
      this.scene.start('Game', { mode: linkMode, color: linkColor >= 0 ? linkColor : loadColorChoice() });
      return;
    }

    this.add.text(WIDTH / 2, HEIGHT / 2 - 225, 'SNAKE', { fontSize: '64px', color: '#7cfc00' }).setOrigin(0.5);

    const howTo = TOUCH ? 'Swipe to steer' : 'Steer with the arrow keys or the mouse';
    this.add.text(WIDTH / 2, HEIGHT / 2 - 135, howTo + '\nEat the red food to grow\nDon\'t hit the walls or any snake!',
      { fontSize: '18px', color: '#cccccc', align: 'center', lineSpacing: 8 }).setOrigin(0.5);

    this.setupColorPicker(HEIGHT / 2 - 35);
    this.setupLegend();

    // Leaderboard button in the top-right corner (once Firebase is set up). Keyboard: L
    if (Leaderboard.available()) {
      const showBoard = () => Leaderboard.show('easy');
      this.add.text(WIDTH - 10, 10, '🏆 Leaderboard', { fontSize: '18px', color: '#ffff66', backgroundColor: '#333333', padding: { x: 8, y: 6 } })
        .setOrigin(1, 0).setInteractive({ useHandCursor: true }).on('pointerdown', showBoard);
      this.input.keyboard.on('keydown-L', showBoard);
    }

    this.add.text(WIDTH / 2, HEIGHT / 2 + 25, 'Choose a mode:', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);

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
      const start = () => {
        if (Leaderboard.isOpen() || this.legend.visible) return; // something is showing on top
        if (mode.online) this.scene.start('OnlineMenu', { color: this.colorChoice });
        else this.scene.start('Game', { mode: key, color: this.colorChoice });
      };
      makeButton(this, x, y, (TOUCH ? '' : (i + 1) + '. ') + mode.name + '\n' + mode.about,
        buttonColors[i % buttonColors.length], start, PORTRAIT ? 280 : 210, PORTRAIT ? '22px' : '19px');
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
  }

  // The power-up legend: a "?" button in the top-left corner (keyboard: P)
  // opens a list of what every power-up and power down does.
  setupLegend() {
    const lines = ['POWER-UPS'];
    Object.values(POWER_UPS).filter(pu => pu.good === true).forEach(pu => lines.push(pu.icon + '  ' + pu.about));
    lines.push('', 'POWER DOWNS');
    Object.values(POWER_UPS).filter(pu => pu.good === false).forEach(pu => lines.push(pu.icon + '  ' + pu.about));
    Object.values(POWER_UPS).filter(pu => pu.good === null).forEach(pu => lines.push('', pu.icon + '  ' + pu.about));
    lines.push('', '🧩  Mazes: find the orange on the map.', '    Hit a wall: crash. Get through: +' + MAZE_PRIZE + '!');
    lines.push('', 'All but ⭐ and 💀 last ' + EFFECT_LASTS / 1000 + ' seconds.', '', TOUCH ? 'Tap to close' : 'Click or press P to close');

    const box = this.add.container(0, 0).setDepth(10).setVisible(false);
    box.add(this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.9).setOrigin(0).setInteractive());
    box.add(this.add.text(WIDTH / 2, HEIGHT / 2, lines.join('\n'), {
      fontSize: PORTRAIT ? '15px' : '19px', color: '#ffffff', align: 'left', lineSpacing: 6,
    }).setOrigin(0.5));
    const toggle = () => box.setVisible(!box.visible);
    box.list[0].on('pointerdown', toggle);

    this.add.text(10, 10, '⭐ Power-ups', { fontSize: '18px', color: '#111111', backgroundColor: '#7cfc00', padding: { x: 8, y: 6 } })
      .setInteractive({ useHandCursor: true }).on('pointerdown', toggle);
    this.input.keyboard.on('keydown-P', toggle);
    this.legend = box;
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
      this.colorLabel.setText('Your color: ' + PLAYER_COLORS[i].name);
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
    if (!this.online) this.me = this.players[0];

    // Score, shown in the top-left corner.
    this.scoreText = this.onHud(this.add.text(10, 10, '', { fontSize: '20px', color: '#ffffff' }));
    this.updateScoreText();

    this.setupControls();

    // Food: a list of spots, so there can be more than one piece at a time.
    this.computerSnakes = [];
    this.foods = [];
    this.leftovers = []; // pieces of crashed computer snakes, free to eat (see 3h)
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
    for (let i = 0; i < this.mode.computerSnakes; i++) this.spawnComputerSnake(computerColors[i % computerColors.length]);

    // Run step() over and over on a timer, instead of every frame,
    // so the snakes move one square at a time. It runs twice as often as
    // a normal snake moves, so a sped-up snake can move on every tick.
    // Online, only the host runs the game; everyone else draws what the host sends (see 3i).
    if (!this.online || this.online.isHost) {
      this.timer = this.time.addEvent({ delay: MOVE_EVERY / 2, loop: true, callback: this.step, callbackScope: this });
    }
    if (this.online) this.startOnline();

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
    };
  }

  // Is this player sped up, a ghost, slowed down or backwards right now?
  has(player, kind) {
    return (player.until[kind] || 0) > this.clock;
  }

  updateScoreText() {
    if (this.players.length === 1) this.scoreText.setText('Score: ' + this.players[0].score);
    else this.scoreText.setText(this.players.map(p => p.name + ': ' + (p.crashed && !this.online ? 'out' : p.score)).join('    '));
    // Online: how long is left in the round.
    if (this.online) {
      const secondsLeft = Math.max(0, Math.ceil((ROUND_LENGTH - this.clock) / 1000));
      this.scoreText.setText('⏱ ' + Math.floor(secondsLeft / 60) + ':' + String(secondsLeft % 60).padStart(2, '0') + '    ' + this.scoreText.text);
    }
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

    // Mouse: once you move the mouse, your snake heads toward the pointer
    // (see steerToMouse). Pressing an arrow key switches back to the keys.
    this.mouseSteering = false;
    if (!TOUCH) this.input.on('pointermove', () => { this.mouseSteering = true; });
  }

  // Turn toward the mouse pointer: go whichever way it's furthest away
  // (across or up/down). If that's straight back, go the other way round.
  steerToMouse() {
    const me = this.me;
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

    // The arrow keys steer your snake, or player 2's with two on one keyboard.
    const arrowsPlayer = this.players.length === 2 && !this.online ? this.players[1] : this.me;
    if (arrowsPlayer === this.me && (this.cursors.left.isDown || this.cursors.right.isDown || this.cursors.up.isDown || this.cursors.down.isDown)) {
      this.mouseSteering = false;
    }
    if (this.players.length === 2 && (this.wasd.A.isDown || this.wasd.D.isDown || this.wasd.W.isDown || this.wasd.S.isDown)) {
      this.mouseSteering = false;
    }
    this.steerToMouse();
    if (this.cursors.left.isDown) this.turn(arrowsPlayer, -1, 0);
    if (this.cursors.right.isDown) this.turn(arrowsPlayer, 1, 0);
    if (this.cursors.up.isDown) this.turn(arrowsPlayer, 0, -1);
    if (this.cursors.down.isDown) this.turn(arrowsPlayer, 0, 1);

    if (this.players.length === 2) {
      const p1 = this.players[0];
      if (this.wasd.A.isDown) this.turn(p1, -1, 0);
      if (this.wasd.D.isDown) this.turn(p1, 1, 0);
      if (this.wasd.W.isDown) this.turn(p1, 0, -1);
      if (this.wasd.S.isDown) this.turn(p1, 0, 1);
    }
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
    const alive = this.players.filter(p => !p.crashed
      && (this.has(p, 'speed') || (this.has(p, 'slow') ? slowStep : fullStep)));
    if (alive.length === 0 && !fullStep) return; // nobody moves this tick

    // First work out where every moving player's new head goes:
    // one square in their current direction.
    alive.forEach(p => {
      p.direction = p.nextDirection;
      p.newHead = { x: p.body[0].x + p.direction.x, y: p.body[0].y + p.direction.y };
    });

    // Then check who crashed: into a wall, any snake, or (with two players)
    // head-on into another player's head. Ghosts only crash into walls.
    const crashedNow = alive.filter(p => {
      if (this.hitsWall(p.newHead)) return true;
      if (this.has(p, 'ghost')) return false;
      const headOn = alive.some(other => other !== p && !this.has(other, 'ghost') && other.newHead.x === p.newHead.x && other.newHead.y === p.newHead.y);
      return this.hitsPlayer(p.newHead, alive, p) || this.hitsComputerSnake(p.newHead) || headOn;
    });
    crashedNow.forEach(p => { p.crashed = true; });

    if (this.online) {
      // Online, a crashed player's snake turns into food, they lose some
      // points, and they come back a few seconds later (see respawnPlayers).
      // The round ends when the time runs out.
      crashedNow.forEach(p => {
        p.body.forEach(part => this.leftovers.push({ x: part.x, y: part.y, color: p.color.body }));
        p.score = Math.max(0, p.score - CRASH_COSTS);
        p.respawnAt = this.clock + PLAYER_RESPAWN_AFTER;
        p.until = {};
        p.grow = 0;
      });
      if (this.clock >= ROUND_LENGTH) {
        this.gameOver();
        return;
      }
      if (fullStep) this.respawnPlayers();
    } else if (crashedNow.length > 0) {
      this.gameOver();
      return;
    }

    // Moving = add a new head at the front, remove the last tail square.
    alive.filter(p => !p.crashed).forEach(p => {
      p.body.unshift(p.newHead);
      if (this.eatFoodAt(p.newHead)) {
        // Ate the food! Skipping pop() leaves the tail where it was,
        // so the snake ends up one square longer.
        p.score += 1;
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
      }
      this.takePowerUpAt(p);
      this.checkMaze(p); // see 3k
    });
    this.updateScoreText();

    // Now the computer snakes take their step, and power-ups come and go.
    if (fullStep) {
      this.moveComputerSnakes();
      this.updatePowerUps();
      this.updateMaze();
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
  // The edge of the world, or a maze wall (see 3k).
  hitsWall(spot) {
    return spot.x < 0 || spot.x >= this.cols || spot.y < 0 || spot.y >= this.rows
      || !!(this.maze && this.maze.walls.has(spot.x + ',' + spot.y));
  }

  // Is any player's snake on this square? The tail square of a snake
  // that's moving is about to move out of the way, so it doesn't count.
  // The wide part of a dinosaur counts too, except for the dinosaur itself (me).
  hitsPlayer(spot, moving = this.players, me = null) {
    const here = part => part.x === spot.x && part.y === spot.y;
    return this.players.some(p => !(this.online && p.crashed) && !this.has(p, 'ghost')
      && ((moving.includes(p) ? p.body.slice(0, -1) : p.body).some(here) || (p !== me && this.fatCells(p).some(here))));
  }

  hitsComputerSnake(spot) {
    return this.computerSnakes.some(cs => cs.alive && cs.body.some(part => part.x === spot.x && part.y === spot.y));
  }

  // Is anything (any snake, or food) on this square?
  isTaken(spot) {
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

  // Power-ups: did this player just run over one?
  takePowerUpAt(p) {
    const i = this.powerUps.findIndex(pu => pu.x === p.body[0].x && pu.y === p.body[0].y);
    if (i === -1) return;
    let kind = this.powerUps[i].kind;
    this.powerUps.splice(i, 1);
    // A surprise turns into one of the others.
    if (kind === 'mystery') kind = Phaser.Utils.Array.GetRandom(Object.keys(POWER_UPS).filter(k => k !== 'mystery'));
    this.usePowerUp(p, kind);
    this.pops.push({ x: p.body[0].x, y: p.body[0].y, kind });
  }

  // What each power-up does.
  usePowerUp(p, kind) {
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
      p.until[kind] = this.clock + EFFECT_LASTS;
      if (kind === 'speed') delete p.until.slow;
      if (kind === 'slow') delete p.until.speed;
    }
  }

  // Old power-ups disappear; now and then a new one shows up.
  updatePowerUps() {
    this.powerUps = this.powerUps.filter(pu => pu.until > this.clock);
    if (!this.mode.powerUps || this.clock < this.nextPowerUpAt) return;
    const screenCount = this.screens * this.screens;
    this.nextPowerUpAt = this.clock + POWER_UP_EVERY / screenCount;
    if (this.powerUps.length >= MAX_POWER_UPS * screenCount) return;
    const kind = Phaser.Utils.Array.GetRandom(Object.keys(POWER_UPS));
    this.powerUps.push({ ...this.freeSpot(), kind, until: this.clock + POWER_UP_LASTS });
  }

  // "+3", "FAST!" or "-3" floats up from where a power-up was taken.
  showPops(pops) {
    pops.forEach(pop => {
      const info = pop.kind === 'maze' ? { says: 'MAZE BEATEN! +' + MAZE_PRIZE, good: true } : POWER_UPS[pop.kind];
      if (!info) return;
      const text = this.inWorld(this.add.text((pop.x + 0.5) * CELL, pop.y * CELL, info.says, {
        fontSize: '22px', fontStyle: 'bold', color: info.good ? '#7cfc00' : '#ff4444', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(6));
      this.tweens.add({ targets: text, y: text.y - 40, alpha: 0, duration: 900, onComplete: () => text.destroy() });
    });
  }

  // ----- 3f. Drawing -----
  draw() {
    this.graphics.clear();
    this.drawEdges(); // see 3j
    this.drawMaze();  // see 3k

    // Power-ups: a green (good) or red (bad) glow, with the emoji on top.
    // Each emoji is its own text object, kept from one draw to the next.
    const g = this.graphics;
    const icons = {};
    this.powerUps.forEach(pu => {
      const info = POWER_UPS[pu.kind];
      if (!info) return;
      g.fillStyle(info.good === null ? 0xffff66 : info.good ? 0x7cfc00 : 0xff4444, 0.35); // yellow for a surprise
      g.fillCircle(pu.x * CELL + CELL / 2, pu.y * CELL + CELL / 2, CELL * 0.75);
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

    // Food: red squares.
    this.graphics.fillStyle(0xff4444);
    this.foods.forEach(food => this.graphics.fillRect(food.x * CELL, food.y * CELL, CELL - 1, CELL - 1));

    // Leftovers from crashed snakes: smaller squares in that snake's color.
    this.leftovers.forEach(piece => {
      this.graphics.fillStyle(piece.color);
      this.graphics.fillRect(piece.x * CELL + 4, piece.y * CELL + 4, CELL - 9, CELL - 9);
    });

    // Computer snakes: each in its own color, with a white dot on the head.
    this.computerSnakes.filter(cs => cs.alive).forEach(cs => {
      this.graphics.fillStyle(cs.color);
      cs.body.forEach(part => this.graphics.fillRect(part.x * CELL, part.y * CELL, CELL - 1, CELL - 1));
      this.graphics.fillStyle(0xffffff);
      this.graphics.fillRect(cs.body[0].x * CELL + 6, cs.body[0].y * CELL + 6, CELL - 13, CELL - 13);
    });

    // Players' snakes, in their colors. The head is a lighter shade.
    // While a power-up is working: sped up, the head flashes white;
    // a ghost is see-through; slowed down or backwards, the head flashes red.
    // (Online, a player who's out has already turned into leftovers.)
    const flash = Math.floor(this.clock / MOVE_EVERY) % 2 === 0;
    this.players.filter(p => !(this.online && p.crashed)).forEach(p => {
      let head = p.color.head;
      if (flash && this.has(p, 'speed')) head = 0xffffff;
      if (flash && (this.has(p, 'slow') || this.has(p, 'flip'))) head = 0xff4444;
      const alpha = this.has(p, 'ghost') ? 0.4 : 1;
      p.body.forEach((part, i) => {
        this.graphics.fillStyle(i === 0 ? head : p.color.body, alpha);
        // -1 leaves a thin gap so you can see each square.
        this.graphics.fillRect(part.x * CELL, part.y * CELL, CELL - 1, CELL - 1);
      });
      // A dinosaur has a second row of squares down one side.
      this.fatCells(p).forEach((part, i) => {
        if (this.hitsWall(part)) return;
        this.graphics.fillStyle(i === 0 ? head : p.color.body, alpha);
        this.graphics.fillRect(part.x * CELL, part.y * CELL, CELL - 1, CELL - 1);
      });
    });

    if (this.online) this.updateOutText(); // see 3i
    this.drawLightsOut(); // see 3j
    this.followMe();
    this.drawMiniMap();
  }

  // ----- 3g. Game over -----
  gameOver() {
    if (this.timer) this.timer.remove(); // stop everything moving
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
    const result = { mode: this.modeKey, color: this.colorChoice };

    if (this.players.length === 1) {
      const score = this.players[0].score;
      const best = loadHighScore(this.modeKey);
      result.score = score;
      result.newBest = score > best;
      result.best = Math.max(best, score);
      if (result.newBest) saveHighScore(this.modeKey, score);
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
      this.computerSnakes.push({ body: [head, tail1, tail2], direction: { x: 1, y: 0 }, color, alive: true });
      return;
    }
  }
  // Board too crowded to fit one in. Try again later.
  this.time.delayedCall(RESPAWN_AFTER, () => this.spawnComputerSnake(color));
};

GameScene.prototype.moveComputerSnakes = function () {
  this.computerSnakes.filter(cs => cs.alive).forEach(cs => {
    const head = cs.body[0];

    // THE BRAIN, in three simple rules:
    // 1. Look at the 3 ways it could go (it can't turn straight back).
    const options = [
      cs.direction,                                  // straight on
      { x: -cs.direction.y, y: cs.direction.x },     // turn one way
      { x: cs.direction.y, y: -cs.direction.x },     // turn the other way
    ];

    // 2. Throw out any move that hits a wall or a snake.
    //    Sometimes it doesn't notice your snake, so you can cut it off.
    const seesYou = Math.random() >= COMPUTER_MISSES_YOU;
    const safe = options.filter(dir => {
      const spot = { x: head.x + dir.x, y: head.y + dir.y };
      return !this.hitsWall(spot) && !this.hitsComputerSnake(spot) && !(seesYou && this.hitsPlayer(spot));
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

    // Same rule as for you: run into another snake and you crash.
    if (this.hitsPlayer(newHead)) {
      this.crashComputerSnake(cs);
      return;
    }

    cs.body.unshift(newHead);
    if (!this.eatFoodAt(newHead)) cs.body.pop();
    // Computer snakes gobble up power-ups too, but they do nothing for them.
    this.powerUps = this.powerUps.filter(pu => pu.x !== newHead.x || pu.y !== newHead.y);
  });
};

// A crashed computer snake disappears, and every square of its body is
// left behind as a piece of food anyone can eat. A new one comes later.
GameScene.prototype.crashComputerSnake = function (cs) {
  cs.alive = false;
  cs.body.forEach(part => this.leftovers.push({ x: part.x, y: part.y, color: cs.color }));
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
    this.players.push(this.makePlayer(p.name, PLAYER_COLORS[p.color], body, { x: goingRight ? 1 : -1, y: 0 }, p.id));
  });
  this.me = this.players.find(p => p.id === info.myId);
};

// Host: bring back crashed players once they've waited long enough.
// They get a new 3-square snake somewhere empty, away from everyone else,
// heading toward the middle of the board.
GameScene.prototype.respawnPlayers = function () {
  this.players.filter(p => p.crashed && this.clock >= p.respawnAt).forEach(p => {
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
    p.body = sent.body;
    p.score = sent.score;
    p.crashed = sent.crashed;
    p.until = sent.until;
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
  this.hudCamera.ignore([this.graphics, this.fog]);
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
  g.fillStyle(0x888888);
  g.fillRect(0, 0, w, 3);
  g.fillRect(0, h - 3, w, 3);
  g.fillRect(0, 0, 3, h);
  g.fillRect(w - 3, 0, 3, h);
  g.fillStyle(0x7cfc00, 0.25);
  for (let i = 1; i < this.screens; i++) {
    g.fillRect(i * this.frameCols * CELL - 2, 0, 4, h);
    g.fillRect(0, i * this.frameRows * CELL - 2, w, 4);
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
//  A maze is a block of walls with a gap on its left and right sides.
//  hitsWall() (section 3d) counts its walls, so snakes crash into them
//  and computer snakes steer around them.
// =====================================================================

// Every step: take the maze away when its time is up, or make a new one.
GameScene.prototype.updateMaze = function () {
  if (!this.mode.mazes || this.screens < 2) return;
  if (this.maze && this.clock >= this.maze.until) this.setMaze(null);
  if (!this.maze && this.clock >= this.nextMazeAt) this.makeMaze();
};

// Build a new maze in the middle of a screen that no player is on.
GameScene.prototype.makeMaze = function () {
  const w = MAZE_ACROSS * 2 + 1, h = MAZE_DOWN * 2 + 1;
  const busy = this.players.filter(p => !p.crashed && p.body.length).map(p => this.screenOf(p.body[0]));
  const free = [];
  for (let sx = 0; sx < this.screens; sx++) {
    for (let sy = 0; sy < this.screens; sy++) {
      if (!busy.some(b => b.sx === sx && b.sy === sy)) free.push({ sx, sy });
    }
  }
  if (!free.length || w > this.frameCols - 2 || h > this.frameRows - 2) {
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

  // Start with every square a wall, then dig paths with a "random walk
  // that backs up when it's stuck". Paths are on the odd squares.
  const walls = new Set();
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) walls.add((left + x) + ',' + (top + y));
  const dig = (x, y) => walls.delete((left + x) + ',' + (top + y));
  const visited = new Set(['1,1']);
  const path = [{ x: 1, y: 1 }];
  dig(1, 1);
  while (path.length) {
    const at = path[path.length - 1];
    const next = [{ x: 2, y: 0 }, { x: -2, y: 0 }, { x: 0, y: 2 }, { x: 0, y: -2 }]
      .map(d => ({ x: at.x + d.x, y: at.y + d.y, d }))
      .filter(n => n.x > 0 && n.x < w && n.y > 0 && n.y < h && !visited.has(n.x + ',' + n.y));
    if (!next.length) { path.pop(); continue; }
    const n = Phaser.Utils.Array.GetRandom(next);
    dig(at.x + n.d.x / 2, at.y + n.d.y / 2); // knock down the wall in between
    dig(n.x, n.y);
    visited.add(n.x + ',' + n.y);
    path.push({ x: n.x, y: n.y });
  }

  // A gap on the left side and one on the right.
  const gapA = { x: left, y: top + 1 + 2 * Phaser.Math.Between(0, MAZE_DOWN - 1) };
  const gapB = { x: left + w - 1, y: top + 1 + 2 * Phaser.Math.Between(0, MAZE_DOWN - 1) };
  walls.delete(gapA.x + ',' + gapA.y);
  walls.delete(gapB.x + ',' + gapB.y);

  // Clear food and power-ups out of the walls.
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
  if (isNew) this.showMessage('🧩 A maze appeared! Look for orange on the map');
};

// Did this player go in one gap and out the other?
GameScene.prototype.checkMaze = function (p) {
  const m = this.maze;
  if (!m) return;
  const head = p.body[0];
  const onGap = gap => head.x === gap.x && head.y === gap.y;
  const inside = head.x >= m.left && head.x < m.left + m.w && head.y >= m.top && head.y < m.top + m.h;
  if (!inside) { p.inMazeFrom = null; return; }
  if (onGap(m.gapA) || onGap(m.gapB)) {
    const gap = onGap(m.gapA) ? 'A' : 'B';
    if (p.inMazeFrom && p.inMazeFrom !== gap) {
      // Made it through!
      p.grow += MAZE_PRIZE;
      p.score += MAZE_PRIZE;
      this.pops.push({ x: head.x, y: head.y, kind: 'maze' });
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
  g.fillStyle(0xb5651d);
  m.walls.forEach(key => {
    const [x, y] = key.split(',').map(Number);
    g.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
  });
  // The two gaps glow green.
  g.fillStyle(0x7cfc00, 0.4);
  [m.gapA, m.gapB].forEach(gap => g.fillRect(gap.x * CELL, gap.y * CELL, CELL - 1, CELL - 1));
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
    const playAgain = () => { if (!Leaderboard.isOpen()) this.scene.start('Game', { mode: data.mode, color: data.color }); };
    const changeMode = () => { if (!Leaderboard.isOpen()) this.scene.start('Start'); };

    // Leaderboard: if this score made the top 10, ask for initials.
    const hasBoard = Leaderboard.available() && Leaderboard.modes.includes(data.mode);
    if (hasBoard) {
      Leaderboard.makesTheBoard(data.mode, data.score)
        .then(made => { if (made && this.scene.isActive()) Leaderboard.askInitials(data.mode, data.score); })
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
        const showBoard = () => Leaderboard.show(data.mode);
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
