// =====================================================================
//  ONLINE PLAY: private rooms and chat
//  This file talks to Firebase's Realtime Database. game.js uses it
//  through the `Online` object at the bottom.
//
//    1. SETTINGS
//    2. CHAT FILTER     hides bad words and links
//    3. CONNECTING      starting Firebase
//    4. ROOMS           create, join, leave, start a game
//    5. DURING A GAME   sending moves and the game state back and forth
//    6. CHAT            sending and showing messages
//    7. SCREENS         the HTML menus drawn on top of the game
//
//  HOW A ROOM WORKS
//  One person creates a room and becomes the "host". Their browser runs
//  the real game: it moves every snake and sends the result to everyone
//  else about 8 times a second. Everyone else just sends which way they
//  want to turn, and draws whatever the host sends back.
//
//  In the database, a room looks like this:
//    rooms/ABCDE/
//      host:     the host's player id
//      status:   'lobby', 'playing' or 'over'
//      players/  { id: { name, color } } for everyone in the room
//      inputs/   { id: "x,y" } the way each player last asked to turn
//      state/    the snakes and food, written by the host every step
//      result/   who won, written by the host at the end
//      chat/     the messages
// =====================================================================


// =====================================================================
//  1. SETTINGS
// =====================================================================

const MAX_PLAYERS = 4;
const CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O or 1/I/L, they look alike
const QUICK_CHAT = ['Good game!', 'Rematch?', 'Nice move!', 'Oops!', 'Hi!', 'Ready!', '😂', '😎', '👍', '🐍'];
const MAX_CHAT_LENGTH = 80;
// Typed chat: false means players can only use the QUICK_CHAT buttons above.
// Change it to true to bring back the box for typing your own messages.
const TYPED_CHAT = false;

// Each browser tab gets its own random id for the session.
const MY_ID = 'p' + Math.random().toString(36).slice(2, 10);


// =====================================================================
//  2. CHAT FILTER
//  Replaces bad words with *** and removes links. No filter catches
//  everything, which is why chat only happens in private rooms.
// =====================================================================

const BAD_WORDS = [
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'asshole', 'bastard', 'damn',
  'crap', 'piss', 'slut', 'whore', 'fag', 'faggot', 'nigger', 'nigga', 'retard', 'twat',
  'wanker', 'bollocks', 'prick', 'douche', 'jackass', 'motherfucker', 'dumbass', 'boob',
  'penis', 'vagina', 'sex', 'porn', 'nude', 'naked', 'kill yourself', 'kys',
];

function cleanText(text) {
  let clean = String(text).slice(0, MAX_CHAT_LENGTH);
  // Remove anything that looks like a link.
  clean = clean.replace(/(https?:\/\/|www\.)\S+/gi, '[link removed]');
  clean = clean.replace(/\b\S+\.(com|net|org|io|gg|co|ly|me|tv|xyz)\b\S*/gi, '[link removed]');
  // Check each word with common tricks undone (sh1t, f.u.c.k, fuuuck).
  BAD_WORDS.forEach(word => {
    const letters = word.split('').map(ch => {
      const lookalikes = { a: 'a4@', e: 'e3', i: 'i1!|', o: 'o0', s: 's5$', t: 't7', g: 'g9', l: 'l1|' }[ch];
      return (lookalikes ? '[' + lookalikes.replace(/[|$!@]/g, '\\$&') + ']' : ch) + '+';
    });
    const pattern = new RegExp(letters.join('[\\s._\\-*]*'), 'gi');
    clean = clean.replace(pattern, '***');
  });
  return clean.trim();
}


// =====================================================================
//  3. CONNECTING
// =====================================================================

let db = null;

function onlineAvailable() {
  return typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG !== null && typeof firebase !== 'undefined';
}

function connect() {
  if (db) return db;
  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG); // the leaderboard may have started it already
  db = firebase.database();
  return db;
}


// =====================================================================
//  4. ROOMS
// =====================================================================

// Everything about the room this tab is in. null when not in a room.
let session = null;

function makeCode() {
  let code = '';
  for (let i = 0; i < 5; i++) code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)];
  return code;
}

async function createRoom(name, color) {
  connect();
  const code = makeCode();
  const room = db.ref('rooms/' + code);
  await room.set({
    host: MY_ID,
    status: 'lobby',
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    players: { [MY_ID]: { name, color, joinedAt: firebase.database.ServerValue.TIMESTAMP } },
  });
  // If the host closes the tab, the whole room goes away.
  room.onDisconnect().remove();
  enterRoom(code, true);
}

