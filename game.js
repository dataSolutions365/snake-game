// =====================================================================
//  SNAKE
//  The file is split into numbered sections. Each one has a heading
//  like this, so you can find the part you want to change.
//
//    1. SETTINGS        numbers you can tweak (speed, board size)
//    2. START SCREEN    the title screen you see first
//    3. THE GAME        the snake, food, controls and score
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

// Touch screens get swipe controls instead of arrow keys.
const TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// The best score is saved in the browser so it's still there next visit.
// (try/catch because some private-browsing modes block saving.)
function loadHighScore() {
  try { return Number(localStorage.getItem('snakeHighScore')) || 0; } catch (e) { return 0; }
}
function saveHighScore(score) {
  try { localStorage.setItem('snakeHighScore', score); } catch (e) { }
}


// =====================================================================
//  2. START SCREEN
//  A "scene" is one screen of the game. Each screen is its own class.
//  Phaser calls create() once when the screen opens.
// =====================================================================

class StartScene extends Phaser.Scene {
  constructor() { super('Start'); } // 'Start' is this screen's name

  create() {
    this.add.text(WIDTH / 2, HEIGHT / 2 - 80, 'SNAKE', { fontSize: '64px', color: '#7cfc00' }).setOrigin(0.5);

    const howTo = TOUCH ? 'Swipe to steer' : 'Use the arrow keys to steer';
    this.add.text(WIDTH / 2, HEIGHT / 2, howTo + '\nEat the red food to grow\nDon\'t hit the walls or yourself!',
      { fontSize: '18px', color: '#cccccc', align: 'center', lineSpacing: 8 }).setOrigin(0.5);

    this.add.text(WIDTH / 2, HEIGHT / 2 + 80, 'Best: ' + loadHighScore(), { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);

    const prompt = this.add.text(WIDTH / 2, HEIGHT / 2 + 130, TOUCH ? 'Tap to start' : 'Press SPACE or click to start',
      { fontSize: '22px', color: '#ffff66' }).setOrigin(0.5);
    // Make the prompt blink so it catches your eye.
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    // Switch to the game screen on a tap, click, or the space bar.
    this.input.once('pointerdown', () => this.scene.start('Game'));
    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('Game'));
  }
}


// =====================================================================
//  3. THE GAME
// =====================================================================

