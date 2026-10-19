// ════════════════════════════════════════════════════════════════════════════
//  config.js - every number you may want to tweak lives here
// ════════════════════════════════════════════════════════════════════════════

// ── WORLD ─────────────────────────────────────────────────────────────────
const TILE = 48;                 // size of one map square in pixels
const COLS = 38;                 // map width in tiles
const ROWS = 28;                 // map height in tiles
const W    = COLS * TILE;        // map width in pixels
const H    = ROWS * TILE;        // map height in pixels
const CAMERA_ZOOM = 1.25;
const SHRINE_COUNT = 6;
const SHRINE_HEAL = 70;

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];   // up, down, left, right

// ── PLAYER ────────────────────────────────────────────────────────────────
const PLAYER_SIZE   = 18;
const PLAYER_SPEED  = 160;       // pixels per second
const PLAYER_MAX_HP = 200;

const META_BONUS = {
  damage: 0.10,
  health: 25,
  damageReduction: 0.05,
};

// ── GUN ───────────────────────────────────────────────────────────
const BASE_WEAPON = {
  damage:      25,               // damage of one bullet
  bulletSpeed: 520,              // pixels per second
  fireDelay:   0.6,              // seconds between trigger pulls
  reload:      1.6,              // seconds to reload
  magazine:    8,                // bullets before a reload
};

const PER_CARD = {
  damage:    0.20,               // +20% of base damage
  damageReduction: 0.15,         // -15% incoming damage
  speed:     0.25,               // +25% of base bullet speed
  rate:      0.15,               // -15% of base fire delay
  reload:    0.15,               // -15% of base reload time
  magazine:  4,                  // +4 bullets in the magazine
  spreadGap: 0.14,               // angle between neighbouring spread bullets (radians, about 8 degrees)
  health:    40,                 // +40 max health (and heal 40)
  move:      0.10,               // +10% of base walking speed
  crit:      0.12,               // 12% chance to double damage
  siphon:    6,                  // heal 6 HP on enemy kill
  stun:      0.35,               // 0.35 seconds of slower movement per copy
  homing:    0.12,               // homing strength per copy, in radians per frame-ish
};

const MIN_FIRE_DELAY = 0.15;     // stacking Fire Rate can never go below this
const MIN_RELOAD     = 0.3;      // stacking Reload can never go below this
const BURST_GAP      = 0.1;      // seconds between the shots of a burst
const BULLET_RADIUS  = 3;

// Every offered card rolls its own rarity. weight = chance in %, bonus = stat multiplier.
// Legendary is reserved for Time Stop (3% per card slot while you do not own it).
// weight = chance in %, bonus = stat multiplier, color/rgb = border + back lines, glow = glow size (px), glowAlpha = glow strength
const CARD_RARITY = {
  common:    { weight: 45, bonus: 1.00, label: 'COMMON',    color: '#9fb0d0', rgb: '159,176,208', glow: 6,  glowAlpha: 0.35 },
  uncommon:  { weight: 30, bonus: 1.25, label: 'UNCOMMON',  color: '#4fd08a', rgb: '79,208,138',  glow: 12, glowAlpha: 0.5  },
  rare:      { weight: 15, bonus: 1.60, label: 'RARE',      color: '#4a9dff', rgb: '74,157,255',  glow: 20, glowAlpha: 0.65 },
  epic:      { weight: 7,  bonus: 2.15, label: 'EPIC',      color: '#b05cff', rgb: '176,92,255',  glow: 30, glowAlpha: 0.8  },
  legendary: { weight: 3,  bonus: 3.00, label: 'LEGENDARY', color: '#ffd24a', rgb: '255,210,74',  glow: 44, glowAlpha: 1.0  },
};

const TIME_STOP = {
  chargeSeconds: 10,
  windup: 1,                   // seconds of flash + glass building before it shatters
  duration: 5,                   // seconds time stays stopped after the shatter
  maxCharge: 1,
};

// Explosion card
const EXPLOSION = {
  baseRadius:      55,           // radius with 1 card
  radiusPerExtra:  25,           // +25 radius for every additional card
  damageShare:     0.75,         // blast damage at the centre = 75% of bullet damage
  edgeShare:       0.5,          // at the very edge the blast does 50% of the centre damage
};

// ── ENEMIES ───────────────────────────────────────────────────────────────
const DETECT_RANGE = 440;        // enemies notice you inside this distance
const CONTACT_DPS_FACTOR = 3;    // touching an enemy hurts (enemy damage * 3) per second

