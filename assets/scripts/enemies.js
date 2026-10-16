// ════════════════════════════════════════════════════════════════════════════
//  enemies.js - waves, enemy spawning, enemy AI and enemy shooting
// ════════════════════════════════════════════════════════════════════════════

// ── WAVES ─────────────────────────────────────────────────────────────────

function enemiesInWave(n)  { return WAVE.baseEnemies + WAVE.perWave * n; }
function maxAlive()        { return Math.min(WAVE.maxAliveBase + wave, WAVE.maxAliveCap); }

function startWave() {
  wave++;
  sfx('wave');
  waveMode   = 'active';
  toSpawn    = enemiesInWave(wave);
  spawnTimer = 0.5;

  let msg = 'WAVE ' + wave;
  for (const k in ENEMY_TYPES)
    if (ENEMY_TYPES[k].from === wave) msg += '  |  NEW ENEMY: ' + ENEMY_TYPES[k].info;
  showBanner(msg, 3.5);
  updateLegend();
}

function waveCleared() {
  const bonus = 20 + wave * 5;
  sfx('clear');
  addPoints(bonus);
  player.hp = Math.min(player.maxHp, player.hp + player.maxHp * WAVE.healShare);
  waveMode     = 'intermission';
  intermission = WAVE.breakTime;
  showBanner('WAVE ' + wave + ' CLEARED  |  BONUS +' + bonus + '  |  HEALTH RESTORED', 3);
}

function updateWave(dt) {
  if (waveMode === 'active') {
    if (toSpawn > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0 && enemies.length < maxAlive()) {
        if (spawnEnemy(pickEnemyType())) toSpawn--;
        spawnTimer = 0.8;
      }
    } else if (enemies.length === 0) {
      waveCleared();
    }
  } else {
    intermission -= dt;
    if (intermission <= 0) startWave();
  }
}

// Random type among those unlocked, more likely if the type has a higher weight
function pickEnemyType() {
  const unlocked = Object.keys(ENEMY_TYPES).filter(k => ENEMY_TYPES[k].from <= wave);
  let totalWeight = 0;
  for (const k of unlocked) totalWeight += ENEMY_TYPES[k].weight;

  let roll = Math.random() * totalWeight;
  for (const k of unlocked) {
    roll -= ENEMY_TYPES[k].weight;
    if (roll <= 0) return k;
  }
  return unlocked[0];
}

// Returns false if no good spot was found (the game simply tries again soon)
function waveMultiplier(growthPerWave, wavesPassed, cap = Infinity) {
  const scaled = 1 + growthPerWave * wavesPassed;
  return cap === Infinity ? scaled : Math.min(cap, scaled);
}

function spawnEnemy(type) {
  const cfg = ENEMY_TYPES[type];
  const wavesPassed = Math.max(0, wave - 1);

  // Enemies get stronger every wave.
  const hpScale = waveMultiplier(WAVE.hpGrowth, wavesPassed);
  const speedScale = waveMultiplier(WAVE.speedGrowth, wavesPassed, WAVE.speedCap);
  const damageScale = 1 + WAVE.damageGrowth * wavesPassed;
  const rateScale = waveMultiplier(WAVE.rateGrowth, wavesPassed, WAVE.rateCap);

  for (let tries = 0; tries < 200; tries++) {
    const tx = 1 + rand(COLS - 2), ty = 1 + rand(ROWS - 2);
    if (grid[ty][tx] !== 0) continue;                           // never on a triangle block
    const x = tx * TILE + TILE / 2, y = ty * TILE + TILE / 2;
    if (Math.hypot(x - player.x, y - player.y) < 260) continue; // not right next to the player
    if (circleHit(x, y, cfg.size + 4)) continue;                // not touching a wall

    enemies.push({
      x, y, vx: 0, vy: 0, angle: Math.random() * Math.PI * 2,
      type, size: cfg.size,
      hp: cfg.hp * hpScale, maxHp: cfg.hp * hpScale,
      speed: cfg.speed * speedScale, wanderSpeed: cfg.wanderSpeed * speedScale,
      damage: cfg.damage * damageScale,
      blastRadius: cfg.blastRadius
        ? Math.min(cfg.blastRadiusCap, cfg.blastRadius * (1 + cfg.blastRadiusGrowth * (wave - cfg.from)))
        : 0,
      rateScale,
      state: 'wander', alertTimer: 0,
      fireTimer: 1 + Math.random() * 2, burstLeft: 0, burstTimer: 0,
      wanderAngle: Math.random() * Math.PI * 2, wanderTimer: 1 + Math.random() * 2,
      dodgeVx: 0, dodgeVy: 0, dodgeTimer: 0,
      stuckTimer: 0.5, lastX: x, lastY: y,
      path: [], pathTimer: 0, pathTargetCol: -1, pathTargetRow: -1,
      speedBoost: 0, slowTimer: 0,
      pingCooldown: cfg.scanner ? 1 + rand(2) : 0,
      pingTimer: 0, pingRadius: 0, pingActive: false, pingAlerted: false,
    });
    return true;
  }
  return false;
}


