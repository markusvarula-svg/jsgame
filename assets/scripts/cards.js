// ════════════════════════════════════════════════════════════════════════════
//  cards.js - points, upgrade cards and the card picker
//
//  The weapon formulas that USE these cards are in weapon.js. A card only needs
//  to be counted (player.cards[id]); onPick is for one-time effects.
// ════════════════════════════════════════════════════════════════════════════

const CARDS = [
  { id: 'explosion', name: 'EXPLOSION',
    desc: 'Bullets explode on impact. With Pierce or Bounce, every pierce and every bounce explodes too. More copies mean a bigger blast.' },
  { id: 'burst', name: 'BURST',
    desc: 'Each trigger pull fires 1 more shot in a row. Every shot includes your whole spread.' },
  { id: 'spread', name: 'SPREAD',
    desc: 'Each shot fires 1 extra bullet in a fan, like a shotgun.' },
  { id: 'speed', name: 'BULLET SPEED',
    desc: 'Bullets fly ' + PER_CARD.speed * 100 + '% faster.' },
  { id: 'bounce', name: 'BOUNCE',
    desc: 'Bullets bounce off walls 1 more time.' },
  { id: 'pierce', name: 'PIERCE',
    desc: 'Bullets pass through 1 more enemy.' },
  { id: 'reload', name: 'RELOAD SPEED',
    desc: 'Reloading takes ' + PER_CARD.reload * 100 + '% less time.' },
  { id: 'ammo', name: 'AMMO CAPACITY',
    desc: 'The magazine holds ' + PER_CARD.magazine + ' more bullets.',
    onPick: b => { player.gun.ammo += Math.round(PER_CARD.magazine * b); } },
  { id: 'damage', name: 'DAMAGE',
    desc: 'Bullets deal ' + PER_CARD.damage * 100 + '% more damage.' },
  { id: 'rate', name: 'FIRE RATE',
    desc: 'You shoot ' + PER_CARD.rate * 100 + '% faster.' },
  { id: 'health', name: 'TOUGH HIDE',
    desc: 'Max health +' + PER_CARD.health + ' and heal ' + PER_CARD.health + '.',
    onPick: b => { const h = Math.round(PER_CARD.health * b); player.maxHp += h; player.hp += h; } },
  { id: 'move', name: 'SWIFT FEET',
    desc: 'You walk ' + PER_CARD.move * 100 + '% faster.' },
  { id: 'crit', name: 'CRITICAL STRIKES',
    desc: 'Shots have a ' + (PER_CARD.crit * 100) + '% chance to deal double damage.' },
  { id: 'homing', name: 'HOMING ROUNDS',
    desc: 'Bullets curve toward nearby enemies and track them more reliably.' },
  { id: 'siphon', name: 'LIFE SIPHON',
    desc: 'Killing enemies restores ' + PER_CARD.siphon + ' health.' },
  { id: 'stun', name: 'STUN SHOT',
    desc: 'Hits briefly slow enemies, making them easier to kite and punish.' },
  { id: 'time-stop', name: 'TIME STOP', rarity: 'legendary',
    desc: 'Builds a chrono bar. When full, press Space to freeze time for a short window and shatter the screen in blue glass.',
    onPick: () => { timeStopCharge = 0; } },
];

// Card back (the card's own border is the outer frame). Built from the card's inside size so nothing is stretched.
// Card is 250 x 340 with a 2px border, so the inside is 246 x 336 (keep in sync with .card in style.css).
// Even 26px margins: a square in each corner, lines joining the squares' inner corners into a rectangle,
// and a perfect cube (a square turned 45 degrees) centred in it. Drawn in the rarity colour (--rc / --rgb).
function buildCardBack(w, h) {
  const m = 26, s = 28, r = w - m - s, d = h - m - s;       // margin, square size, right x, bottom y
  const cx = w / 2, cy = h / 2, q = 38;                      // q = distance from the centre to each cube tip
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
    '<rect x="' + m + '" y="' + m + '" width="' + s + '" height="' + s + '"/>' +
    '<rect x="' + r + '" y="' + m + '" width="' + s + '" height="' + s + '"/>' +
    '<rect x="' + m + '" y="' + d + '" width="' + s + '" height="' + s + '"/>' +
    '<rect x="' + r + '" y="' + d + '" width="' + s + '" height="' + s + '"/>' +
    '<path d="M' + (m + s) + ' ' + (m + s) + ' H' + r + ' M' + (m + s) + ' ' + d + ' H' + r +
      ' M' + (m + s) + ' ' + (m + s) + ' V' + d + ' M' + r + ' ' + (m + s) + ' V' + d + '"/>' +
    '<path d="M' + cx + ' ' + (cy - q) + ' L' + (cx + q) + ' ' + cy + ' L' + cx + ' ' + (cy + q) + ' L' + (cx - q) + ' ' + cy + ' Z"/>' +
    '</svg>';
}
const CARD_BACK_SVG = buildCardBack(246, 336);

// Cards that give whole numbers (extra bullets, bounces...) gain the rounded bonus: 1, 1, 2, 2
const INTEGER_CARDS = ['burst', 'spread', 'bounce', 'pierce'];

