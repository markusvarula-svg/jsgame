// ════════════════════════════════════════════════════════════════════════════
//  map.js - square-block world: generation, collision, line of sight, pathfinding
//
//  Grid values: 0 floor | 1 solid block
// ════════════════════════════════════════════════════════════════════════════

// ── GENERATION ────────────────────────────────────────────────────────────

function emptyArena() {
  return Array.from({ length: ROWS }, (_, y) =>
    Array.from({ length: COLS }, (_, x) =>
      (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) ? 1 : 0));
}

// Shallow room division keeps the layout open while retaining broad connections.
function generateMap() {
  const largestEnemyRadius = Math.max(...Object.values(ENEMY_TYPES)
    .filter(type => !type.turret).map(type => type.size));
  for (let attempt = 0; attempt < 20; attempt++) {
    const g = emptyArena();
    divide(g, 1, 1, COLS - 2, ROWS - 2, 0);

    addBlockPillars(g, largestEnemyRadius);

    // Keep the player's start corner clear
    for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) g[y][x] = 0;

    if (isConnected(g) && isConnectedWithClearance(g, largestEnemyRadius)) return g;
  }
  return fallbackMap();
}

function fallbackMap() {
  const g = emptyArena();
  const wallX = Math.floor(COLS / 2);
  const doorStart = Math.floor(ROWS / 2) - 1;
  for (let y = 1; y < ROWS - 1; y++)
    if (y < doorStart || y >= doorStart + 3) g[y][wallX] = 1;

  const pillars = [
    [Math.floor(COLS * 0.25), Math.floor(ROWS * 0.25)],
    [Math.floor(COLS * 0.75) - 2, Math.floor(ROWS * 0.25)],
    [Math.floor(COLS * 0.25), Math.floor(ROWS * 0.75) - 2],
    [Math.floor(COLS * 0.75) - 2, Math.floor(ROWS * 0.75) - 2],
  ];
  for (const [x, y] of pillars)
    for (let dy = 0; dy < 2; dy++)
      for (let dx = 0; dx < 2; dx++) g[y + dy][x + dx] = 1;

  for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) g[y][x] = 0;
  return g;
}

// Add chunky square pillars only when every floor tile remains reachable.
function addBlockPillars(g, largestEnemyRadius) {
  for (let i = 0; i < 22; i++) {
    const size = 1 + rand(3);
    const x = 2 + rand(COLS - size - 4), y = 2 + rand(ROWS - size - 4);
    let clear = true;
    for (let dy = 0; dy < size && clear; dy++)
      for (let dx = 0; dx < size; dx++)
        if (g[y + dy][x + dx] !== 0) { clear = false; break; }
    if (!clear) continue;

    for (let dy = 0; dy < size; dy++)
      for (let dx = 0; dx < size; dx++) g[y + dy][x + dx] = 1;
    if (!isConnected(g) || !isConnectedWithClearance(g, largestEnemyRadius))
      for (let dy = 0; dy < size; dy++)
        for (let dx = 0; dx < size; dx++) g[y + dy][x + dx] = 0;
  }
}

// Split a free area at most twice, leaving a 3-tile passage in each wall.
function divide(g, x0, y0, w, h, depth) {
  if (depth >= 2) return;
  const canSplitVertically   = w >= 11;
  const canSplitHorizontally = h >= 11;
  if (!canSplitVertically && !canSplitHorizontally) return;
  if (w < 15 && h < 15 && Math.random() < 0.15) return;          // sometimes keep a bigger room

  const vertical = canSplitVertically &&
    (!canSplitHorizontally || w > h || (w === h && Math.random() < 0.5));

  if (vertical) {
    const wallX = x0 + 4 + rand(w - 8);                          // at least 4 free tiles each side
    const door  = y0 + rand(h - 2);
    for (let y = y0; y < y0 + h; y++) if (y < door || y >= door + 3) g[y][wallX] = 1;
    divide(g, x0, y0, wallX - x0, h, depth + 1);
    divide(g, wallX + 1, y0, x0 + w - 1 - wallX, h, depth + 1);
  } else {
    const wallY = y0 + 4 + rand(h - 8);
    const door  = x0 + rand(w - 2);
    for (let x = x0; x < x0 + w; x++) if (x < door || x >= door + 3) g[wallY][x] = 1;
    divide(g, x0, y0, w, wallY - y0, depth + 1);
    divide(g, x0, wallY + 1, w, y0 + h - 1 - wallY, depth + 1);
  }
}

