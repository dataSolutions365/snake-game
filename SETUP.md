# Step 1: Setup guide (Windows)

## 1. Create the GitHub repo (2 minutes)
1. Go to https://github.com/new
2. Repository name: `snake-game`
3. Choose **Public** (free GitHub Pages hosting needs a public repo on a free account).
4. Tick **Add a README file**, then click **Create repository**.
5. Tell Claude in the thread that it's created. Claude will add the starter files.

## 2. Install your tools
- **VS Code** (code editor): https://code.visualstudio.com/ — install with the default options.
- **Git for Windows** (lets you download and upload your code): https://git-scm.com/download/win — default options are fine.
- In VS Code, open the Extensions panel (Ctrl+Shift+X) and install **Live Server**. It lets you run the game in your browser and refreshes it every time you save.

## 3. Turn on GitHub Pages (after Claude adds the files)
1. In your repo on GitHub, open **Settings → Pages**.
2. Under "Build and deployment", set Source to **Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
3. After about a minute, your game is live at `https://<your-username>.github.io/snake-game/`. That's the link to share.

## 4. Get the code onto your PC
1. In VS Code, press Ctrl+Shift+P, type **Git: Clone**, and paste your repo's URL (`https://github.com/<your-username>/snake-game`).
2. Pick a folder, then click **Open** when it asks.
3. Right-click `index.html` and choose **Open with Live Server**. You should see "Snake — Setup works!"

## What the files are
- `index.html` — the web page. It loads Phaser (the game framework) and your game code.
- `game.js` — your game. This is where we'll write Snake in step 2.

## Taking the game down for maintenance
1. On GitHub, open `index.html` and click the pencil icon to edit.
2. Near the top, change `const MAINTENANCE_MODE = false;` to `true`.
3. Click **Commit changes**. Within a minute or two, visitors see the "Be right back!" page (`maintenance.html`).
4. To bring the game back, change it to `false` and commit again.

To change the message players see, edit the text in `maintenance.html`.

## Installing the game as an app (works offline)
The game can be installed like an app, with its own icon, and solo games work without internet. Online play, the leaderboard and cloud saves still need internet.
- **Computer (Chrome or Edge):** open the game, then click the install icon at the right end of the address bar (a small screen with a down arrow), or open the ⋮ menu and choose **Cast, save and share → Install page as app**. Click **Install**.
- **iPhone or iPad (Safari):** tap the Share button, then **Add to Home Screen**, then **Add**.
- **Android (Chrome):** tap the ⋮ menu, then **Add to Home screen** (or **Install app**), then **Install**.
- Open the game once while online after installing, so it saves everything it needs.

How it works: `manifest.webmanifest` gives the app its name and icons (in `icons/`), and `sw.js` saves copies of the game files. When online, the app always loads the newest files from the website first, so updates show up as usual. Nothing in `sw.js` needs changing when you update the game.