// ── ENEMY SHOOTING ────────────────────────────────────────────────────────

// One enemy shot: cfg.bullets bullets in a fan (1 bullet = straight shot)
function enemyFire(e) {
  sfx('enemyShoot');
  const cfg = ENEMY_TYPES[e.type];
  if (cfg.turret) {
    for (let i = 0; i < 5; i++) {
      const angle = e.angle + (i + 0.5) * Math.PI * 2 / 5;
      eBullets.push({
        x: e.x + Math.cos(angle) * e.size,
        y: e.y + Math.sin(angle) * e.size,
        vx: Math.cos(angle) * cfg.bulletSpeed,
        vy: Math.sin(angle) * cfg.bulletSpeed,
        damage: e.damage,
        blastRadius: e.blastRadius,
        life: 2.5,
      });
    }
    return;
  }

  for (const offset of fanAngles(cfg.bullets, cfg.gap)) {
    const angle = e.angle + offset;
    eBullets.push({
      x: e.x + Math.cos(e.angle) * e.size * 1.3,
      y: e.y + Math.sin(e.angle) * e.size * 1.3,
      vx: Math.cos(angle) * cfg.bulletSpeed,
      vy: Math.sin(angle) * cfg.bulletSpeed,
      damage: e.damage,
      blastRadius: e.blastRadius,
      life: 2.5,
    });
  }
}

function updateEnemyShooting(e, dt) {
  const cfg = ENEMY_TYPES[e.type];
  e.fireTimer -= dt;

  if (e.burstLeft > 0) {
    e.burstTimer -= dt;
    if (e.burstTimer <= 0) { enemyFire(e); e.burstLeft--; e.burstTimer = 0.15; }
  }
  if (e.fireTimer <= 0 && e.burstLeft === 0) {
    enemyFire(e);
    e.burstLeft  = cfg.burst - 1;
    e.burstTimer = 0.15;
    e.fireTimer  = cfg.fireDelay / e.rateScale;
  }
}


// ── ENEMY AI ──────────────────────────────────────────────────────────────
// wander -> (sees player) alert for 1s -> chase and shoot

function updateEnemies(dt) {
  for (const e of enemies) {
    if (e.hp <= 0) continue;

    const cfg = ENEMY_TYPES[e.type];
    const dist = Math.hypot(player.x - e.x, player.y - e.y);
    e.slowTimer = Math.max(0, e.slowTimer - dt);
    e.speedBoost = Math.max(0, e.speedBoost - dt * 0.08);
    if (cfg.scanner) {
      updateScannerDrone(e, dt);
    } else if (cfg.turret) {
      e.angle += cfg.spinSpeed * dt;
      updateEnemyShooting(e, dt);
    } else {
      const canSee = lineOfSight(e.x, e.y, player.x, player.y);

      // Stuck detection: if barely moved for 0.45s, pick a new direction
      e.stuckTimer -= dt;
      if (e.stuckTimer <= 0) {
        if (Math.hypot(e.x - e.lastX, e.y - e.lastY) < 6 && e.state !== 'alert') {
          if (e.state === 'chase') {
            e.path = [];
            e.pathTimer = 0;
          } else {
            e.wanderAngle = Math.random() * Math.PI * 2;
            e.wanderTimer = 0.4;
          }
          e.dodgeVx = 0; e.dodgeVy = 0;
        }
        e.lastX = e.x; e.lastY = e.y; e.stuckTimer = 0.45;
      }

      if (e.state === 'wander')      updateWander(e, dt, dist, canSee);
      else if (e.state === 'alert')  updateAlert(e, dt);
      else                           updateChase(e, dt, dist, canSee);
    }

    // Touching an enemy hurts
    if (dist < PLAYER_SIZE + e.size) {
      sfx('hurt');
      player.hp -= e.damage * CONTACT_DPS_FACTOR * dt;
      if (player.hp <= 0) endGame();
    }
  }

  removeDeadEnemies();
}