// Flood fill from one floor tile: can we reach every other floor tile?
function isConnected(g) {
  let start = -1;
  for (let y = 1; y < ROWS - 1 && start < 0; y++)
    for (let x = 1; x < COLS - 1; x++)
      if (g[y][x] === 0) { start = y * COLS + x; break; }
  if (start < 0) return false;

  const seen  = new Uint8Array(COLS * ROWS);
  const queue = [start];
  let head = 0;
  seen[start] = 1;

  while (head < queue.length) {
    const cur = queue[head++];
    const cx = cur % COLS, cy = (cur - cx) / COLS;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const ni = ny * COLS + nx;
      if (g[ny][nx] === 0 && !seen[ni]) { seen[ni] = 1; queue.push(ni); }
    }
  }

  for (let y = 1; y < ROWS - 1; y++)
    for (let x = 1; x < COLS - 1; x++)
      if (g[y][x] === 0 && !seen[y * COLS + x]) return false;
  return true;
}

function isConnectedWithClearance(g, radius) {
  const clearance = radius + 2;
  const walkable = new Uint8Array(COLS * ROWS);
  let start = -1;

  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      if (g[y][x] !== 0) continue;
      let clear = true;
      for (let dy = -1; dy <= 1 && clear; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (g[y + dy][x + dx] === 0) continue;
          const gapX = Math.max(0, Math.abs(dx) * TILE - TILE / 2);
          const gapY = Math.max(0, Math.abs(dy) * TILE - TILE / 2);
          if (Math.hypot(gapX, gapY) < clearance) { clear = false; break; }
        }
      }
      if (clear) {
        const index = y * COLS + x;
        walkable[index] = 1;
        if (start < 0) start = index;
      }
    }
  }
  if (start < 0) return false;

  const seen = new Uint8Array(COLS * ROWS);
  const queue = [start];
  let head = 0;
  seen[start] = 1;
  while (head < queue.length) {
    const cur = queue[head++];
    const x = cur % COLS, y = Math.floor(cur / COLS);
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const next = ny * COLS + nx;
      if (walkable[next] && !seen[next]) { seen[next] = 1; queue.push(next); }
    }
  }
  for (let i = 0; i < walkable.length; i++)
    if (walkable[i] && !seen[i]) return false;
  return true;
}


// ── WORLD BUILDING ────────────────────────────────────────────────────────

let clearanceCache = new Map();

function buildWorld() {
  grid = generateMap();
  clearanceCache = new Map();
  shrines = generateShrines();
  buildMapCanvas();
}

