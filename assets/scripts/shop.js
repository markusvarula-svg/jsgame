// ════════════════════════════════════════════════════════════════════════════
//  shop.js - persistent between-run currency and permanent upgrades
// ════════════════════════════════════════════════════════════════════════════

const META_PROGRESS_KEY = 'cube-wars-meta-progress';
const SHOP_UPGRADES = [
  {
    id: 'startingPulls', name: 'STARTING CARD PULLS', maxLevel: 3, baseCost: 120, costStep: 120,
    description: 'Choose free upgrade cards before each run begins.',
    effect: level => level + ' free card pull' + (level === 1 ? '' : 's') + ' per run',
  },
  {
    id: 'damage', name: 'WEAPON DAMAGE', maxLevel: 10, baseCost: 80, costStep: 80,
    description: 'Increase the damage of every bullet, including critical hits and explosions.',
    effect: level => '+' + Math.round(META_BONUS.damage * level * 100) + '% bullet damage',
  },
  {
    id: 'health', name: 'MAX HEALTH', maxLevel: 10, baseCost: 60, costStep: 60,
    description: 'Start every run with more health.',
    effect: level => '+' + META_BONUS.health * level + ' max health',
  },
  {
    id: 'armor', name: 'ARMOR', maxLevel: 8, baseCost: 100, costStep: 100,
    description: 'Reduce damage from enemy attacks and contact.',
    effect: level => Math.round(META_BONUS.damageReduction * level * 100) + '% damage reduction',
  },
];

let metaProgress = { credits: 0, upgrades: {} };
let shopReturnState = 'menu';

function initShop() {
  try {
    const saved = JSON.parse(localStorage.getItem(META_PROGRESS_KEY) || '{}');
    metaProgress.credits = Math.max(0, Math.floor(Number(saved.credits) || 0));
    for (const item of SHOP_UPGRADES) {
      const level = Number(saved.upgrades && saved.upgrades[item.id]) || 0;
      metaProgress.upgrades[item.id] = Math.max(0, Math.min(item.maxLevel, Math.floor(level)));
    }
  } catch (error) {
    metaProgress = { credits: 0, upgrades: {} };
  }

  el('shop-close').addEventListener('click', closeShop);
  updateShop();
}

function shopLevel(id) {
  return (metaProgress.upgrades && metaProgress.upgrades[id]) || 0;
}

function shopCost(item) {
  return item.baseCost + item.costStep * shopLevel(item.id);
}

function saveMetaProgress() {
  try {
    localStorage.setItem(META_PROGRESS_KEY, JSON.stringify(metaProgress));
  } catch (error) {
  }
}

function openShop() {
  if (state !== 'menu' && state !== 'over') return;
  shopReturnState = state;
  state = 'shop';
  updateShop('');
  el('shop-screen').style.display = 'flex';
}

function closeShop() {
  if (state !== 'shop') return;
  el('shop-screen').style.display = 'none';
  state = shopReturnState;
}

function buyShopUpgrade(id) {
  const item = SHOP_UPGRADES.find(upgrade => upgrade.id === id);
  if (!item) return;

  const level = shopLevel(id);
  if (level >= item.maxLevel) return;

  const cost = shopCost(item);
  if (metaProgress.credits < cost) {
    updateShop('NOT ENOUGH SCRAP');
    return;
  }

  metaProgress.credits -= cost;
  metaProgress.upgrades[id] = level + 1;
  saveMetaProgress();
  updateShop('UPGRADE PURCHASED');
}

function updateShop(message) {
  const balance = el('shop-credits');
  const menuBalance = el('meta-balance');
  if (balance) balance.textContent = metaProgress.credits;
  if (menuBalance) menuBalance.textContent = 'SCRAP: ' + metaProgress.credits;

  const list = el('shop-items');
  if (!list) return;
  list.innerHTML = '';

  for (const item of SHOP_UPGRADES) {
    const level = shopLevel(item.id);
    const maxed = level >= item.maxLevel;
    const cost = shopCost(item);
    const row = document.createElement('article');
    row.className = 'shop-item';

    const copy = document.createElement('div');
    copy.className = 'shop-item-copy';
    const heading = document.createElement('div');
    heading.className = 'shop-item-heading';
    const title = document.createElement('h2');
    title.textContent = item.name;
    const levelLabel = document.createElement('span');
    levelLabel.className = 'shop-level';
    levelLabel.textContent = 'LEVEL ' + level + ' / ' + item.maxLevel;
    heading.append(title, levelLabel);

    const description = document.createElement('p');
    description.textContent = item.description;
    const effect = document.createElement('p');
    effect.className = 'shop-effect';
    effect.textContent = 'CURRENT: ' + item.effect(level);
    copy.append(heading, description, effect);

    const button = document.createElement('button');
    button.className = 'btn shop-buy';
    button.disabled = maxed || metaProgress.credits < cost;
    button.textContent = maxed ? 'MAX LEVEL' : 'BUY - ' + cost + ' SCRAP';
    button.addEventListener('click', () => buyShopUpgrade(item.id));

    row.append(copy, button);
    list.appendChild(row);
  }

  const status = el('shop-message');
  if (status && message !== undefined) status.textContent = message;
}