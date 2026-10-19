// ════════════════════════════════════════════════════════════════════════════
//  weapon.js - the player's one pistol and everything the cards do to it
//
//  Rule of thumb for every stat below:  final value = base value, changed by
//  (card amount) x (number of copies of that card you own).
// ════════════════════════════════════════════════════════════════════════════

// How many copies of a card the player owns (0 if none)
function cardCount(id) { return player.cards[id] || 0; }

// Total strength of the copies you own: each copy adds the bonus of the rarity it was taken at
function cardPower(id) { return (player.cardPower && player.cardPower[id]) || 0; }


// ── WEAPON STATS (all plain arithmetic) ───────────────────────────────────

// Damage card: +20% of base per copy.   25 -> 30 -> 35 -> 40 ...
function bulletDamage() {
  return BASE_WEAPON.damage * (1 + META_BONUS.damage * shopLevel('damage')) *
    (1 + PER_CARD.damage * cardPower('damage'));
}

// Bullet Speed card: +25% of base per copy.
function bulletSpeed() {
  return BASE_WEAPON.bulletSpeed * (1 + PER_CARD.speed * cardPower('speed'));
}

// Ammo Capacity card: +4 bullets per copy.   8 -> 12 -> 16 ...
function magazineSize() {
  return Math.round(BASE_WEAPON.magazine + PER_CARD.magazine * cardPower('ammo'));
}

// Reload Speed card: -15% of base time per copy, but never below the minimum.
function reloadTime() {
  const time = BASE_WEAPON.reload * (1 - PER_CARD.reload * cardPower('reload'));
  return Math.max(MIN_RELOAD, time);
}

// Fire Rate card: -15% of base delay per copy, but never below the minimum.
function fireDelay() {
  const delay = BASE_WEAPON.fireDelay * (1 - PER_CARD.rate * cardPower('rate'));
  return Math.max(MIN_FIRE_DELAY, delay);
}

// Burst card: each copy adds one more shot to every trigger pull.
function shotsPerTrigger() { return 1 + cardPower('burst'); }

// Spread card: each copy adds one more bullet to every shot, fired as a fan.
function bulletsPerShot() { return 1 + cardPower('spread'); }

function critChance() {
  return Math.min(0.9, PER_CARD.crit * cardPower('crit'));
}

function homingStrength() {
  return PER_CARD.homing * cardPower('homing');
}

function stunDuration() {
  return PER_CARD.stun * cardPower('stun');
}

// Bounce and Pierce cards: one wall bounce / one enemy pass-through per copy.
function bounceCount() { return cardPower('bounce'); }
function pierceCount() { return cardPower('pierce'); }

// Explosion card: 0 copies = no explosion. 1 copy = base radius, then +25 per extra copy.
function explosionRadius() {
  const power = cardPower('explosion');
  if (power === 0) return 0;
  return EXPLOSION.baseRadius + EXPLOSION.radiusPerExtra * (power - 1);
}

// Angle offsets for a fan of N bullets, centred on the aim direction.
// Example: 3 bullets with gap 0.14 gives -0.14, 0, +0.14 (radians).
function fanAngles(count, gap) {
  const angles = [];
  for (let i = 0; i < count; i++) angles.push((i - (count - 1) / 2) * gap);
  return angles;
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}


// ── FIRING ────────────────────────────────────────────────────────────────
// One trigger pull uses 1 ammo and fires shotsPerTrigger() shots, BURST_GAP apart.
// Every shot fires bulletsPerShot() bullets in a fan.

function updateWeapon(dt) {
  const gun = player.gun;

  // Reloading
  if (gun.reloading) {
    gun.reloadTimer -= dt;
    if (gun.reloadTimer <= 0) { gun.ammo = magazineSize(); gun.reloading = false; sfx('reloaded'); }
  }

  // Remaining shots of a burst
  if (gun.shotsLeft > 0) {
    gun.shotTimer -= dt;
    if (gun.shotTimer <= 0) {
      fireShot();
      gun.shotsLeft--;
      gun.shotTimer = BURST_GAP;
    }
  }

  // Pulling the trigger
  if (mouseDown && !gun.reloading && gun.fireTimer <= 0 && gun.shotsLeft === 0) {
    if (gun.ammo > 0) {
      fireShot();
      gun.ammo--;
      gun.shotsLeft = shotsPerTrigger() - 1;
      gun.shotTimer = BURST_GAP;
      gun.fireTimer = fireDelay() + (shotsPerTrigger() - 1) * BURST_GAP;   // wait for the burst to finish
      if (gun.ammo <= 0) startReload();
    } else {
      startReload();
    }
  }
  if (gun.fireTimer > 0) gun.fireTimer -= dt;

  // Manual reload
  if (keys['r'] && !gun.reloading && gun.ammo < magazineSize()) startReload();
}