function generateShrines() {
  const candidates = [];
  for (let y = 2; y < ROWS - 2; y++) {
    for (let x = 2; x < COLS - 2; x++) {
      if (grid[y][x] !== 0) continue;
      let open = true;
      for (let dy = -1; dy <= 1 && open; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if (grid[y + dy][x + dx] !== 0) { open = false; break; }
      const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2;
      if (open && Math.hypot(px - 2.5 * TILE, py - 2.5 * TILE) > TILE * 7)
        candidates.push({ x: px, y: py, active: true });
    }
  }

  for (let i = candidates.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const result = [];
  for (const candidate of candidates) {
    if (result.every(shrine => Math.hypot(shrine.x - candidate.x, shrine.y - candidate.y) > TILE * 7))
      result.push(candidate);
    if (result.length === SHRINE_COUNT) break;
  }
  return result;
}

// Draw square blocks with subtle seams and clean, continuous passage edges.
function buildMapCanvas() {
  mapCanvas = document.createElement('canvas');
  mapCanvas.width = W; mapCanvas.height = H;
  const g = mapCanvas.getContext('2d');

  g.fillStyle = '#101119';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#181a26';
  g.lineWidth = 1;
  for (let x = TILE; x < W; x += TILE) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = TILE; y < H; y += TILE) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }

  // Blocks that touch are drawn as one connected shape: shadow first, then a solid fill with
  // no seams, then edge shading only on sides that face the floor.
  const wall = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && grid[y][x] !== 0;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++)
    if (wall(x, y)) { g.fillStyle = '#090b11'; g.fillRect(x * TILE + 2, y * TILE + 5, TILE, TILE); }
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++)
    if (wall(x, y)) { g.fillStyle = '#30374a'; g.fillRect(x * TILE, y * TILE, TILE, TILE); }
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!wall(x, y)) continue;
      const px = x * TILE, py = y * TILE;
      if (!wall(x - 1, y)) { g.fillStyle = '#3a4257'; g.fillRect(px, py, 2, TILE); }
      if (!wall(x + 1, y)) { g.fillStyle = '#252b3c'; g.fillRect(px + TILE - 2, py, 2, TILE); }
      if (!wall(x, y + 1)) { g.fillStyle = '#252b3c'; g.fillRect(px, py + TILE - 3, TILE, 3); }
      if (!wall(x, y - 1)) { g.fillStyle = '#414a60'; g.fillRect(px, py, TILE, 4); }
    }
  }
}


// ── COLLISION ─────────────────────────────────────────────────────────────

// Circle against a square wall; rounded corners come naturally from the circle test.
function hitBlock(px, py, r, tx, ty) {
  const left = tx * TILE, top = ty * TILE;
  const right = left + TILE, bottom = top + TILE;
  const nearX = Math.max(left, Math.min(right, px));
  const nearY = Math.max(top, Math.min(bottom, py));
  const dx = px - nearX, dy = py - nearY;
  const distance = Math.hypot(dx, dy);

  if (distance >= r) return null;
  if (distance > 0) return { nx: dx / distance, ny: dy / distance, depth: r - distance };

  const faces = [
    { distance: px - left, nx: -1, ny: 0 },
    { distance: right - px, nx: 1, ny: 0 },
    { distance: py - top, nx: 0, ny: -1 },
    { distance: bottom - py, nx: 0, ny: 1 },
  ];
  const face = faces.reduce((nearest, current) => current.distance < nearest.distance ? current : nearest);
  return { nx: face.nx, ny: face.ny, depth: r + face.distance };
}

// Deepest overlap with any wall near (x, y), or null
function circleHit(x, y, r) {
  let best = null;
  const c0 = Math.max(0, Math.floor((x - r) / TILE)), c1 = Math.min(COLS - 1, Math.floor((x + r) / TILE));
  const r0 = Math.max(0, Math.floor((y - r) / TILE)), r1 = Math.min(ROWS - 1, Math.floor((y + r) / TILE));
  for (let cy = r0; cy <= r1; cy++)
    for (let cx = c0; cx <= c1; cx++)
      if (grid[cy][cx] !== 0) {
        const h = hitBlock(x, y, r, cx, cy);
        if (h && (!best || h.depth > best.depth)) best = h;
      }
  return best;
}

function collidesWalls(x, y, r) { return circleHit(x, y, r) !== null; }

// Move by velocity, then push out of any wall (this makes characters slide along walls)
function moveEntity(e, r, dt) {
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  for (let i = 0; i < 3; i++) {
    const h = circleHit(e.x, e.y, r);
    if (!h) break;
    e.x += h.nx * h.depth;
    e.y += h.ny * h.depth;
  }
  e.x = Math.max(r, Math.min(W - r, e.x));
  e.y = Math.max(r, Math.min(H - r, e.y));
}

