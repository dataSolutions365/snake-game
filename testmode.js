// =====================================================================
//  TEST MODE (for the owner)
//  Sign in on stats.html with the owner's Google account and press
//  "Play in test mode". Then, on this device:
//    - every skin is unlocked, and items never run out
//    - in a game, 🧪 (or the T key) drops any power-up in front of you
//    - on the start screen, you can see the daily prize box for any day
//  and nothing counts:
//    - no leaderboard, no best scores, no rewards progress, no stats
//    - no online games
//  Tap "🧪 TEST MODE" on the start screen to leave it.
//
//  Test mode can only take things away (scores, online), so it doesn't
//  matter that it's switched on in the browser: there's nothing to cheat.
// =====================================================================

const TEST_ITEMS = 99; // how many of each item it looks like you have

function testModeOn() {
  try { return localStorage.getItem('snakeTestMode') === '1'; } catch (e) { return false; }
}

window.TestMode = {
  on: testModeOn,
  start() { try { localStorage.setItem('snakeTestMode', '1'); } catch (e) { } },
  stop() {
    try { localStorage.removeItem('snakeTestMode'); localStorage.removeItem('snakeTestSkin'); } catch (e) { }
    location.reload();
  },
};

// Swap out the parts of rewards.js, stats.js, leaderboard.js, online.js
// and save.js that would count anything or let you play online.
if (testModeOn()) {
  Object.assign(Rewards, {
    isUnlocked: () => true,
    has: () => true,
    level: () => ({ level: Rewards.LEVELS.length, max: true, gamesLeft: 0, nextSays: '' }),
    // The skin worn in test mode is kept apart, so leaving test mode
    // puts back the one you really have.
    skin() { try { return localStorage.getItem('snakeTestSkin') || 'classic'; } catch (e) { return 'classic'; } },
    setSkin(key) { try { localStorage.setItem('snakeTestSkin', key); } catch (e) { } },
    items: () => Object.fromEntries(Object.keys(Rewards.ITEMS).map(key => [key, TEST_ITEMS])),
    useItem: () => true,
    checkLogin: () => null,
    startGame: () => [],
    endGame() { },
    note: () => [],
  });
  Stats.countGame = () => {};
  Stats.countRoom = () => {};
  Leaderboard.makesTheBoard = () => Promise.resolve(false);
  Online.available = () => false;
  SaveCode.available = () => false;
}