async function joinRoom(code, name, color) {
  connect();
  const room = db.ref('rooms/' + code);
  const snap = await room.once('value');
  const data = snap.val();
  if (!data) throw new Error('No room with that code. Check it and try again.');
  if (data.status === 'playing') throw new Error('That room is in the middle of a game. Try again in a minute.');
  if (Object.keys(data.players || {}).length >= MAX_PLAYERS) throw new Error('That room is full (' + MAX_PLAYERS + ' players).');
  const me = room.child('players/' + MY_ID);
  await me.set({ name, color, joinedAt: firebase.database.ServerValue.TIMESTAMP });
  // If this tab closes, take this player out of the room.
  me.onDisconnect().remove();
  enterRoom(code, false);
}

// Start listening to a room we just created or joined.
function enterRoom(code, isHost) {
  const room = db.ref('rooms/' + code);
  session = { code, room, isHost, players: [], status: 'lobby', listeners: [] };

  const listen = (ref, event, fn) => { ref.on(event, fn); session.listeners.push(() => ref.off(event, fn)); };

  // The player list (in the order they joined).
  listen(room.child('players'), 'value', snap => {
    const players = snap.val() || {};
    session.players = Object.keys(players)
      .map(id => ({ id, ...players[id] }))
      .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
    Screens.showLobby();
  });

  // The room disappearing means the host left.
  listen(room.child('host'), 'value', snap => {
    if (session && !snap.exists()) {
      leaveRoom();
      Screens.showMessage('The host left, so the room closed.');
      Online.events.onRoomClosed();
    }
  });

  // Game starting and ending.
  listen(room.child('status'), 'value', snap => {
    const status = snap.val();
    if (!session || !status) return;
    const was = session.status;
    session.status = status;
    if (status === 'playing' && was !== 'playing') {
      Screens.hideMenus();
      Online.events.onGameStart(gameInfo());
    }
    if (status === 'over' && was === 'playing') {
      room.child('result').once('value', r => Online.events.onGameOver(r.val() || {}));
    }
    if (status === 'lobby' && was !== 'lobby') Screens.showLobby();
  });

  // Chat messages: the last 30, plus new ones as they arrive.
  listen(room.child('chat').limitToLast(30), 'child_added', snap => Screens.addChatMessage(snap.val()));

  Screens.showLobby();
}

function leaveRoom() {
  if (!session) return;
  session.listeners.forEach(stop => stop());
  if (session.isHost) {
    session.room.onDisconnect().cancel();
    session.room.remove();
  } else {
    const me = session.room.child('players/' + MY_ID);
    me.onDisconnect().cancel();
    me.remove();
  }
  session = null;
  Screens.clearChat();
}

// Two players picked the same color? The later one gets the next free color.
// Returns each player's color number, in the same order as the list.
function roomColors(players) {
  const used = [];
  return players.map(p => {
    let c = (p.color || 0) % PLAYER_COLORS.length;
    while (used.includes(c)) c = (c + 1) % PLAYER_COLORS.length;
    used.push(c);
    return c;
  });
}

// What the game needs to know to set itself up.
function gameInfo() {
  const colors = roomColors(session.players);
  return { myId: MY_ID, isHost: session.isHost, players: session.players.map((p, i) => ({ ...p, color: colors[i] })) };
}

// Host only: start a game with everyone in the room.
function startGame() {
  if (!session || !session.isHost || session.players.length < 2) return;
  session.room.update({ status: 'playing', inputs: null, state: null, result: null });
}

// Host only: the game ended. Everyone sees the result.
function endGame(result) {
  if (!session || !session.isHost) return;
  session.room.update({ result, status: 'over' });
}

// Everyone: go back to the room's lobby after a game.
function backToRoom() {
  if (!session) return;
  if (session.isHost) session.room.update({ status: 'lobby' });
  Screens.showLobby();
}


// =====================================================================
//  5. DURING A GAME
//  Snakes and food are sent as short text, like "3,4;3,5;3,6",
//  to keep each update small (see the 10 GB/month free limit).
// =====================================================================

const packSpots = spots => spots.map(s => s.x + ',' + s.y).join(';');
const unpackSpots = text => (text ? text.split(';').map(pair => {
  const [x, y] = pair.split(',').map(Number);
  return { x, y };
}) : []);

// Everyone except the host: tell the host which way to turn.
function sendTurn(x, y) {
  if (session) session.room.child('inputs/' + MY_ID).set(x + ',' + y);
}

// Host: hear everyone's turns.
function onTurns(callback) {
  const ref = session.room.child('inputs');
  const handler = snap => {
    const [x, y] = String(snap.val()).split(',').map(Number);
    callback(snap.key, x, y);
  };
  ref.on('child_added', handler);
  ref.on('child_changed', handler);
  session.listeners.push(() => { ref.off('child_added', handler); ref.off('child_changed', handler); });
  return () => { ref.off('child_added', handler); ref.off('child_changed', handler); };
}

