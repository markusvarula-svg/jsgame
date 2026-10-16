// Cheat controls are deliberately isolated from the normal game input path.
let cheatReturnState = 'play';

function initCheats() {
  const select = el('cheat-card-select');
  for (const card of CARDS) {
    const option = document.createElement('option');
    option.value = card.id;
    option.textContent = card.name;
    select.appendChild(option);
  }

  const raritySelect = el('cheat-rarity-select');
  for (const key of Object.keys(CARD_RARITY)) {
    if (key === 'legendary') continue;
    const option = document.createElement('option');
    option.value = key;
    option.textContent = CARD_RARITY[key].label;
    raritySelect.appendChild(option);
  }

  el('cheat-close').addEventListener('click', closeCheatPanel);
  el('cheat-skip-wave').addEventListener('click', cheatSkipWave);
  el('cheat-card-pull').addEventListener('click', cheatGrantCardPull);
  el('cheat-grant-card').addEventListener('click', cheatGrantSelectedCard);
  el('cheat-kill-enemies').addEventListener('click', cheatKillEnemies);
  el('cheat-heal').addEventListener('click', cheatHeal);
}

function toggleCheatPanel() {
  sfx('ui');
  if (state === 'cheats') {
    closeCheatPanel();
    return;
  }
  if (!['menu', 'play', 'cards', 'over'].includes(state)) return;

  cheatReturnState = state;
  state = 'cheats';
  mouseDown = false;
  keys = {};
  el('cheat-panel').style.display = 'flex';
}

function closeCheatPanel() {
  el('cheat-panel').style.display = 'none';
  state = cheatReturnState;
}

function cheatSkipWave() {
  eBullets = [];
  if (waveMode === 'active') {
    enemies = [];
    toSpawn = 0;
    waveCleared();
  } else {
    intermission = 0;
    startWave();
  }
  showBanner('WAVE SKIPPED', 1.5);
}

function cheatGrantCardPull() {
  cardProgress += cardCost;
  updateHUD();
  showBanner('CARD PULL GRANTED', 1.5);
}

function cheatGrantSelectedCard() {
  const cardId = el('cheat-card-select').value;
  const rarity = cardId === 'time-stop' ? 'legendary' : el('cheat-rarity-select').value;
  if (!grantCard(cardId, rarity)) return;
  showBanner('CARD GRANTED: ' + CARDS.find(card => card.id === cardId).name, 1.5);
}

function cheatKillEnemies() {
  for (const enemy of enemies) enemy.hp = 0;
  toSpawn = 0;
  eBullets = [];
  showBanner('ALL ENEMIES CLEARED', 1.5);
}

function cheatHeal() {
  player.hp = player.maxHp;
  if (cheatReturnState === 'over') {
    cheatReturnState = 'play';
    el('game-over').style.display = 'none';
  }
  updateHUD();
  showBanner('FULLY HEALED', 1.5);
}