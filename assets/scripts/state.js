// ════════════════════════════════════════════════════════════════════════════
//  state.js - variables shared by all files
// ════════════════════════════════════════════════════════════════════════════

let canvas, ctx, last = 0;

// menu | play | cards | over | shop. Only "play" runs the game logic, so the other
// states freeze the game (that is how the card screen pauses everything).
let state = 'menu';

let keys = {}, mouse = { x: 0, y: 0 }, mouseDown = false;

let player, bullets, eBullets, enemies, particles;
let grid, mapCanvas, shrines;
let camX = 0, camY = 0;

// Progress
let kills = 0, score = 0;
let cardProgress = 0, cardCost = CARD_COST_START, cardsTaken = 0, paidCardsTaken = 0, offered = [];
let freeCardPullsRemaining = 0;
let wave = 0, waveMode = 'intermission', toSpawn = 0, spawnTimer = 0, intermission = 0;
let bannerTimer = 0;
let timeStopCharge = 0, timeStopPhase = 'ready', timeStopTimer = 0, timeStopWindup = 0;
let cheatsUsed = false;      // set by any cheat: that run earns no scrap and is not recorded

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const diagonalMoveFactor = 1 / Math.sqrt(2);
const el = id => document.getElementById(id);
const rand = n => Math.floor(Math.random() * n);   // random whole number from 0 to n-1