class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  // ----- 3a. Setup: runs once each time a new game starts -----
  create() {
    // The snake is a list of grid positions. Item 0 is the head.
    // It starts 3 squares long in the middle of the board, facing right.
    const midX = Math.floor(COLS / 2), midY = Math.floor(ROWS / 2);
    this.snake = [
      { x: midX, y: midY },
      { x: midX - 1, y: midY },
      { x: midX - 2, y: midY },
    ];
    this.direction = { x: 1, y: 0 };     // the way the snake is moving now
    this.nextDirection = { x: 1, y: 0 }; // the way the player last pressed

    // A Graphics object is like a blank canvas we can draw shapes on.
    this.graphics = this.add.graphics();

    // Score, shown in the top-left corner.
    this.score = 0;
    this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', color: '#ffffff' });

    this.setupControls();
    this.placeFood();

    // Run moveSnake() over and over on a timer, instead of every frame,
    // so the snake moves one square at a time.
    this.timer = this.time.addEvent({ delay: MOVE_EVERY, loop: true, callback: this.moveSnake, callbackScope: this });

    this.draw();
  }

  // ----- 3b. Controls: arrow keys and swipes -----
  setupControls() {
    this.cursors = this.input.keyboard.createCursorKeys();

    // Swipes: remember where the finger went down, and when it lifts,
    // turn whichever way it moved the most (left/right or up/down).
    this.input.on('pointerdown', pointer => { this.swipeStart = { x: pointer.x, y: pointer.y }; });
    this.input.on('pointerup', pointer => {
      if (!this.swipeStart) return;
      const dx = pointer.x - this.swipeStart.x;
      const dy = pointer.y - this.swipeStart.y;
      this.swipeStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return; // too short, just a tap
      if (Math.abs(dx) > Math.abs(dy)) this.turn(dx > 0 ? 1 : -1, 0);
      else this.turn(0, dy > 0 ? 1 : -1);
    });
  }

  // Phaser calls update() about 60 times per second. We check the keys here.
  // We only remember the choice; the snake actually turns on its next step.
  update() {
    if (this.cursors.left.isDown) this.turn(-1, 0);
    if (this.cursors.right.isDown) this.turn(1, 0);
    if (this.cursors.up.isDown) this.turn(0, -1);
    if (this.cursors.down.isDown) this.turn(0, 1);
  }

  // Used by both the arrow keys and swipes.
  turn(x, y) {
    // Don't let the snake turn straight back into itself.
    if (x === -this.direction.x && y === -this.direction.y) return;
    this.nextDirection = { x, y };
  }

  // ----- 3c. Movement: one step of the snake -----
  moveSnake() {
    this.direction = this.nextDirection;

    // Work out where the new head goes: one square in the current direction.
    const head = this.snake[0];
    const newHead = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y,
    };

    // Crashed into a wall or into itself? Then the game is over.
    if (this.hitsWall(newHead) || this.hitsSelf(newHead)) {
      this.gameOver();
      return;
    }

    // Moving = add a new head at the front, remove the last tail square.
    this.snake.unshift(newHead);

    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      // Ate the food! Skipping pop() leaves the tail where it was,
      // so the snake ends up one square longer.
      this.score += 1;
      this.scoreText.setText('Score: ' + this.score);
      this.placeFood();
    } else {
      this.snake.pop();
    }

    this.draw();
  }

  // ----- 3d. Crash checks -----
  hitsWall(spot) {
    return spot.x < 0 || spot.x >= COLS || spot.y < 0 || spot.y >= ROWS;
  }

  hitsSelf(spot) {
    // The last tail square is about to move out of the way, so skip it.
    return this.snake.slice(0, -1).some(part => part.x === spot.x && part.y === spot.y);
  }

  // ----- 3e. Food -----
  placeFood() {
    // Pick random squares until we find one the snake isn't on.
    let spot;
    do {
      spot = {
        x: Phaser.Math.Between(0, COLS - 1),
        y: Phaser.Math.Between(0, ROWS - 1),
      };
    } while (this.snake.some(part => part.x === spot.x && part.y === spot.y));
    this.food = spot;
  }

  // ----- 3f. Drawing -----
  draw() {
    this.graphics.clear();

    // Food: a red square.
    this.graphics.fillStyle(0xff4444);
    this.graphics.fillRect(this.food.x * CELL, this.food.y * CELL, CELL - 1, CELL - 1);

    // Snake: the head is a brighter green than the body.
    this.snake.forEach((part, i) => {
      this.graphics.fillStyle(i === 0 ? 0x7cfc00 : 0x32cd32);
      // -1 leaves a thin gap so you can see each square.
      this.graphics.fillRect(part.x * CELL, part.y * CELL, CELL - 1, CELL - 1);
    });
  }

  // ----- 3g. Game over -----
  gameOver() {
    this.timer.remove(); // stop the snake moving
    this.cameras.main.shake(200, 0.01);

    const best = loadHighScore();
    const newBest = this.score > best;
    if (newBest) saveHighScore(this.score);

    // Wait a moment so you can see where you crashed, then show the
    // game over screen. The { } part passes the score along to it.
    this.time.delayedCall(700, () => {
      this.scene.start('GameOver', { score: this.score, best: Math.max(best, this.score), newBest });
    });
  }
}


// =====================================================================
//  4. GAME OVER SCREEN
// =====================================================================

class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  // data is the { score, best, newBest } sent from the game screen.
  create(data) {
    this.add.text(WIDTH / 2, HEIGHT / 2 - 90, 'GAME OVER', { fontSize: '52px', color: '#ff4444' }).setOrigin(0.5);
    this.add.text(WIDTH / 2, HEIGHT / 2 - 20, 'Score: ' + data.score, { fontSize: '28px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(WIDTH / 2, HEIGHT / 2 + 20, data.newBest ? 'New best score!' : 'Best: ' + data.best,
      { fontSize: '20px', color: data.newBest ? '#ffff66' : '#cccccc' }).setOrigin(0.5);

    const prompt = this.add.text(WIDTH / 2, HEIGHT / 2 + 90, TOUCH ? 'Tap to play again' : 'Press SPACE or click to play again',
      { fontSize: '22px', color: '#ffff66' }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });

    // Short pause first, so a swipe that was still happening doesn't
    // restart the game by accident.
    this.time.delayedCall(500, () => {
      this.input.once('pointerdown', () => this.scene.start('Game'));
      this.input.keyboard.once('keydown-SPACE', () => this.scene.start('Game'));
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
