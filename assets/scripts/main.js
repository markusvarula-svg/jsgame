// ════════════════════════════════════════════════════════════════════════════
//  main.js - start-up, input, game loop, camera, game over
// ════════════════════════════════════════════════════════════════════════════

function init() {
  canvas = el('c');
  ctx    = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (typeof isCheatShortcut === 'function' && isCheatShortcut(e) && !e.repeat) {
      e.preventDefault();
      toggleCheatPanel();
      return;
    }
    if (k === ' ' && !e.repeat) {
      e.preventDefault();
      activateTimeStop();
      return;
    }
    if (state === 'shop' && k === 'escape') {
      closeShop();
      return;
    }
    keys[k] = true;
    if (state === 'cards' && (k === '1' || k === '2' || k === '3')) revealOrPick(Number(k) - 1);
    else if (state === 'over' && k === 'enter') restartGame();
    else if (state === 'menu' && k === 'enter') startGame();
  });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', e => { if (e.button === 0) mouseDown = true; });
  window.addEventListener('mouseup',   e => { if (e.button === 0) mouseDown = false; });

  el('start-btn').addEventListener('click', startGame);
  el('restart-btn').addEventListener('click', restartGame);
  el('menu-btn').addEventListener('click', showMenu);
  el('shop-open-start').addEventListener('click', openShop);
  el('shop-open-over').addEventListener('click', openShop);
  initShop();
  initRunRecords();
  if (typeof initCheats === 'function') initCheats();

  setupGame();
  requestAnimationFrame(loop);
}

function isCheatShortcut(event) {
  return event.code === 'Backslash' || event.key === '\\' || event.key === '|';
}

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function startGame() {
  el('start-screen').style.display = 'none';
  beginRun();
}

function beginRun() {
  setupGame();
  state = 'play';
  freeCardPullsRemaining = shopLevel('startingPulls');
  if (freeCardPullsRemaining > 0) openCards();
}

function restartGame() {
  beginRun();
}

function showMenu() {
  el('game-over').style.display = 'none';
  el('start-screen').style.display = 'flex';
  state = 'menu';
  loadRunRecords();
}


function setupGame() {
  kills = 0; score = 0;
  cardProgress = 0; cardCost = CARD_COST_START; cardsTaken = 0; paidCardsTaken = 0;
  freeCardPullsRemaining = 0;
  wave = 0; waveMode = 'intermission'; toSpawn = 0; intermission = 1.5;
  mouseDown = false; keys = {};
  bullets = []; eBullets = []; enemies = []; particles = [];
  timeStopCharge = 0; timeStopPhase = 'ready'; timeStopTimer = 0; timeStopWindup = 0;
  cheatsUsed = false;

  el('game-over').style.display   = 'none';
  el('card-screen').style.display = 'none';

  buildWorld();

  const maxHp = PLAYER_MAX_HP + META_BONUS.health * shopLevel('health');
  player = {
    x: 2.5 * TILE, y: 2.5 * TILE, vx: 0, vy: 0, angle: 0,
    hp: maxHp, maxHp, size: PLAYER_SIZE,
    cards: {},
    cardPower: {},
    gun: {
      fireTimer: 0, shotsLeft: 0, shotTimer: 0,
    },
  };

  const viewWidth = canvas.width / CAMERA_ZOOM;
  const viewHeight = canvas.height / CAMERA_ZOOM;
  camX = Math.max(0, Math.min(W - viewWidth, player.x - viewWidth / 2));
  camY = Math.max(0, Math.min(H - viewHeight, player.y - viewHeight / 2));

  updateOwned();
  updateLegend();
  showBanner('GET READY', 1.5);
  updateHUD();
}


function loop(ts) {
  const dt = Math.min((ts - last) / 1000, 0.05);
  last = ts;

  if (state === 'play') update(dt);
  updateBanner(dt);
  render();
  requestAnimationFrame(loop);
}

function activateTimeStop() {
  if (!player || !player.cards['time-stop']) return;
  if (timeStopPhase !== 'ready' || timeStopCharge < TIME_STOP.maxCharge) return;
  timeStopPhase = 'windup';
  timeStopWindup = TIME_STOP.windup;
  buildHaltMesh();
  sfx('halt');
  timeStopTimer = TIME_STOP.duration;
  timeStopCharge = 0;
  showBanner('CHRONO BREAK', 1.2);
}