// from      = first wave this enemy can appear in
// weight    = how common it is compared with the others
// bullets   = bullets per shot, gap = angle between them (a fan if bullets > 1)
// burst     = shots in a row per trigger
const ENEMY_TYPES = {
  red: {
    from: 1, weight: 5, hp: 90, speed: 90, wanderSpeed: 66, size: 16, points: 15, sides: 3,
    damage: 15, fireDelay: 1.6, bulletSpeed: 380, bullets: 1, gap: 0, burst: 1, prefDist: 180,
    color: '#d9402a', dark: '#8c2a1c', line: '#ff9a80', info: 'RED - standard',
  },
  yellow: {
    from: 2, weight: 3, hp: 40, speed: 140, wanderSpeed: 95, size: 13, points: 10, sides: 3,
    damage: 10, fireDelay: 1.2, bulletSpeed: 380, bullets: 1, gap: 0, burst: 1, prefDist: 110,
    color: '#e6cc30', dark: '#8c7c1c', line: '#fff0a0', info: 'YELLOW - fast and weak',
  },
  purple: {
    from: 4, weight: 2, hp: 240, speed: 42, wanderSpeed: 38, size: 20, points: 30, sides: 0,
    damage: 12, fireDelay: 2.2, bulletSpeed: 340, bullets: 3, gap: 0.2, burst: 1, prefDist: 130,
    color: '#a040e0', dark: '#60269a', line: '#d9a0ff', info: 'PURPLE - tank, fires a spread shot',
  },
  green: {
    from: 6, weight: 2, hp: 78, speed: 60, wanderSpeed: 50, size: 15, points: 25, sides: 4,
    damage: 50, fireDelay: 3.2, bulletSpeed: 800, bullets: 1, gap: 0, burst: 1, prefDist: 340,
    color: '#40c060', dark: '#246e38', line: '#a0ffb8', info: 'GREEN - marksman, slow and high damage',
  },
  orange: {
    from: 8, weight: 1, hp: 150, speed: 55, wanderSpeed: 44, size: 18, points: 35, sides: 6,
    damage: 13, fireDelay: 2.4, bulletSpeed: 400, bullets: 1, gap: 0, burst: 3, prefDist: 200,
    color: '#e88a28', dark: '#8c5216', line: '#ffd09a', info: 'ORANGE - fires burst shots',
  },
  siege: {
    from: 10, weight: 1, hp: 325, speed: 52, wanderSpeed: 42, size: 24, points: 50, sides: 0,
    damage: 22, fireDelay: 2.8, bulletSpeed: 300, bullets: 1, gap: 0, burst: 1,
    prefDist: 230, blastRadius: 55, blastRadiusGrowth: 0.12, blastRadiusCap: PLAYER_SIZE * 5,
    color: '#b84a36', dark: '#702b24', line: '#ffad8c', info: 'SIEGE - fires growing explosive blasts',
  },
  turret: {
    from: 12, weight: 1, hp: 750, speed: 0, wanderSpeed: 0, size: 22, points: 65, sides: 5,
    damage: 14, fireDelay: 0.5, bulletSpeed: 100, bullets: 5, gap: 0, burst: 1,
    prefDist: 0, spinSpeed: 2, turret: true,
    color: '#c0fff3', dark: '#1d695d', line: '#9affe8', info: 'TURRET - stationary, spins and fires in five directions',
  },
  scanner: {
    from: 8, weight: 2, hp: 55, speed: 78, wanderSpeed: 78, size: 16, points: 25, sides: 0,
    damage: 0, fireDelay: 0, bulletSpeed: 0, bullets: 0, gap: 0, burst: 0,
    prefDist: 0, scanner: true, pingRange: 420, pingDuration: 1.2, pingInterval: 5,
    color: '#00862b', dark: '#163f23', line: '#a3ffb2', info: 'SCANNER - flies and alerts nearby enemies with green pings',
  },
};

// ── WAVES ─────────────────────────────────────────────────────────────────
const WAVE = {
  baseEnemies:   4,              // enemies in a wave = 4 + 3 * wave number
  perWave:       3,
  maxAliveBase:  4,              // enemies alive at once = 4 + wave number, capped
  maxAliveCap:   18,             // base cap, increased by 2 every 10 waves
  maxAlivePerTenWaves: 2,
  spawnInterval: 0.8,            // seconds between spawns
  spawnIntervalReduction: 0.1,   // seconds faster every 10 waves
  minSpawnInterval: 0.2,
  breakTime:     5,              // seconds between waves
  healShare:     0.3,            // health restored after a wave
  hpGrowth:      0.17,           // +17% enemy health per wave
  speedGrowth:   0.035,          // +3.5% enemy speed per wave
  speedCap:      1.5,            // enemy speed bonus can never exceed +50%
  damageGrowth:  0.065,          // +6.5% enemy damage per wave
  rateGrowth:    0.03,           // +3% enemy fire rate per wave
  rateCap:       3.0,            // enemy fire rate bonus can never exceed +200%
};

// ── CARDS ─────────────────────────────────────────────────────────────────
const CARD_COST_START = 60;      // points for the first card
const CARD_COST_STEP  = 20;      // each card costs 20 more than the last