// Host: send where everything is.
function sendState(state) {
  if (!session) return;
  session.room.child('state').set({
    players: state.players.map(p => ({ id: p.id, b: packSpots(p.body), s: p.score, x: p.crashed ? 1 : 0, u: p.until })),
    food: packSpots(state.foods),
    left: state.leftovers.map(l => l.x + ',' + l.y + ',' + l.color).join(';'),
    pu: state.powerUps.map(pu => pu.x + ',' + pu.y + ',' + pu.kind + ',' + pu.until).join(';'),
    pops: state.pops.map(pop => pop.x + ',' + pop.y + ',' + pop.kind).join(';'),
    c: state.clock,
  });
}

// Everyone except the host: hear where everything is.
function onState(callback) {
  const ref = session.room.child('state');
  const handler = snap => {
    const raw = snap.val();
    if (!raw) return;
    callback({
      players: (raw.players || []).map(p => ({ id: p.id, body: unpackSpots(p.b), score: p.s, crashed: !!p.x, until: p.u || {} })),
      foods: unpackSpots(raw.food),
      leftovers: raw.left ? raw.left.split(';').map(t => {
        const [x, y, color] = t.split(',').map(Number);
        return { x, y, color };
      }) : [],
      powerUps: raw.pu ? raw.pu.split(';').map(t => {
        const [x, y, kind, until] = t.split(',');
        return { x: Number(x), y: Number(y), kind, until: Number(until) };
      }) : [],
      pops: raw.pops ? raw.pops.split(';').map(t => {
        const [x, y, kind] = t.split(',');
        return { x: Number(x), y: Number(y), kind };
      }) : [],
      clock: raw.c || 0,
    });
  };
  ref.on('value', handler);
  return () => ref.off('value', handler);
}


// =====================================================================
//  6. CHAT
// =====================================================================

function sendChat(text) {
  if (!session) return;
  if (!TYPED_CHAT && !QUICK_CHAT.includes(text)) return;
  const clean = cleanText(text);
  if (!clean) return;
  const i = session.players.findIndex(p => p.id === MY_ID);
  session.room.child('chat').push({
    name: i >= 0 ? session.players[i].name : '?',
    color: i >= 0 ? roomColors(session.players)[i] : 0,
    text: clean,
    at: firebase.database.ServerValue.TIMESTAMP,
  });
}


// =====================================================================
//  7. SCREENS
//  The online menus are plain HTML on top of the game (see the
//  #online part of index.html), because typing a name or a code is
//  much easier in a real text box.
// =====================================================================

const Screens = {
  el: id => document.getElementById(id),

  show(panelId) {
    this.el('online').hidden = false;
    ['online-menu', 'online-lobby', 'online-message'].forEach(id => { this.el(id).hidden = id !== panelId; });
    // In the lobby, chat sits under the player list.
    const chat = this.el('chat-panel');
    this.el('online').append(chat);
    chat.classList.remove('floating');
    chat.hidden = panelId !== 'online-lobby';
    this.el('chat-toggle').hidden = true;
  },

  hideMenus() {
    this.el('online').hidden = true;
    // During a game, chat floats over the board, tucked away behind a button.
    const chat = this.el('chat-panel');
    document.body.append(chat);
    chat.classList.add('floating');
    chat.hidden = true;
    this.el('chat-toggle').hidden = false;
  },

  hideAll() {
    document.getElementById('online').hidden = true;
    this.el('chat-toggle').hidden = true;
    this.el('chat-panel').hidden = true;
  },

  showMenu(color, prefillCode) {
    this.color = color;
    this.show('online-menu');
    this.el('online-error').textContent = '';
    this.el('name-input').value = loadName();
    if (prefillCode) this.el('code-input').value = prefillCode;
  },

  showLobby() {
    if (!session) return;
    if (session.status === 'playing') return;
    this.show('online-lobby');
    this.el('room-code').textContent = session.code;
    const list = this.el('player-list');
    list.innerHTML = '';
    const colors = roomColors(session.players);
    session.players.forEach((p, i) => {
      const li = document.createElement('li');
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.style.background = '#' + PLAYER_COLORS[colors[i]].body.toString(16).padStart(6, '0');
      li.append(dot, document.createTextNode(p.name + (p.id === MY_ID ? ' (you)' : '')));
      list.append(li);
    });
    const enough = session.players.length >= 2;
    this.el('start-button').hidden = !session.isHost;
    this.el('start-button').disabled = !enough;
    this.el('lobby-hint').textContent = session.isHost
      ? (enough ? 'Everyone in? Press Start!' : 'Send the code to a friend so they can join.')
      : 'Waiting for the host to start...';
  },

  showMessage(text) {
    this.show('online-message');
    this.el('message-text').textContent = text;
  },

  addChatMessage(msg) {
    if (!msg) return;
    if (!TYPED_CHAT && !QUICK_CHAT.includes(msg.text)) return; // typed messages are switched off
    const line = document.createElement('div');
    const who = document.createElement('b');
    who.textContent = msg.name + ': ';
    who.style.color = '#' + PLAYER_COLORS[(msg.color || 0) % PLAYER_COLORS.length].head.toString(16).padStart(6, '0');
    line.append(who, document.createTextNode(msg.text));
    const log = this.el('chat-log');
    log.append(line);
    log.scrollTop = log.scrollHeight;
    Online.events.onChat(msg);
  },

  clearChat() {
    this.el('chat-log').innerHTML = '';
  },
};