function startReload() {
  sfx('reload');
  player.gun.reloading   = true;
  player.gun.reloadTimer = reloadTime();
}

function fireShot() {
  sfx('shoot');
  const offsets = fanAngles(bulletsPerShot(), PER_CARD.spreadGap);
  const muzzleX = player.x + Math.cos(player.angle) * player.size * 1.3;
  const muzzleY = player.y + Math.sin(player.angle) * player.size * 1.3;

  for (const offset of offsets) {
    const angle = player.angle + offset;
    bullets.push({
      x: muzzleX, y: muzzleY,
      vx: Math.cos(angle) * bulletSpeed(),
      vy: Math.sin(angle) * bulletSpeed(),
      damage: bulletDamage(),
      bouncesLeft: bounceCount(),
      piercesLeft: pierceCount(),
      blastRadius: explosionRadius(),     // 0 = this bullet does not explode
      hit: new Set(),                     // enemies already pierced (so one enemy is hit once)
      life: 2.5,
    });
  }
}


// ── BULLETS ───────────────────────────────────────────────────────────────

// enemyDt lets time stop slow or freeze enemy bullets while the player's own bullets keep full speed
function updateBullets(dt, enemyDt = dt) {
  for (const b of bullets) {
    // Move in small steps so fast bullets cannot jump through a thin triangle tip
    const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 8));
    for (let s = 0; s < steps && !b.dead; s++) stepPlayerBullet(b, dt / steps);
    b.life -= dt;
    if (b.life <= 0) b.dead = true;
  }
  for (const b of eBullets) {
    if (enemyDt <= 0) break;                       // time stop: enemy bullets hang in place
    const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * enemyDt / 8));
    for (let s = 0; s < steps && !b.dead; s++) stepEnemyBullet(b, enemyDt / steps);
    b.life -= enemyDt;
    if (b.life <= 0) b.dead = true;
  }
  bullets  = bullets.filter(b => !b.dead);
  eBullets = eBullets.filter(b => !b.dead);
}

function stepPlayerBullet(b, dt) {
  const homingPower = homingStrength();
  if (homingPower > 0) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const d = Math.hypot(e.x - b.x, e.y - b.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = e;
      }
    }

    if (nearest) {
      const desiredAngle = Math.atan2(nearest.y - b.y, nearest.x - b.x);
      const currentAngle = Math.atan2(b.vy, b.vx);
      const turnStep = normalizeAngle(desiredAngle - currentAngle);
      const maxTurn = homingPower * 2.5 * dt;
      const nextAngle = currentAngle + Math.max(-maxTurn, Math.min(maxTurn, turnStep));
      const speed = Math.hypot(b.vx, b.vy);
      b.vx = Math.cos(nextAngle) * speed;
      b.vy = Math.sin(nextAngle) * speed;
    }
  }

  b.x += b.vx * dt;
  b.y += b.vy * dt;

  // Hit a wall
  const wall = circleHit(b.x, b.y, BULLET_RADIUS);
  if (wall) {
    if (b.blastRadius > 0) explode(b.x, b.y, b.blastRadius, b.damage);   // explodes on every bounce too
    sfx('wall');
    spawnBurst(b.x, b.y, '#d8c060', 3, 160, 0.15);

    if (b.bouncesLeft > 0) {
      // Mirror the velocity around the wall's surface direction
      const into = b.vx * wall.nx + b.vy * wall.ny;
      if (into < 0) { b.vx -= 2 * into * wall.nx; b.vy -= 2 * into * wall.ny; }
      b.x += wall.nx * (wall.depth + 0.5);
      b.y += wall.ny * (wall.depth + 0.5);
      b.bouncesLeft--;
    } else {
      b.dead = true;
    }
    return;
  }

  // Hit an enemy
  for (const e of enemies) {
    if (e.hp <= 0 || b.hit.has(e)) continue;
    if (Math.hypot(b.x - e.x, b.y - e.y) >= e.size + BULLET_RADIUS) continue;

    const critRoll = Math.random();
    const criticalHit = critRoll < critChance();
    const damage = criticalHit ? b.damage * 2 : b.damage;
    if (b.blastRadius > 0) explode(b.x, b.y, b.blastRadius, b.damage);   // explodes on every pierce too
    else                   e.hp -= damage;
    sfx(criticalHit ? 'crit' : 'hit');
    if (criticalHit) spawnBurst(e.x, e.y, '#ffe77a', 4, 180, 0.35);
    else spawnBurst(e.x, e.y, '#c02020', 3, 160, 0.3);

    if (stunDuration() > 0) e.slowTimer = Math.max(e.slowTimer, stunDuration());

    if (b.piercesLeft > 0) { b.piercesLeft--; b.hit.add(e); }
    else                   { b.dead = true; return; }
  }
}

