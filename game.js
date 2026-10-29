// =====================================================================
//  SNAKE
//  The file is split into numbered sections. Each one has a heading
//  like this, so you can find the part you want to change.
//
//    1. SETTINGS        numbers you can tweak (speed, board size)
//    2. START SCREEN    the title screen you see first
//    3. THE GAME        the snake, food, controls, score and computer snakes
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

// Game modes. The player picks one on the start screen.
// To add a new mode (like HARD), copy one of these blocks and change the numbers.
// players: 2 means two people on one keyboard (not shown on phones).
const MODES = {
  easy:    { name: 'EASY',      about: 'Just you',         players: 1, computerSnakes: 0, food: 1 },
  medium:  { name: 'MEDIUM',    about: 'Computer snakes',  players: 1, computerSnakes: 2, food: 3 },
  twoplayer: { name: '2 PLAYERS', about: 'WASD vs arrows', players: 2, computerSnakes: 0, food: 2 },
};

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

    // Opened from a quick link? Jump straight into the game.
    const linkMode = (LINK.get('mode') || '').toLowerCase();
    if (MODES[linkMode] && !quickLinkUsed) {
      quickLinkUsed = true;
      const linkColor = PLAYER_COLORS.findIndex(c => c.name.toLowerCase() === (LINK.get('color') || '').toLowerCase());
      this.scene.start('Game', { mode: linkMode, color: linkColor >= 0 ? linkColor : loadColorChoice() });
      return;
    }

    this.add.text(WIDTH / 2, HEIGHT / 2 - 225, 'SNAKE', { fontSize: '64px', color: '#7cfc00' }).setOrigin(0.5);

    const howTo = TOUCH ? 'Swipe to steer' : 'Use the arrow keys to steer';
    this.add.text(WIDTH / 2, HEIGHT / 2 - 135, howTo + '\nEat the red food to grow\nDon\'t hit the walls or any snake!',
      { fontSize: '18px', color: '#cccccc', align: 'center', lineSpacing: 8 }).setOrigin(0.5);

    this.setupColorPicker(HEIGHT / 2 - 35);

    this.add.text(WIDTH / 2, HEIGHT / 2 + 25, 'Choose a mode:', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);

    // One button per mode. Keyboard: 1, 2, 3...
    // On a wide screen they sit side by side; on a phone they stack down the screen.
    // Two-player modes are left off phones, since they need a keyboard.
    const modeKeys = Object.keys(MODES).filter(key => !(TOUCH && MODES[key].players === 2));
    const buttonColors = ['#7cfc00', '#ffa500', '#3fa9f5', '#ff66cc'];
    const keyNames = ['ONE', 'TWO', 'THREE', 'FOUR'];
    modeKeys.forEach((key, i) => {
      const mode = MODES[key];
      const x = PORTRAIT ? WIDTH / 2 : WIDTH / 2 + (i - (modeKeys.length - 1) / 2) * 260;
      const y = PORTRAIT ? HEIGHT / 2 + 75 + i * 105 : HEIGHT / 2 + 90;
      // Tell the game which mode, and which color the player picked.
      const start = () => this.scene.start('Game', { mode: key, color: this.colorChoice });
      makeButton(this, x, y, (TOUCH ? '' : (i + 1) + '. ') + mode.name + '\n' + mode.about,
        buttonColors[i % buttonColors.length], start, PORTRAIT ? 280 : 210, PORTRAIT ? '22px' : '19px');
      const under = this.add.text(x, y + 50, 'Best: ' + loadHighScore(key), { fontSize: '16px', color: '#aaaaaa' }).setOrigin(0.5);
      if (mode.players === 2) this.p2Label = under; // filled in by update() below
      this.input.keyboard.once('keydown-' + keyNames[i], start);
    });
  }

  // Phaser calls update() about 60 times per second. Keep player 2's
  // color up to date as player 1 picks theirs.
  update() {
    if (this.p2Label) this.p2Label.setText('P2 is ' + secondColor(this.colorChoice).name);
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

    // A Graphics object is like a blank canvas we can draw shapes on.
    this.graphics = this.add.graphics();

    // The players. Each one is a snake: a list of grid positions, item 0 is the head.
    // With one player it starts in the middle. With two, player 1 starts at the
    // top facing right and player 2 at the bottom facing left.
    const midX = Math.floor(COLS / 2), midY = Math.floor(ROWS / 2);
    const colors = [PLAYER_COLORS[data.color], secondColor(data.color)];
    this.players = [];
    if (this.mode.players === 2) {
      const topY = Math.floor(ROWS / 3), bottomY = Math.floor(ROWS * 2 / 3);
      this.players.push(this.makePlayer('P1', colors[0], [{ x: midX, y: topY }, { x: midX - 1, y: topY }, { x: midX - 2, y: topY }], { x: 1, y: 0 }));
      this.players.push(this.makePlayer('P2', colors[1], [{ x: midX, y: bottomY }, { x: midX + 1, y: bottomY }, { x: midX + 2, y: bottomY }], { x: -1, y: 0 }));
    } else {
      this.players.push(this.makePlayer('You', colors[0], [{ x: midX, y: midY }, { x: midX - 1, y: midY }, { x: midX - 2, y: midY }], { x: 1, y: 0 }));
    }

    // Score, shown in the top-left corner.
    this.scoreText = this.add.text(10, 10, '', { fontSize: '20px', color: '#ffffff' });
    this.updateScoreText();

    this.setupControls();

    // Food: a list of spots, so there can be more than one piece at a time.
    this.computerSnakes = [];
    this.foods = [];
    this.leftovers = []; // pieces of crashed computer snakes, free to eat (see 3h)
    for (let i = 0; i < this.mode.food; i++) this.foods.push(this.freeSpot());

    // Computer snakes (see section 3h).
    // They get the computer colors in order, skipping the players' colors.
    const computerColors = COMPUTER_COLORS.filter(c => !this.players.some(p => p.color.body === c));
    for (let i = 0; i < this.mode.computerSnakes; i++) this.spawnComputerSnake(computerColors[i % computerColors.length]);

    // Run step() over and over on a timer, instead of every frame,
    // so the snakes move one square at a time.
    this.timer = this.time.addEvent({ delay: MOVE_EVERY, loop: true, callback: this.step, callbackScope: this });

    this.draw();
  }

  // Everything we need to know about one player's snake.
  makePlayer(name, color, body, direction) {
    return {
      name, color, body,
      direction,               // the way the snake is moving now
      nextDirection: direction, // the way the player last pressed
      score: 0,
      crashed: false,
    };
  }

  updateScoreText() {
    if (this.players.length === 1) this.scoreText.setText('Score: ' + this.players[0].score);
    else this.scoreText.setText(this.players.map(p => p.name + ': ' + p.score).join('    '));
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
      if (Math.abs(dx) > Math.abs(dy)) this.turn(this.players[0], dx > 0 ? 1 : -1, 0);
      else this.turn(this.players[0], 0, dy > 0 ? 1 : -1);
    });
  }

  // Phaser calls update() about 60 times per second. We check the keys here.
  // We only remember the choice; the snake actually turns on its next step.
  update() {
    const arrowsPlayer = this.players[this.players.length - 1]; // the only player, or player 2
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
    // Don't let the snake turn straight back into itself.
    if (x === -player.direction.x && y === -player.direction.y) return;
    player.nextDirection = { x, y };
  }

  // ----- 3c. Movement: one step of the game -----
  step() {
    // First work out where every player's new head goes:
    // one square in their current direction.
    this.players.forEach(p => {
      p.direction = p.nextDirection;
      p.newHead = { x: p.body[0].x + p.direction.x, y: p.body[0].y + p.direction.y };
    });

    // Then check who crashed: into a wall, any snake, or (with two players)
    // head-on into the other player's head.
    this.players.forEach(p => {
      const headOn = this.players.some(other => other !== p && other.newHead.x === p.newHead.x && other.newHead.y === p.newHead.y);
      if (this.hitsWall(p.newHead) || this.hitsPlayer(p.newHead) || this.hitsComputerSnake(p.newHead) || headOn) {
        p.crashed = true;
      }
    });
    if (this.players.some(p => p.crashed)) {
      this.gameOver();
      return;
    }

    // Moving = add a new head at the front, remove the last tail square.
    this.players.forEach(p => {
      p.body.unshift(p.newHead);
      if (this.eatFoodAt(p.newHead)) {
        // Ate the food! Skipping pop() leaves the tail where it was,
        // so the snake ends up one square longer.
        p.score += 1;
      } else {
        p.body.pop();
      }
    });
    this.updateScoreText();

    // Now the computer snakes take their step.
    this.moveComputerSnakes();

    this.draw();
  }

  // ----- 3d. Crash checks -----
  hitsWall(spot) {
    return spot.x < 0 || spot.x >= COLS || spot.y < 0 || spot.y >= ROWS;
  }

  // Is any player's snake on this square? Each tail square is about to move
  // out of the way, so it doesn't count.
  hitsPlayer(spot) {
    return this.players.some(p => p.body.slice(0, -1).some(part => part.x === spot.x && part.y === spot.y));
  }

  hitsComputerSnake(spot) {
    return this.computerSnakes.some(cs => cs.alive && cs.body.some(part => part.x === spot.x && part.y === spot.y));
  }

  // Is anything (any snake, or food) on this square?
  isTaken(spot) {
    const allBodies = [...this.players.map(p => p.body), ...this.computerSnakes.filter(cs => cs.alive).map(cs => cs.body)];
    return allBodies.some(body => body.some(part => part.x === spot.x && part.y === spot.y))
      || (this.foods || []).some(food => food.x === spot.x && food.y === spot.y)
      || (this.leftovers || []).some(piece => piece.x === spot.x && piece.y === spot.y);
  }

  // ----- 3e. Food -----
  freeSpot() {
    // Pick random squares until we find an empty one.
    let spot;
    do {
      spot = {
        x: Phaser.Math.Between(0, COLS - 1),
        y: Phaser.Math.Between(0, ROWS - 1),
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

  // ----- 3f. Drawing -----
  draw() {
    this.graphics.clear();

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
    this.players.forEach(p => {
      p.body.forEach((part, i) => {
        this.graphics.fillStyle(i === 0 ? p.color.head : p.color.body);
        // -1 leaves a thin gap so you can see each square.
        this.graphics.fillRect(part.x * CELL, part.y * CELL, CELL - 1, CELL - 1);
      });
    });
  }

  // ----- 3g. Game over -----
  gameOver() {
    this.timer.remove(); // stop everything moving
    this.cameras.main.shake(200, 0.01);

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
//  4. GAME OVER SCREEN
// =====================================================================

class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  // data is what the game screen sent: the mode and color, plus either
  // { score, best, newBest } for one player or { winner, winnerColor, scores } for two.
  create(data) {
    this.add.text(WIDTH / 2, HEIGHT / 2 - 120, 'GAME OVER', { fontSize: '52px', color: '#ff4444' }).setOrigin(0.5);
    this.add.text(WIDTH / 2, HEIGHT / 2 - 65, MODES[data.mode].name + ' mode', { fontSize: '18px', color: '#aaaaaa' }).setOrigin(0.5);

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

    const playAgain = () => this.scene.start('Game', { mode: data.mode, color: data.color }); // same mode and color again
    const changeMode = () => this.scene.start('Start');

    // Short pause first, so a swipe that was still happening doesn't
    // press a button by accident.
    this.time.delayedCall(500, () => {
      makeButton(this, WIDTH / 2, HEIGHT / 2 + 85, TOUCH ? 'Play again' : 'Play again (SPACE)', '#7cfc00', playAgain);
      makeButton(this, WIDTH / 2, HEIGHT / 2 + 150, TOUCH ? 'Change mode' : 'Change mode (M)', '#cccccc', changeMode);
      this.input.keyboard.once('keydown-SPACE', playAgain);
      this.input.keyboard.once('keydown-M', changeMode);
    });
  }
}


// =====================================================================
//  5. START PHASER
//  The first screen in the list is the one that opens first.
// =====================================================================

new Phaser.Game({
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#222222',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [StartScene, GameScene, GameOverScene]
});