function removeDeadEnemies() {
  // Remove dead enemies and award points
  enemies = enemies.filter(e => {
    if (e.hp > 0) return true;
    kills++;
    addPoints(ENEMY_TYPES[e.type].points);
    if (cardCount('siphon') > 0) {
      player.hp = Math.min(player.maxHp, player.hp + lifeSiphonHeal());
    }
    sfx('death');
    spawnBurst(e.x, e.y, ENEMY_TYPES[e.type].color, 10, 220, 0.6);
    return false;
  });
}

function updateScannerDrone(e, dt) {
  const cfg = ENEMY_TYPES[e.type];
  const speed = e.speed * (1 + e.speedBoost);
  let nextX = e.x + Math.cos(e.angle) * speed * dt;
  let nextY = e.y + Math.sin(e.angle) * speed * dt;
  if (nextX < e.size || nextX > W - e.size) e.angle = Math.PI - e.angle;
  if (nextY < e.size || nextY > H - e.size) e.angle = -e.angle;
  nextX = e.x + Math.cos(e.angle) * speed * dt;
  nextY = e.y + Math.sin(e.angle) * speed * dt;
  e.x = Math.max(e.size, Math.min(W - e.size, nextX));
  e.y = Math.max(e.size, Math.min(H - e.size, nextY));

  if (!e.pingActive) {
    e.pingCooldown -= dt;
    if (e.pingCooldown <= 0) {
      e.pingActive = true;
      e.pingTimer = cfg.pingDuration;
      e.pingRadius = 0;
      e.pingAlerted = false;
      sfx('ping');
      particles.push({
        x: e.x, y: e.y, vx: 0, vy: 0,
        life: cfg.pingDuration, maxLife: cfg.pingDuration,
        ring: true, radius: cfg.pingRange, color: cfg.line,
      });
    }
    return;
  }

  const previousRadius = e.pingRadius;
  e.pingRadius = Math.min(cfg.pingRange, e.pingRadius + cfg.pingRange * dt / cfg.pingDuration);
  const playerDistance = Math.hypot(player.x - e.x, player.y - e.y);
  if (!e.pingAlerted && playerDistance >= previousRadius && playerDistance <= e.pingRadius) {
    alertEnemiesFromScanner();
    e.pingAlerted = true;
  }

  e.pingTimer -= dt;
  if (e.pingTimer <= 0) {
    e.pingActive = false;
    e.pingCooldown = cfg.pingInterval;
  }
}

function alertEnemiesFromScanner() {
  sfx('alarm');
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    enemy.state = 'chase';
    enemy.alertTimer = 0;
    enemy.speedBoost = Math.max(enemy.speedBoost, 0.5);
    enemy.path = [];
    enemy.pathTimer = 0;
  }
}

function updateWander(e, dt, dist, canSee) {
  if (dist < DETECT_RANGE) {
    e.state = 'alert';
    e.alertTimer = canSee ? 1.0 : 0.35;
    return;
  }
  e.wanderTimer -= dt;
  if (e.wanderTimer <= 0) {
    e.wanderAngle = Math.random() * Math.PI * 2;
    e.wanderTimer = 1 + Math.random() * 2.5;
  }
  const heading = wallSteer(e, e.wanderAngle);
  const slowFactor = e.slowTimer > 0 ? 0.6 : 1;
  const speed = e.wanderSpeed * (1 + e.speedBoost) * slowFactor;
  e.vx = Math.cos(heading) * speed;
  e.vy = Math.sin(heading) * speed;
  moveEntity(e, e.size, dt);
  e.angle = heading;
}

function updateAlert(e, dt) {
  e.alertTimer -= dt;
  e.vx = 0; e.vy = 0;
  e.angle = Math.atan2(player.y - e.y, player.x - e.x);
  if (e.alertTimer <= 0) e.state = 'chase';
}