function lifeSiphonHeal() {
  return PER_CARD.siphon * cardPower('siphon');
}

function damagePlayer(amount) {
  const reduction = Math.min(0.8,
    META_BONUS.damageReduction * shopLevel('armor') +
    PER_CARD.damageReduction * cardPower('damage-reduction'));
  player.hp -= amount * (1 - reduction);
  if (player.hp <= 0) endGame();
}

// Blast damage = bullet damage at the centre, shrinking linearly to the edge value.
// The explosion never hurts the player.
function radialDamageFalloff(distance, radius, maxDamage, minimumShare) {
  if (radius <= 0) return 0;
  const distanceRatio = clamp(distance / radius, 0, 1);
  const edgeFactor = 1 - (1 - minimumShare) * distanceRatio;
  return maxDamage * edgeFactor;
}

function explosionDamage(distance, radius, bulletDmg) {
  const centreDamage = bulletDmg * EXPLOSION.damageShare;
  return radialDamageFalloff(distance, radius, centreDamage, EXPLOSION.edgeShare);
}

function explode(x, y, radius, bulletDmg) {
  sfx('explosion');
  for (const e of enemies) {
    const distance = Math.hypot(e.x - x, e.y - y);
    if (distance < radius) e.hp -= explosionDamage(distance, radius, bulletDmg);
  }
  spawnBurst(x, y, '#e07830', 10, 300, 0.5);
  particles.push({ x, y, vx: 0, vy: 0, life: 0.3, maxLife: 0.3, ring: true, radius, color: '#e8a050' });
}

function stepEnemyBullet(b, dt) {
  b.x += b.vx * dt;
  b.y += b.vy * dt;

  if (circleHit(b.x, b.y, BULLET_RADIUS)) {
    if (b.blastRadius > 0) explodeEnemyBullet(b);
    spawnBurst(b.x, b.y, '#d8c060', 3, 160, 0.15);
    b.dead = true;
    return;
  }
  if (Math.hypot(b.x - player.x, b.y - player.y) < PLAYER_SIZE + BULLET_RADIUS) {
    if (b.blastRadius > 0) explodeEnemyBullet(b);
    else damagePlayer(b.damage);
    sfx('hurt');
    spawnBurst(player.x, player.y, '#c02020', 3, 160, 0.3);
    b.dead = true;
  }
}

function explodeEnemyBullet(b) {
  sfx('explosion');
  const distance = Math.hypot(player.x - b.x, player.y - b.y);
  if (distance < b.blastRadius) {
    const damageTaken = radialDamageFalloff(distance, b.blastRadius, b.damage, 0.5);
    damagePlayer(damageTaken);
  }
  spawnBurst(b.x, b.y, '#e07830', 10, 300, 0.5);
  particles.push({
    x: b.x, y: b.y, vx: 0, vy: 0, life: 0.3, maxLife: 0.3,
    ring: true, radius: b.blastRadius, color: '#e8a050',
  });
}