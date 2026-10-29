// ----- Settings -----
// The board is a grid of squares. Changing these numbers changes the board size.
const CELL = 20;        // size of one square, in pixels
const MOVE_EVERY = 120; // milliseconds between snake steps (smaller = faster)

// On a computer or a sideways phone, the board is wide: 40 x 30 squares.
// On a phone held upright, it's tall instead, shaped to fit the screen.
const PORTRAIT = window.innerHeight > window.innerWidth;
const COLS = PORTRAIT ? 20 : 40;  // squares across
const ROWS = PORTRAIT ? Math.min(40, Math.floor(20 * window.innerHeight / window.innerWidth)) : 30; // squares down

// Touch screens get swipe controls instead of arrow keys.
const TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// A "scene" is one screen of the game. Phaser calls create() once at the start
// and update() about 60 times per second.
class MainScene extends Phaser.Scene {
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

    // Listen for the arrow keys.
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

    // Run moveSnake() over and over on a timer, instead of every frame,
    // so the snake moves one square at a time.
    this.time.addEvent({ delay: MOVE_EVERY, loop: true, callback: this.moveSnake, callbackScope: this });

    // A hint at the bottom of the screen.
    const hint = TOUCH ? 'Swipe to steer' : 'Use the arrow keys to steer';
    this.add.text(COLS * CELL / 2, ROWS * CELL - 10, hint, { fontSize: '18px', color: '#aaaaaa' }).setOrigin(0.5, 1);

    // Score, shown in the top-left corner.
    this.score = 0;
    this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', color: '#ffffff' });

    // Put the first piece of food somewhere on the board.
    this.placeFood();

    this.draw();
  }

  update() {
    // Check the keys every frame. We only remember the choice here;
    // the snake actually turns on its next step in moveSnake().
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

  moveSnake() {
    this.direction = this.nextDirection;

    // Work out where the new head goes: one square in the current direction.
    const head = this.snake[0];
    const newHead = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y,
    };

    // For now, going off one edge brings you back on the opposite edge.
    // (In part 3 we'll make hitting a wall end the game instead.)
    newHead.x = (newHead.x + COLS) % COLS;
    newHead.y = (newHead.y + ROWS) % ROWS;

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
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: COLS * CELL,
  height: ROWS * CELL,
  backgroundColor: '#222222',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: MainScene
});