function updateChase(e, dt, dist, canSee) {
  const cfg = ENEMY_TYPES[e.type];
  e.angle = Math.atan2(player.y - e.y, player.x - e.x);

  updateDodge(e, dt);

  const directRoute = canSee && clearRouteForCircle(e.x, e.y, player.x, player.y, e.size);
  if (!directRoute) {
    e.pathTimer -= dt;
    const targetCol = Math.floor(player.x / TILE), targetRow = Math.floor(player.y / TILE);
    if (e.path.length === 0 || e.pathTimer <= 0 ||
        e.pathTargetCol !== targetCol || e.pathTargetRow !== targetRow) {
      e.path = findPath(e.x, e.y, player.x, player.y, e.size);
      e.pathTimer = 0.35;
      e.pathTargetCol = targetCol;
      e.pathTargetRow = targetRow;
    }
    while (e.path.length > 1 && Math.hypot(e.path[0].x - e.x, e.path[0].y - e.y) < TILE * 0.2)
      e.path.shift();
  } else {
    e.path = [];
    e.pathTimer = 0;
  }

  // Choose a direction: follow the path, or keep the preferred distance, or strafe
  let desired;
  if (!directRoute && e.path.length > 0) {
    desired = Math.atan2(e.path[0].y - e.y, e.path[0].x - e.x);
  } else if (dist > cfg.prefDist + 35) {
    desired = e.angle;                         // too far: move closer
  } else if (dist < cfg.prefDist - 35) {
    desired = e.angle + Math.PI;               // too close: back off
  } else {
    desired = e.angle + Math.PI / 2 * (Math.sin(Date.now() / 550 + e.x) > 0 ? 1 : -1);   // strafe
  }
  if (directRoute && (e.dodgeVx || e.dodgeVy)) desired = Math.atan2(e.dodgeVy, e.dodgeVx);

  const heading = !directRoute && e.path.length > 0 ? desired : wallSteer(e, desired);
  const slowFactor = e.slowTimer > 0 ? 0.6 : 1;
  const speed = e.speed * (1 + e.speedBoost) * slowFactor;
  e.vx = Math.cos(heading) * speed;
  e.vy = Math.sin(heading) * speed;
  moveEntity(e, e.size, dt);

  if (canSee) updateEnemyShooting(e, dt);
}

// Sidestep a player bullet that is flying towards the enemy
function updateDodge(e, dt) {
  e.dodgeTimer -= dt;
  if (e.dodgeTimer > 0) return;
  e.dodgeTimer = 0.3 + Math.random() * 0.5;

  let threat = null;
  for (const b of bullets) {
    const bx = b.x - e.x, by = b.y - e.y, d = Math.hypot(bx, by);
    const comingAtMe = (b.vx * bx + b.vy * by) / (d || 1) > 0;   // moving away from the enemy? dot > 0
    if (d < 140 && comingAtMe) { threat = b; break; }
  }
  if (threat) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const perpendicular = Math.atan2(threat.vy, threat.vx) + Math.PI / 2 * side;
    e.dodgeVx = Math.cos(perpendicular) * e.speed * 1.6;
    e.dodgeVy = Math.sin(perpendicular) * e.speed * 1.6;
  } else {
    e.dodgeVx = 0; e.dodgeVy = 0;
  }
}

// Wall avoidance: if the way ahead is blocked, try other directions
function wallSteer(e, desired) {
  const lookAhead = e.size * 3.8;
  if (!probeHit(e.x, e.y, desired, lookAhead, e.size)) return desired;
  const tryOffsets = [0.45, -0.45, 0.9, -0.9, 1.3, -1.3, Math.PI * 0.65, -Math.PI * 0.65, Math.PI];
  for (const o of tryOffsets)
    if (!probeHit(e.x, e.y, desired + o, lookAhead, e.size)) return desired + o;
  return desired + Math.PI;
}

function probeHit(x, y, angle, length, r) {
  for (let i = 1; i <= 5; i++) {
    const t = i / 5;
    if (collidesWalls(x + Math.cos(angle) * length * t, y + Math.sin(angle) * length * t, r)) return true;
  }
  return false;
}