// Walk along the line in 8 pixel steps. Any step inside a wall block blocks view.
function lineOfSight(x1, y1, x2, y2) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8);
  for (let i = 1; i < steps; i++) {
    const x = x1 + (x2 - x1) * i / steps;
    const y = y1 + (y2 - y1) * i / steps;
    const cx = Math.floor(x / TILE), cy = Math.floor(y / TILE);
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return false;
    if (grid[cy][cx] !== 0) return false;
  }
  return true;
}


// ── PATHFINDING ───────────────────────────────────────────────────────────

function walkableGrid(radius) {
  const clearance = Math.ceil(radius + 2);
  if (clearanceCache.has(clearance)) return clearanceCache.get(clearance);

  const walkable = new Uint8Array(COLS * ROWS);
  for (let y = 1; y < ROWS - 1; y++) {
    for (let x = 1; x < COLS - 1; x++) {
      if (grid[y][x] === 0 && !circleHit(x * TILE + TILE / 2, y * TILE + TILE / 2, clearance))
        walkable[y * COLS + x] = 1;
    }
  }
  clearanceCache.set(clearance, walkable);
  return walkable;
}

function clearRouteForCircle(x1, y1, x2, y2, radius) {
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(distance / 8));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (circleHit(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, radius + 1)) return false;
  }
  return true;
}

function smoothPath(path, startX, startY, radius) {
  const result = [];
  let anchor = { x: startX, y: startY };
  let index = 0;

  while (index < path.length) {
    let furthest = index;
    for (let candidate = path.length - 1; candidate > index; candidate--) {
      if (clearRouteForCircle(anchor.x, anchor.y, path[candidate].x, path[candidate].y, radius)) {
        furthest = candidate;
        break;
      }
    }
    anchor = path[furthest];
    result.push(anchor);
    index = furthest + 1;
  }
  return result;
}

// Breadth-first search over floor cells wide enough for this enemy's radius.
function findPath(ex, ey, tx, ty, radius = 0) {
  const walkable = walkableGrid(radius);
  let start = Math.floor(ey / TILE) * COLS + Math.floor(ex / TILE);
  if (!walkable[start]) {
    let nearestDistance = Infinity;
    for (let i = 0; i < walkable.length; i++) {
      if (!walkable[i]) continue;
      const x = (i % COLS) * TILE + TILE / 2;
      const y = Math.floor(i / COLS) * TILE + TILE / 2;
      const distance = Math.hypot(x - ex, y - ey);
      if (distance < nearestDistance && clearRouteForCircle(ex, ey, x, y, radius)) {
        start = i;
        nearestDistance = distance;
      }
    }
    if (!Number.isFinite(nearestDistance)) return [];
  }

  const goal = Math.floor(ty / TILE) * COLS + Math.floor(tx / TILE);
  const cameFrom = new Int16Array(COLS * ROWS).fill(-2);
  cameFrom[start] = -1;
  const queue = [start];
  let head = 0, best = start, bestDistance = Infinity;

  while (head < queue.length) {
    const cur = queue[head++];
    const col = cur % COLS, row = Math.floor(cur / COLS);
    const centerX = col * TILE + TILE / 2, centerY = row * TILE + TILE / 2;
    const distance = Math.hypot(centerX - tx, centerY - ty);
    if (distance < bestDistance) { best = cur; bestDistance = distance; }
    if (cur === goal) { best = cur; break; }

    for (const [dx, dy] of DIRS) {
      const nextCol = col + dx, nextRow = row + dy;
      if (nextCol < 0 || nextRow < 0 || nextCol >= COLS || nextRow >= ROWS) continue;
      const next = nextRow * COLS + nextCol;
      if (cameFrom[next] !== -2 || !walkable[next]) continue;
      cameFrom[next] = cur;
      queue.push(next);
    }
  }

  const path = [];
  for (let index = best; index >= 0; index = cameFrom[index]) {
    path.push({ x: (index % COLS) * TILE + TILE / 2, y: Math.floor(index / COLS) * TILE + TILE / 2 });
    if (index === start) break;
  }
  return smoothPath(path.reverse(), ex, ey, radius);
}