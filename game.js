// A "scene" is one screen of the game. Phaser calls create() once at the start
// and update() about 60 times per second.
class MainScene extends Phaser.Scene {
  create() {
    this.add.text(400, 260, 'Snake', { fontSize: '64px', color: '#7CFC00' }).setOrigin(0.5);
    this.add.text(400, 340, 'Setup works! Coming soon...', { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
  }

  update() {
    // Game logic goes here in step 2.
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#222222',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: MainScene
});
