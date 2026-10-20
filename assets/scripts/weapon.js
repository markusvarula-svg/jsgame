// ════════════════════════════════════════════════════════════════════════════
//  weapon.js - the player's one pistol and everything the cards do to it
// ════════════════════════════════════════════════════════════════════════════

function cardCount(id) { return player.cards[id] || 0; }

function cardPower(id) { return (player.cardPower && player.cardPower[id]) || 0; }


function bulletDamage() {
  return BASE_WEAPON.damage * (1 + META_BONUS.damage * shopLevel('damage')) *
    (1 + PER_CARD.damage * cardPower('damage'));
}

function bulletSpeed() {
  return BASE_WEAPON.bulletSpeed * (1 + PER_CARD.speed * cardPower('speed'));
}

function fireDelay() {
  const delay = BASE_WEAPON.fireDelay * (1 - PER_CARD.rate * cardPower('rate'));
  return Math.max(MIN_FIRE_DELAY, delay);
}

function shotsPerTrigger() { return 1 + cardPower('burst'); }

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

function bounceCount() { return cardPower('bounce'); }
function pierceCount() { return cardPower('pierce'); }

function explosionRadius() {
  const power = cardPower('explosion');
  if (power === 0) return 0;
  return EXPLOSION.baseRadius + EXPLOSION.radiusPerExtra * (power - 1);
}

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


function updateWeapon(dt) {
  const gun = player.gun;

  if (gun.shotsLeft > 0) {
    gun.shotTimer -= dt;
    if (gun.shotTimer <= 0) {
      fireShot();
      gun.shotsLeft--;
      gun.shotTimer = BURST_GAP;
    }
  }

  if (mouseDown && gun.fireTimer <= 0 && gun.shotsLeft === 0) {
    fireShot();
    gun.shotsLeft = shotsPerTrigger() - 1;
    gun.shotTimer = BURST_GAP;
    gun.fireTimer = fireDelay() + (shotsPerTrigger() - 1) * BURST_GAP;
  }
  if (gun.fireTimer > 0) gun.fireTimer -= dt;
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
      blastRadius: explosionRadius(),
      hit: new Set(),
      life: 2.5,
    });
  }
}


function updateBullets(dt, enemyDt = dt) {
  for (const b of bullets) {
    const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 8));
    for (let s = 0; s < steps && !b.dead; s++) stepPlayerBullet(b, dt / steps);
    b.life -= dt;
    if (b.life <= 0) b.dead = true;
  }
  for (const b of eBullets) {
    if (enemyDt <= 0) break;
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

  const wall = circleHit(b.x, b.y, BULLET_RADIUS);
  if (wall) {
    if (b.blastRadius > 0) explode(b.x, b.y, b.blastRadius, b.damage);
    sfx('wall');
    spawnBurst(b.x, b.y, '#d8c060', 3, 160, 0.15);

    if (b.bouncesLeft > 0) {
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

  for (const e of enemies) {
    if (e.hp <= 0 || b.hit.has(e)) continue;
    if (Math.hypot(b.x - e.x, b.y - e.y) >= e.size + BULLET_RADIUS) continue;

    const critRoll = Math.random();
    const criticalHit = critRoll < critChance();
    const damage = criticalHit ? b.damage * 2 : b.damage;
    if (b.blastRadius > 0) explode(b.x, b.y, b.blastRadius, b.damage);
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