function update(dt) {
  if (timeStopPhase === 'windup') {
    timeStopWindup -= dt;
    if (timeStopWindup <= 0) {
      timeStopPhase = 'paused';
      sfx('shatter');
      timeStopTimer = TIME_STOP.duration;
    }
  } else if (timeStopPhase === 'paused') {
    timeStopTimer -= dt;
    if (timeStopTimer <= 0) {
      timeStopPhase = 'ready';
      timeStopTimer = 0;
      sfx('resume');
    }
  }

  if (timeStopPhase !== 'ready') {
    updateFrozenWorld(dt);
    return;
  }

  if (player.cards['time-stop']) {
    const wasFull = timeStopCharge >= TIME_STOP.maxCharge;
    timeStopCharge = Math.min(TIME_STOP.maxCharge, timeStopCharge + dt / TIME_STOP.chargeSeconds);
    if (!wasFull && timeStopCharge >= TIME_STOP.maxCharge) sfx('ready');
  }

  updatePlayer(dt);
  updateShrines();
  updateEnemies(dt);
  updateBullets(dt);
  updateParticles(dt);
  updateWave(dt);
  updateCamera();
  updateHUD();

  if (state === 'play' && cardProgress >= cardCost) openCards();
}

function updateFrozenWorld(dt) {
  let scale = 0;
  if (timeStopPhase === 'windup') {
    const left = clamp(timeStopWindup / TIME_STOP.windup, 0, 1);
    scale = left * left;
  }
  const worldDt = dt * scale;

  updatePlayer(dt);
  updateShrines();
  if (worldDt > 0) { updateEnemies(worldDt); updateWave(worldDt); } else removeDeadEnemies();
  updateBullets(dt, worldDt);
  updateParticles(dt);
  updateCamera();
  updateHUD();
}

function updatePlayer(dt) {
  let dx = 0, dy = 0;
  if (keys['w'] || keys['arrowup'])    dy -= 1;
  if (keys['s'] || keys['arrowdown'])  dy += 1;
  if (keys['a'] || keys['arrowleft'])  dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;

  if (dx && dy) {
    dx *= diagonalMoveFactor;
    dy *= diagonalMoveFactor;
  }

  const speed = PLAYER_SPEED * (1 + PER_CARD.move * cardPower('move'));
  player.vx = dx * speed;
  player.vy = dy * speed;
  moveEntity(player, PLAYER_SIZE, dt);

  const mouseWorldX = mouse.x / CAMERA_ZOOM + camX;
  const mouseWorldY = mouse.y / CAMERA_ZOOM + camY;
  player.angle = Math.atan2(mouseWorldY - player.y, mouseWorldX - player.x);
  updateWeapon(dt);
}

function updateShrines() {
  for (const shrine of shrines) {
    if (!shrine.active || player.hp >= player.maxHp) continue;
    if (Math.hypot(player.x - shrine.x, player.y - shrine.y) > PLAYER_SIZE + 14) continue;

    const restored = Math.min(SHRINE_HEAL, player.maxHp - player.hp);
    player.hp += restored;
    shrine.active = false;
    sfx('shrine');
    showBanner('SHRINE USED  |  HEALTH +' + restored, 1.8);
    break;
  }
}

function updateCamera() {
  const viewWidth = canvas.width / CAMERA_ZOOM;
  const viewHeight = canvas.height / CAMERA_ZOOM;
  const cameraFollow = 0.12;

  let targetX = player.x - viewWidth / 2;
  let targetY = player.y - viewHeight / 2;
  targetX = clamp(targetX, 0, W - viewWidth);
  targetY = clamp(targetY, 0, H - viewHeight);

  camX += (targetX - camX) * cameraFollow;
  camY += (targetY - camY) * cameraFollow;
}


function endGame() {
  if (state === 'over') return;
  state = 'over';
  mouseDown = false;
  player.hp = 0;
  const salvageEarned = cheatsUsed ? 0 : Math.max(10, Math.floor(score / 5) + wave * 5);
  if (!cheatsUsed) {
    metaProgress.credits += salvageEarned;
    saveMetaProgress();
    updateShop();
    saveRunRecord({ score, wave, kills, cardsTaken, endedAt: Date.now() });
  }
  sfx('gameover');
  el('final-wave').textContent  = 'WAVE REACHED: ' + wave;
  el('final-kills').textContent = 'KILLS: ' + kills;
  el('final-score').textContent = 'SCORE: ' + score + ' | UPGRADES: ' + cardsTaken;
  el('final-salvage').textContent = cheatsUsed
    ? 'CHEATS USED: NO SCRAP, RUN NOT RECORDED'
    : 'SCRAP EARNED: +' + salvageEarned + ' | BANK: ' + metaProgress.credits;
  el('game-over').style.display = 'flex';
}

window.onload = init;