// ════════════════════════════════════════════════════════════════════════════
//  config.js - every number you may want to tweak lives here
// ════════════════════════════════════════════════════════════════════════════

const TILE = 48;
const COLS = 38;
const ROWS = 28;
const W    = COLS * TILE;
const H    = ROWS * TILE;
const CAMERA_ZOOM = 1.25;
const SHRINE_COUNT = 6;
const SHRINE_HEAL = 70;

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const PLAYER_SIZE   = 18;
const PLAYER_SPEED  = 160;
const PLAYER_MAX_HP = 200;

const META_BONUS = {
  damage: 0.10,
  health: 25,
  damageReduction: 0.05,
};

const BASE_WEAPON = {
  damage:      25,
  bulletSpeed: 520,
  fireDelay:   0.75,
};

const PER_CARD = {
  damage:    0.20,
  damageReduction: 0.15,
  speed:     0.25,
  rate:      0.15,
  spreadGap: 0.14,
  health:    40,
  move:      0.10,
  crit:      0.12,
  siphon:    6,
  homing:    0.12,
};

const MIN_FIRE_DELAY = 0.15;
const BURST_GAP      = 0.1;
const BULLET_RADIUS  = 3;

const CARD_RARITY = {
  common:    { weight: 45, bonus: 1.00, label: 'COMMON',    color: '#9fb0d0', rgb: '159,176,208', glow: 6,  glowAlpha: 0.35 },
  uncommon:  { weight: 30, bonus: 1.25, label: 'UNCOMMON',  color: '#4fd08a', rgb: '79,208,138',  glow: 12, glowAlpha: 0.5  },
  rare:      { weight: 15, bonus: 1.60, label: 'RARE',      color: '#4a9dff', rgb: '74,157,255',  glow: 20, glowAlpha: 0.65 },
  epic:      { weight: 7,  bonus: 2.15, label: 'EPIC',      color: '#b05cff', rgb: '176,92,255',  glow: 30, glowAlpha: 0.8  },
  legendary: { weight: 3,  bonus: 3.00, label: 'LEGENDARY', color: '#ffd24a', rgb: '255,210,74',  glow: 44, glowAlpha: 1.0  },
};

const TIME_STOP = {
  chargeSeconds: 10,
  windup: 1,
  duration: 5,
  maxCharge: 1,
};

const EXPLOSION = {
  baseRadius:      55,
  radiusPerExtra:  25,
  damageShare:     0.75,
  edgeShare:       0.5,
};

const DETECT_RANGE = 440;
const CONTACT_DPS_FACTOR = 3;

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
    damage: 12, fireDelay: 2.2, bulletSpeed: 425, bullets: 3, gap: 0.4, burst: 1, prefDist: 130,
    color: '#a040e0', dark: '#60269a', line: '#d9a0ff', info: 'PURPLE - tanky and fires three bullets in a spread',
  },
  green: {
    from: 6, weight: 2, hp: 78, speed: 60, wanderSpeed: 50, size: 15, points: 25, sides: 4,
    damage: 50, fireDelay: 3.2, bulletSpeed: 800, bullets: 1, gap: 0, burst: 1, prefDist: 340,
    color: '#40c060', dark: '#246e38', line: '#a0ffb8', info: 'GREEN - fast bullets, slow speed and high damage',
  },
  orange: {
    from: 8, weight: 1, hp: 150, speed: 55, wanderSpeed: 44, size: 18, points: 35, sides: 6,
    damage: 13, fireDelay: 2.4, bulletSpeed: 450, bullets: 2, gap: 0.4, burst: 2, prefDist: 200,
    color: '#e88a28', dark: '#8c5216', line: '#ffd09a', info: 'ORANGE - ',
  },
  rocketeer: {
    from: 10, weight: 1, hp: 225, speed: 52, wanderSpeed: 42, size: 18, points: 50, sides: 0,
    damage: 22, fireDelay: 2.8, bulletSpeed: 400, bullets: 1, gap: 0, burst: 2,
    prefDist: 230, blastRadius: 55, blastRadiusGrowth: 0.12, blastRadiusCap: 18 * 5,
    color: '#b84a36', dark: '#702b24', line: '#ffad8c', info: 'ROCKETEER - fires explosive bullets',
  },
  turret: {
    from: 12, weight: 1, hp: 550, speed: 0, wanderSpeed: 0, size: 22, points: 65, sides: 5,
    damage: 14, fireDelay: 0.5, bulletSpeed: 100, bullets: 5, gap: 0, burst: 1,
    prefDist: 0, spinSpeed: 2, turret: true,
    color: '#c0fff3', dark: '#1d695d', line: '#9affe8', info: 'TURRET - stationary and fires in five directions',
  },
  scanner: {
    from: 8, weight: 2, hp: 55, speed: 78, wanderSpeed: 78, size: 16, points: 25, sides: 0,
    damage: 0, fireDelay: 0, bulletSpeed: 0, bullets: 0, gap: 0, burst: 0,
    prefDist: 0, scanner: true, pingRange: 420, pingDuration: 1.2, pingInterval: 5,
    color: '#00862b', dark: '#163f23', line: '#a3ffb2', info: 'SCANNER - flies and alerts nearby enemies with pings',
  },
  redV2: {
    from: 10, weight: 1, hp: 100, speed: 75, wanderSpeed: 55, size: 18, points: 40, sides: 3,
    damage: 8, fireDelay: 3.2, bulletSpeed: 300, bullets: 3, gap: 0.3, burst: 2, prefDist: 210,
    color: '#f04a50', dark: '#79232d', line: '#ffb0a8', info: 'RED V2 - ',
  },
  greenV2: {
    from: 14, weight: 1, hp: 60, speed: 38, wanderSpeed: 30, size: 18, points: 55, sides: 4,
    damage: 28, fireDelay: 3.8, bulletSpeed: 440, bullets: 1, gap: 0, burst: 1, prefDist: 390,
    homingTurnRate: 1.25,
    color: '#297a3d', dark: '#06180a', line: '#00d435', info: 'GREEN V2 - fires long-range homing shots',
  },
};

const WAVE = {
  baseEnemies:   2,
  perWave:       2,
  maxAliveBase:  4,
  maxAliveCap:   18,
  maxAlivePerTenWaves: 2,
  spawnInterval: 0.8,
  spawnIntervalReduction: 0.1,
  minSpawnInterval: 0.2,
  breakTime:     5,
  healShare:     0.3,
  waveClearBonusBase: 20,
  waveClearBonusPerWave: 3,
  waveClearBonusCap: 80,
  hpGrowth:      0.15,
  speedGrowth:   0.035,
  speedCap:      1.5,
  damageGrowth:  0.055,
  rateGrowth:    0.03,
  rateCap:       3.0,
};

const CARD_COST_START = 60;
const CARD_COST_STEP  = 20;