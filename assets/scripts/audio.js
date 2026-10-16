// audio.js - all sound effects, synthesised with Web Audio (no files, no music). Press M to mute.
let actx = null, master = null, noiseBuf = null, muted = false;
const lastPlayed = {};

function audioUnlock() {
  if (!actx) {
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain(); master.gain.value = 0.5; master.connect(actx.destination);
      noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (err) { return; }
  }
  if (actx.state === 'suspended') actx.resume();
}

function tone(f0, f1, dur, type, vol, delay) {
  if (!actx) return;
  const t = actx.currentTime + (delay || 0), o = actx.createOscillator(), g = actx.createGain();
  o.type = type || 'square';
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, vol, f0, f1, type, delay) {
  if (!actx) return;
  const t = actx.currentTime + (delay || 0), s = actx.createBufferSource(), fl = actx.createBiquadFilter(), g = actx.createGain();
  s.buffer = noiseBuf; fl.type = type || 'lowpass';
  fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(fl).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.02);
}

// name: [minimum seconds between plays, function]
const SFX = {
  shoot:      [0.03, () => { tone(900, 180, 0.12, 'square', 0.12); noise(0.06, 0.1, 4000, 800, 'highpass'); }],
  enemyShoot: [0.06, () => tone(480, 120, 0.14, 'sawtooth', 0.05)],
  hit:        [0.04, () => { noise(0.07, 0.12, 2500, 400); tone(220, 90, 0.07, 'square', 0.08); }],
  crit:       [0.04, () => { tone(1200, 2200, 0.12, 'triangle', 0.14); noise(0.09, 0.14, 3000, 500); }],
  wall:       [0.06, () => noise(0.05, 0.05, 5000, 1500, 'highpass')],
  death:      [0.05, () => { noise(0.3, 0.22, 1500, 150); tone(300, 60, 0.3, 'sawtooth', 0.12); }],
  hurt:       [0.14, () => { tone(160, 70, 0.2, 'sawtooth', 0.22); noise(0.12, 0.15, 900, 200); }],
  explosion:  [0.05, () => { noise(0.55, 0.4, 1400, 70); tone(95, 35, 0.45, 'sine', 0.35); }],
  reload:     [0.1,  () => { tone(320, 200, 0.07, 'square', 0.08); tone(200, 320, 0.07, 'square', 0.08, 0.12); }],
  reloaded:   [0.1,  () => { tone(500, 800, 0.06, 'square', 0.09); tone(800, 1000, 0.08, 'square', 0.09, 0.07); }],
  ping:       [0.3,  () => tone(1200, 900, 0.5, 'sine', 0.08)],
  alarm:      [0.3,  () => { tone(700, 700, 0.1, 'square', 0.08); tone(500, 500, 0.1, 'square', 0.08, 0.12); }],
  wave:       [0.3,  () => { tone(300, 300, 0.15, 'square', 0.1); tone(400, 400, 0.15, 'square', 0.1, 0.15); tone(600, 600, 0.3, 'square', 0.1, 0.3); }],
  clear:      [0.3,  () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.12, i * 0.09)); }],
  cardOpen:   [0.2,  () => { tone(600, 1200, 0.3, 'sine', 0.12); tone(900, 1800, 0.3, 'sine', 0.1, 0.08); }],
  cardPick:   [0.2,  () => { tone(660, 660, 0.12, 'triangle', 0.14); tone(990, 990, 0.25, 'triangle', 0.14, 0.1); }],
  flip:       [0.1,  () => { noise(0.14, 0.1, 800, 3000, 'bandpass'); tone(500, 900, 0.1, 'sine', 0.05); }],
  tick:       [0.04, () => tone(800, 800, 0.03, 'sine', 0.05)],
  ui:         [0.05, () => tone(500, 750, 0.06, 'square', 0.07)],
  shrine:     [0.3,  () => { tone(400, 1000, 0.4, 'sine', 0.14); tone(600, 1500, 0.4, 'sine', 0.1, 0.1); }],
  gameover:   [1,    () => { tone(300, 40, 1, 'sawtooth', 0.28); noise(0.9, 0.2, 800, 60); }],
  ready:      [0.5,  () => { tone(880, 880, 0.12, 'sine', 0.13); tone(1320, 1320, 0.25, 'sine', 0.13, 0.1); }],
  // Time stop: charge-up zap -> glass shatter -> release
  halt:       [0.5,  () => { tone(120, 1500, 0.85, 'sawtooth', 0.1); tone(60, 400, 0.85, 'sine', 0.2); noise(0.3, 0.2, 3000, 8000, 'highpass'); }],
  shatter:    [0.5,  () => {
    noise(0.7, 0.35, 3000, 9000, 'highpass'); tone(130, 40, 0.5, 'sine', 0.4);
    for (let i = 0; i < 8; i++) tone(2000 + Math.random() * 3500, 1500, 0.15, 'sine', 0.06, Math.random() * 0.3);
  }],
  resume:     [0.5,  () => { tone(1200, 200, 0.5, 'triangle', 0.12); noise(0.45, 0.14, 300, 4000, 'bandpass'); }],
};

function sfx(name) {
  const s = SFX[name];
  if (!s || !actx) return;
  const now = performance.now();
  if (now - (lastPlayed[name] || 0) < s[0] * 1000) return;
  lastPlayed[name] = now;
  s[1]();
}

window.addEventListener('pointerdown', audioUnlock);
window.addEventListener('keydown', e => {
  audioUnlock();
  if (e.key.toLowerCase() === 'm' && !e.repeat && master) { muted = !muted; master.gain.value = muted ? 0 : 0.5; }
});
document.addEventListener('mouseover', e => { if (e.target.closest && e.target.closest('.btn')) sfx('tick'); });
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.btn')) sfx('ui'); });