// Roll one rarity from the weights. Legendary only when allowed (Time Stop not owned yet).
function rollRarity(allowLegendary) {
  const keys = Object.keys(CARD_RARITY).filter(r => allowLegendary || r !== 'legendary');
  let roll = Math.random() * keys.reduce((sum, r) => sum + CARD_RARITY[r].weight, 0);
  for (const r of keys) { roll -= CARD_RARITY[r].weight; if (roll <= 0) return r; }
  return keys[0];
}

function rarityBadge(rarity) {
  return '<span class="card-rarity card-rarity-' + rarity + '">' + CARD_RARITY[rarity].label + '</span>';
}

function bonusText(card, rarity) {
  const b = CARD_RARITY[rarity].bonus;
  if (card.id === 'time-stop') return 'LEGENDARY';
  return INTEGER_CARDS.includes(card.id) ? 'POWER +' + Math.round(b) : 'POWER x' + b.toFixed(2);
}


// ── POINTS ────────────────────────────────────────────────────────────────

function addPoints(n) {
  score += n;
  cardProgress += n;
}

function nextCardCost(cardsAlreadyTaken) {
  return CARD_COST_START + CARD_COST_STEP * cardsAlreadyTaken;
}


// ── CARD PICKER ───────────────────────────────────────────────────────────

function openCards() {
  sfx('cardOpen');
  state = 'cards';                 // this stops update(), so the game is frozen
  mouseDown = false;

  // Each of the 3 slots rolls a rarity. A legendary roll is Time Stop; every other card can be any rarity.
  offered = [];
  const normal = CARDS.filter(card => card.id !== 'time-stop');
  while (offered.length < 3) {
    const timeStopAllowed = !player.cards['time-stop'] && !offered.some(o => o.card.id === 'time-stop');
    const rarity = rollRarity(timeStopAllowed);
    let card;
    if (rarity === 'legendary') card = CARDS.find(c => c.id === 'time-stop');
    else {
      const left = normal.filter(c => !offered.some(o => o.card.id === c.id));
      card = left[rand(left.length)];
    }
    offered.push({ card: card, rarity: rarity });
  }

  const box = el('card-choices');
  box.innerHTML = '';
  offered.forEach((pick, i) => {
    const card = pick.card;
    const owned = player.cards[card.id] || 0;
    const button = document.createElement('button');
    const r = CARD_RARITY[pick.rarity];
    button.className = 'card';
    button.style.cssText = '--rc:' + r.color + ';--rgb:' + r.rgb + ';--glow:' + r.glow + ';--ga:' + r.glowAlpha;
    button.innerHTML =
      '<span class="card-flip">' +
        '<span class="card-face card-back">' + CARD_BACK_SVG + '</span>' +
        '<span class="card-face card-front">' +
          '<span class="card-key">' + (i + 1) + '</span>' +
          '<span class="card-name">' + card.name + '</span>' +
          rarityBadge(pick.rarity) +
          '<span class="card-bonus">' + bonusText(card, pick.rarity) + '</span>' +
          '<span class="card-desc">' + card.desc + '</span>' +
          '<span class="card-owned">' + (owned > 0 ? 'OWNED: ' + owned : 'NEW') + '</span>' +
        '</span>' +
      '</span>';
    button.addEventListener('mouseenter', () => {                // hovering flips the card, and it stays flipped
      if (matchMedia('(hover: none)').matches || button.classList.contains('flipped')) return;
      button.classList.add('flipped');
      sfx('flip');
    });
    button.addEventListener('click', () => revealOrPick(i));
    box.appendChild(button);
  });
  el('card-screen').style.display = 'flex';
}

// You must see a card before taking it. Mouse: hovering flips it for good, then click picks.
// Touch screens and the 1-2-3 keys: the first press flips the card, the second press picks it.
function revealOrPick(i) {
  const button = el('card-choices').children[i];
  if (!button) return;
  if (!button.classList.contains('flipped')) { button.classList.add('flipped'); sfx('flip'); return; }
  pickCard(i);
}

function pickCard(i) {
  const pick = offered[i];
  if (!pick || state !== 'cards') return;
  const card = pick.card;

  grantCard(card.id, pick.rarity);
  sfx('cardPick');
  cardProgress -= cardCost;
  cardsTaken++;
  cardCost = nextCardCost(cardsTaken);

  el('card-screen').style.display = 'none';
  state = 'play';                  // unfreeze
  showBanner('UPGRADE TAKEN: ' + CARD_RARITY[pick.rarity].label + ' ' + card.name, 1.5);
  updateHUD();
}

function grantCard(id, rarity) {
  const card = CARDS.find(item => item.id === id);
  if (!card) return false;

  rarity = rarity || (id === 'time-stop' ? 'legendary' : 'common');
  const bonus = CARD_RARITY[rarity].bonus;
  const gain = INTEGER_CARDS.includes(id) ? Math.round(bonus) : bonus;

  player.cards[id] = id === 'time-stop' ? 1 : (player.cards[id] || 0) + 1;
  player.cardPower[id] = (player.cardPower[id] || 0) + gain;
  if (card.onPick) card.onPick(bonus);
  updateOwned();
  updateHUD();
  return true;
}