// =====================================================================
//  SOUND
//  All the sound effects and the music are made right here in code with
//  the browser's built-in synthesizer (Web Audio), so there are no sound
//  files to download.
//
//    1. SETTINGS     volumes, and the music's notes
//    2. THE SYNTH    small helpers that play a beep or a noise
//    3. EFFECTS      one recipe per sound (eat, crash, ...)
//    4. MUSIC        a looping jungle beat
//    5. ON / OFF     the switches, remembered in the browser
//
//  game.js uses it like this:  Sound.play('eat')  (or Sound.play('combo', 3))
// =====================================================================


// =====================================================================
//  1. SETTINGS
// =====================================================================

const SOUND_VOLUME = 0.5;   // sound effects (0 to 1)
const MUSIC_VOLUME = 0.18;  // music, kept quieter so the effects stand out
const MUSIC_TEMPO = 112;    // beats per minute

// The music: 32 eighth notes (4 bars), looping.
// Each number is a note (0 = A, 3 = C, 5 = D, 7 = E, 10 = G, 12 = high A);
// null means rest. Bass plays under the melody.
const MELODY = [12, null, 10, 7, null, 7, 10, null, 12, null, 15, 12, 10, null, 7, null,
                5, null, 7, 10, null, 10, 7, null, 5, null, 3, 5, 7, null, null, null];
const BASS = [0, null, 0, null, 7, null, 0, null, -2, null, -2, null, 5, null, 3, null];


// =====================================================================
//  2. THE SYNTH
// =====================================================================

let audio = null;   // the browser's sound engine, made on first use
let sfxOut, musicOut;

// Browsers only allow sound after the player clicks, taps or presses a
// key, so this starts everything up on the first one.
function wakeAudio() {
  if (!audio) {
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return null;
    audio = new AudioEngine();
    sfxOut = audio.createGain();
    musicOut = audio.createGain();
    sfxOut.connect(audio.destination);
    musicOut.connect(audio.destination);
    applySwitches();
  }
  if (audio.state === 'suspended') audio.resume();
  if (musicOn()) startMusic();
  return audio;
}
['pointerdown', 'keydown', 'touchstart'].forEach(event => window.addEventListener(event, wakeAudio));

// A note: frequency in Hz (it can slide to another), how long, which wave
// shape ('sine' is soft, 'square' is beepy, 'sawtooth' is buzzy, 'triangle'
// is in between), how loud, and how long to wait before it starts.
function tone(freq, length, wave = 'square', volume = 0.3, slideTo = null, wait = 0, out = sfxOut) {
  const start = audio.currentTime + wait;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + length);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + length);
  osc.connect(gain).connect(out);
  osc.start(start);
  osc.stop(start + length + 0.05);
}

// A burst of hiss (crashes, smashes, drums). Lower "pitch" sounds deeper.
function noise(length, volume = 0.3, pitch = 2000, wait = 0, out = sfxOut) {
  const start = audio.currentTime + wait;
  const samples = Math.floor(audio.sampleRate * length);
  const buffer = audio.createBuffer(1, samples, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) data[i] = Math.random() * 2 - 1;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = pitch;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + length);
  source.connect(filter).connect(gain).connect(out);
  source.start(start);
}

// A run of notes, one after another.
function notes(freqs, each, wave, volume) {
  freqs.forEach((freq, i) => tone(freq, each * 1.4, wave, volume, null, i * each));
}


// =====================================================================
//  3. EFFECTS
//  To change how something sounds, change its recipe. To add a sound,
//  add a line here and call Sound.play('its name') from game.js.
// =====================================================================

const SOUNDS = {
  eat:     () => tone(520, 0.09, 'square', 0.15, 900),
  powerup: () => notes([523, 659, 784, 1047], 0.06, 'triangle', 0.25),
  powerdown: () => tone(620, 0.35, 'sawtooth', 0.15, 150),
  gulp:    () => { tone(320, 0.25, 'sine', 0.5, 70); tone(160, 0.3, 'triangle', 0.3, 60, 0.08); },
  smash:   () => { noise(0.25, 0.5, 900); tone(140, 0.15, 'square', 0.15, 60); },
  crash:   () => { noise(0.45, 0.6, 1400); tone(220, 0.4, 'sawtooth', 0.2, 50); },
  maze:    () => notes([523, 659, 784, 1047, 784, 1047, 1319], 0.08, 'square', 0.15),
  mazeAppears: () => notes([880, 1175, 1568], 0.12, 'sine', 0.25),
  gameOver: () => notes([392, 330, 262, 196], 0.18, 'triangle', 0.3),
  click:   () => tone(700, 0.04, 'square', 0.1),
  // A combo goes higher the bigger it gets (n is the combo number).
  combo:   n => notes([0, 4, 7].map(step => 523 * Math.pow(2, (step + Math.min(n, 10) * 2) / 12)), 0.05, 'square', 0.12),
  unlock:  () => notes([784, 988, 1175, 1568], 0.09, 'triangle', 0.3),
};


// =====================================================================
//  4. MUSIC
//  A little "scheduler": every 50 ms it lines up the next few notes so
//  they play exactly on the beat.
// =====================================================================

let musicTimer = null, musicStep = 0, nextNoteAt = 0;

function startMusic() {
  if (musicTimer || !audio) return;
  musicStep = 0;
  nextNoteAt = audio.currentTime + 0.1;
  musicTimer = setInterval(() => {
    const stepLength = 60 / MUSIC_TEMPO / 2; // eighth notes
    while (nextNoteAt < audio.currentTime + 0.2) {
      const wait = nextNoteAt - audio.currentTime;
      const note = n => 220 * Math.pow(2, n / 12); // note 0 = A (220 Hz)
      const melody = MELODY[musicStep % MELODY.length];
      if (melody !== null) tone(note(melody), stepLength * 0.9, 'triangle', 0.5, null, wait, musicOut);
      const bass = BASS[Math.floor(musicStep / 2) % BASS.length];
      if (musicStep % 2 === 0 && bass !== null) tone(note(bass) / 2, stepLength * 1.8, 'sine', 0.9, null, wait, musicOut);
      // Drums: a thump on the beat, a shaker in between.
      if (musicStep % 4 === 0) tone(110, 0.15, 'sine', 0.9, 40, wait, musicOut);
      else noise(0.05, 0.25, 6000, wait, musicOut);
      musicStep++;
      nextNoteAt += stepLength;
    }
  }, 50);
}

function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
}


// =====================================================================
//  5. ON / OFF
// =====================================================================

function soundOn() { try { return localStorage.getItem('snakeSound') !== 'off'; } catch (e) { return true; } }
function musicOn() { try { return localStorage.getItem('snakeMusic') !== 'off'; } catch (e) { return true; } }

function applySwitches() {
  if (!audio) return;
  sfxOut.gain.value = soundOn() ? SOUND_VOLUME : 0;
  musicOut.gain.value = musicOn() ? MUSIC_VOLUME : 0;
  if (musicOn()) startMusic(); else stopMusic();
}

function setSwitch(name, on) {
  try { localStorage.setItem(name, on ? 'on' : 'off'); } catch (e) { }
  wakeAudio();
  applySwitches();
}


// =====================================================================
//  The parts game.js uses.
// =====================================================================

const Sound = {
  play(name, value) {
    if (!audio || !soundOn() || !SOUNDS[name]) return;
    try { SOUNDS[name](value); } catch (e) { }
  },
  soundOn, musicOn,
  toggleSound: () => setSwitch('snakeSound', !soundOn()),
  toggleMusic: () => setSwitch('snakeMusic', !musicOn()),
};
