// ----- Settings -----
// The board is a grid of squares. Changing these numbers changes the board size.
const CELL = 20;        // size of one square, in pixels
const COLS = 40;        // squares across  (40 * 20 = 800 pixels wide)
const ROWS = 30;        // squares down    (30 * 20 = 600 pixels tall)
const MOVE_EVERY = 120; // milliseconds between snake steps (smaller = faster)

// A "scene" is one screen of the game. Phaser calls create() once at the start
// and update() about 60 times per second.
class MainScene extends Phaser.Scene {
  create() {
    // The snake is a list of grid positions. Item 0 is the head.
    // It starts 3 squares long in the middle of the board, facing right.
    this.snake = [
      { x: 20, y: 15 },
      { x: 19, y: 15 },
      { x: 18, y: 15 },
    ];
    this.direction = { x: 1, y: 0 };     // the way the snake is moving now
    this.nextDirection = { x: 1, y: 0 }; // the way the player last pressed

    // A Graphics object is like a blank canvas we can draw shapes on.
    this.graphics = this.add.graphics();

    // Listen for the arrow keys.
    this.cursors = this.input.keyboard.createCursorKeys();

    // Run moveSnake() over and over on a timer, instead of every frame,
    // so the snake moves one square at a time.
    this.time.addEvent({ delay: MOVE_EVERY, loop: true, callback: this.moveSnake, callbackScope: this });

    // A hint at the top of the screen.
    this.add.text(COLS * CELL / 2, 10, 'Use the arrow keys to steer', { fontSize: '18px', color: '#aaaaaa' }).setOrigin(0.5, 0);

    this.draw();
  }

  update() {
    // Check the keys every frame. We only remember the choice here;
    // the snake actually turns on its next step in moveSnake().
    // The second check stops the snake turning straight back into itself.
    if (this.cursors.left.isDown && this.direction.x !== 1) this.nextDirection = { x: -1, y: 0 };
    if (this.cursors.right.isDown && this.direction.x !== -1) this.nextDirection = { x: 1, y: 0 };
    if (this.cursors.up.isDown && this.direction.y !== 1) this.nextDirection = { x: 0, y: -1 };
    if (this.cursors.down.isDown && this.direction.y !== -1) this.nextDirection = { x: 0, y: 1 };
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
    this.snake.pop();

    this.draw();
  }

  draw() {
    this.graphics.clear();

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
