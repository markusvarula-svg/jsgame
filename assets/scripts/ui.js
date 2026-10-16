// ════════════════════════════════════════════════════════════════════════════
//  ui.js - HUD text and bars, banner messages, legend, owned cards list
// ════════════════════════════════════════════════════════════════════════════

function updateHUD() {
  el('health-bar').style.width  = Math.max(0, player.hp / player.maxHp * 100) + '%';
  el('health-text').textContent = Math.ceil(Math.max(0, player.hp)) + ' / ' + player.maxHp;
  el('card-bar').style.width    = Math.min(100, cardProgress / cardCost * 100) + '%';
  el('card-text').textContent   = cardProgress + ' / ' + cardCost;

  const hasTimeStop = !!(player && player.cards && player.cards['time-stop']);
  const timeStopRow = el('time-stop-row');
  if (timeStopRow) {
    timeStopRow.style.display = hasTimeStop ? 'block' : 'none';
    if (hasTimeStop) {
      let fill = 0;
      let label = '0%';
      if (timeStopPhase === 'windup') {
        fill = (TIME_STOP.duration + timeStopWindup) / (TIME_STOP.windup + TIME_STOP.duration) * 100;
        label = 'WIND UP';
      } else if (timeStopPhase === 'paused') {
        fill = Math.max(0, timeStopTimer / (TIME_STOP.windup + TIME_STOP.duration) * 100);
        label = 'ACTIVE ' + Math.ceil(Math.max(0, timeStopTimer)) + 's';
      } else {
        fill = timeStopCharge / TIME_STOP.maxCharge * 100;
        label = timeStopCharge >= TIME_STOP.maxCharge ? 'READY' : Math.max(0, Math.round(fill)) + '%';
      }
      el('time-stop-bar').style.width = Math.min(100, fill) + '%';
      el('time-stop-text').textContent = label;
    }
  }

  el('wave-text').textContent = 'WAVE ' + wave;
  el('enemy-text').textContent = waveMode === 'active'
    ? 'ENEMIES LEFT: ' + (enemies.length + toSpawn)
    : 'NEXT WAVE IN ' + Math.ceil(Math.max(0, intermission));
  el('score-text').textContent = 'SCORE: ' + score + ' | KILLS: ' + kills;

  el('weapon-name').textContent  = 'PISTOL';
  el('ammo-display').textContent = player.gun.ammo + ' / ' + magazineSize();
  el('reload-msg').style.display = player.gun.reloading ? 'block' : 'none';
}

// List of cards the player owns, with how many copies
function updateOwned() {
  const lines = CARDS
    .filter(c => player.cards[c.id])
    .map(c => c.name + ' x' + player.cards[c.id]);
  el('owned-cards').innerHTML = lines.length ? 'UPGRADES<br>' + lines.join('<br>') : '';
}

// Enemy types the player has met so far, drawn in their own colour
function updateLegend() {
  el('legend').innerHTML = Object.keys(ENEMY_TYPES)
    .filter(k => ENEMY_TYPES[k].from <= wave)
    .map(k => '<div style="color:' + ENEMY_TYPES[k].color + '">' + ENEMY_TYPES[k].info + '</div>')
    .join('');
}

function showBanner(text, seconds) {
  const b = el('banner');
  b.textContent = text;
  b.style.display = 'block';
  bannerTimer = seconds;
}

function updateBanner(dt) {
  if (bannerTimer <= 0) return;
  bannerTimer -= dt;
  if (bannerTimer <= 0) el('banner').style.display = 'none';
}