function loadName() {
  try { return localStorage.getItem('snakeName') || ''; } catch (e) { return ''; }
}
function saveName(name) {
  try { localStorage.setItem('snakeName', name); } catch (e) { }
}

// Hook up the buttons in index.html once the page has loaded.
window.addEventListener('DOMContentLoaded', () => {
  const el = id => document.getElementById(id);

  // The quick-chat buttons.
  QUICK_CHAT.forEach(text => {
    const b = document.createElement('button');
    b.textContent = text;
    b.onclick = () => sendChat(text);
    el('quick-chat').append(b);
  });

  const readName = () => {
    const name = cleanText(el('name-input').value).replace(/\*/g, '').slice(0, 10).trim();
    if (!name) throw new Error('Type a name first (up to 10 letters).');
    saveName(name);
    return name;
  };
  const tryIt = async action => {
    el('online-error').textContent = '';
    try { await action(); } catch (e) { el('online-error').textContent = e.message; }
  };

  el('create-button').onclick = () => tryIt(() => createRoom(readName(), Screens.color));
  el('join-button').onclick = () => tryIt(() => {
    const code = el('code-input').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 5) throw new Error('Room codes are 5 letters and numbers.');
    return joinRoom(code, readName(), Screens.color);
  });
  el('menu-back-button').onclick = () => { Screens.hideAll(); Online.events.onExit(); };
  el('start-button').onclick = () => startGame();
  el('leave-button').onclick = () => { leaveRoom(); Screens.hideAll(); Online.events.onExit(); };
  el('message-ok-button').onclick = () => { Screens.hideAll(); Online.events.onExit(); };
  // Invite button: on phones (and some computers) this opens the share
  // menu, so you can pick Messages and text the link. Otherwise it copies
  // the link so you can paste it into a text or email.
  el('invite-button').onclick = async () => {
    const link = location.origin + location.pathname + '?room=' + session.code;
    const message = 'Come play Snake with me! Tap to join my room (code ' + session.code + '):';
    const button = el('invite-button');
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Snake', text: message, url: link });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return; // they closed the share menu
      }
    }
    navigator.clipboard.writeText(message + ' ' + link).then(
      () => { button.textContent = 'Link copied! Paste it in a text.'; },
      () => { button.textContent = link; });
    setTimeout(() => { button.textContent = 'Send invite'; }, 3000);
  };

  // Typing a chat message (hidden when TYPED_CHAT is false).
  document.querySelector('.chat-row').hidden = !TYPED_CHAT;
  const send = () => { sendChat(el('chat-input').value); el('chat-input').value = ''; };
  el('chat-send').onclick = send;
  el('chat-input').addEventListener('keydown', e => {
    e.stopPropagation(); // don't let typing steer the snake
    if (e.key === 'Enter') send();
  });
  el('chat-toggle').onclick = () => { el('chat-panel').hidden = !el('chat-panel').hidden; };
  // Keep keys pressed in the text boxes away from the game.
  ['name-input', 'code-input'].forEach(id => el(id).addEventListener('keydown', e => e.stopPropagation()));
});


// =====================================================================
//  The parts game.js uses.
// =====================================================================

const Online = {
  available: onlineAvailable,
  myId: MY_ID,
  showMenu: (color, code) => Screens.showMenu(color, code),
  hide: () => Screens.hideAll(),
  isHost: () => !!(session && session.isHost),
  inRoom: () => !!session,
  sendTurn, onTurns, sendState, onState, endGame, backToRoom,
  // game.js fills these in.
  events: {
    onGameStart: () => {}, onGameOver: () => {}, onRoomClosed: () => {}, onExit: () => {}, onChat: () => {},
  },
};
