// ════════════════════════════════════════════════════════════════════════════
//  render.js - drawing (flat colours only) and particles
// ════════════════════════════════════════════════════════════════════════════

function render() {
  ctx.fillStyle = '#0b0b10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM);
  ctx.translate(-camX, -camY);                    // zoomed camera

  ctx.drawImage(mapCanvas, 0, 0);                 // walls and floor were drawn once in map.js
  drawShrines();
  drawParticles();
  drawBullets();
  drawEnemies();
  drawPlayer();
  if (state === 'play') drawCrosshair();

  ctx.restore();

  if (timeStopPhase === 'windup' || timeStopPhase === 'paused') drawHalt(haltElapsed());
}

// ── TIME STOP: "Halt" glass effect (blue) ────────────────────────────────
// 0 .. TIME_STOP.windup : white flash, glass panels pop in, neon lines grow
// at TIME_STOP.windup   : panels shatter and vanish, lines fade out slowly
// the world stays frozen until TIME_STOP.duration has run out
let haltMesh = null;
const HALT = { flash: 0.26, build: 0.42, shatter: 0.5, lineFade: 1.1 };   // seconds

function haltElapsed() {
  return timeStopPhase === 'windup'
    ? TIME_STOP.windup - timeStopWindup
    : TIME_STOP.windup + TIME_STOP.duration - timeStopTimer;
}

function buildHaltMesh() {
  const sw = canvas.width, sh = canvas.height;
  const cols = sw > 700 ? 9 : 5, rows = sw > 700 ? 6 : 8;
  const cw = sw / cols, ch = sh / rows, cx = sw / 2, cy = sh * 0.45, maxD = Math.hypot(sw, sh) / 2;
  const pts = [];
  for (let j = -1; j <= rows + 1; j++) {
    const row = [];
    for (let i = -1; i <= cols + 1; i++) {
      const p = { x: i * cw + (Math.random() - 0.5) * cw * 0.7, y: j * ch + (Math.random() - 0.5) * ch * 0.7 };
      p.d = Math.hypot(p.x - cx, p.y - cy) / maxD * HALT.build + Math.random() * 0.04;
      row.push(p);
    }
    pts.push(row);
  }
  const quads = [], edges = [];
  for (let j = 0; j < pts.length - 1; j++) for (let i = 0; i < pts[j].length - 1; i++) {
    const a = pts[j][i], b = pts[j][i + 1], c = pts[j + 1][i + 1], d = pts[j + 1][i];
    const qx = (a.x + b.x + c.x + d.x) / 4, qy = (a.y + b.y + c.y + d.y) / 4;
    const ang = Math.atan2(qy - cy, qx - cx) + (Math.random() - 0.5) * 0.8;
    quads.push({ p: [a, b, c, d], d: (a.d + b.d + c.d + d.d) / 4, shade: Math.random(), cx: qx, cy: qy,
      dx: Math.cos(ang), dy: Math.sin(ang), dist: 60 + Math.random() * 200, rot: (Math.random() - 0.5) * 1.4 });
    edges.push({ a: a, b: b, d: (a.d + b.d) / 2 });
    edges.push({ a: a, b: d, d: (a.d + d.d) / 2 });
  }
  haltMesh = { quads: quads, edges: edges };
}

function drawHalt(e) {
  if (!haltMesh) buildHaltMesh();
  const sw = canvas.width, sh = canvas.height, S = TIME_STOP.windup;
  const sp = clamp((e - S) / HALT.shatter, 0, 1), se = 1 - Math.pow(1 - sp, 3);   // shatter progress
  const lf = 1 - clamp((e - S) / HALT.lineFade, 0, 1);                              // line brightness
  const shake = e > S && e < S + 0.26 ? (1 - (e - S) / 0.26) * 14 : 0;

  ctx.save();
  if (shake) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

  if (sp < 1) for (const q of haltMesh.quads) {
    const p = clamp((e - q.d) / 0.11, 0, 1);
    if (!p) continue;
    const lum = 1 - clamp((e - q.d - 0.11) / 0.26, 0, 1);
    ctx.save();
    ctx.translate(q.cx + q.dx * q.dist * se, q.cy + q.dy * q.dist * se);
    ctx.rotate(q.rot * se);
    ctx.beginPath();
    ctx.moveTo(q.p[0].x - q.cx, q.p[0].y - q.cy);
    for (let k = 1; k < 4; k++) ctx.lineTo(q.p[k].x - q.cx, q.p[k].y - q.cy);
    ctx.closePath();
    ctx.fillStyle = 'rgba(' + (12 + lum * 70 | 0) + ',' + (30 + q.shade * 30 + lum * 130 | 0) + ',' +
                    (70 + q.shade * 30 + lum * 170 | 0) + ',' + (0.78 * p * (1 - sp)) + ')';
    ctx.fill();
    if (sp > 0) {
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(240,250,255,' + (1 - sp) + ')';
      ctx.shadowColor = '#4fb4ff'; ctx.shadowBlur = 14; ctx.stroke();
    }
    ctx.restore();
  }

  if (lf > 0) {
    ctx.lineCap = 'round';
    const lines = (w, col, blur) => {
      ctx.save();
      ctx.lineWidth = w; ctx.strokeStyle = col; ctx.shadowColor = '#4fb4ff'; ctx.shadowBlur = blur;
      ctx.beginPath();
      for (const ed of haltMesh.edges) {
        const t = clamp((e - ed.d) / 0.14, 0, 1);
        if (!t) continue;
        ctx.moveTo(ed.a.x, ed.a.y);
        ctx.lineTo(ed.a.x + (ed.b.x - ed.a.x) * t, ed.a.y + (ed.b.y - ed.a.y) * t);
      }
      ctx.stroke();
      ctx.restore();
    };
    ctx.globalAlpha = lf;
    lines(16, 'rgba(79,180,255,0.45)', 36);
    lines(5, '#f2fbff', 12);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  const v = ctx.createRadialGradient(sw / 2, sh / 2, Math.min(sw, sh) * 0.25, sw / 2, sh / 2, Math.hypot(sw, sh) * 0.6);
  v.addColorStop(0, 'rgba(0,20,50,0)'); v.addColorStop(1, 'rgba(0,25,60,' + (0.6 * lf) + ')');
  ctx.fillStyle = v; ctx.fillRect(0, 0, sw, sh);
  if (e > S) { ctx.fillStyle = 'rgba(90,170,255,0.06)'; ctx.fillRect(0, 0, sw, sh); }   // faint blue tint while frozen

  let fl = e < 0.04 ? e / 0.04 : 1 - clamp((e - 0.04) / (HALT.flash - 0.04), 0, 1);     // white flash
  if (e > S) fl = Math.max(fl, 0.6 * (1 - clamp((e - S) / 0.22, 0, 1)));                // second flash on shatter
  if (fl > 0) { ctx.fillStyle = 'rgba(255,255,255,' + fl + ')'; ctx.fillRect(0, 0, sw, sh); }
}

function drawShrines() {
  for (const shrine of shrines) {
    if (!shrine.active) continue;
    ctx.save();
    ctx.translate(shrine.x, shrine.y);
    ctx.fillStyle = 'rgba(75, 220, 150, 0.16)';
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#65e6a6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#a0ffd0';
    ctx.fillRect(-2, -8, 4, 16);
    ctx.fillRect(-8, -2, 16, 4);
    ctx.restore();
  }
}

function drawBullets() {
  for (const b of bullets) {
    ctx.fillStyle = b.blastRadius > 0 ? '#ffb040' : '#6fe3ff';   // explosive bullets are orange
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.blastRadius > 0 ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of eBullets) {
    ctx.fillStyle = b.blastRadius > 0 ? '#ffb040' : '#ff6a3c';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.blastRadius > 0 ? 5 : 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemies() {
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    const cfg = ENEMY_TYPES[e.type];

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.angle);

    ctx.fillStyle   = cfg.turret || cfg.scanner ? cfg.color : e.state === 'wander' ? cfg.dark : cfg.color;
    ctx.strokeStyle = cfg.line;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    if (cfg.sides === 0) {
      ctx.arc(0, 0, e.size, 0, Math.PI * 2);
    } else {
      for (let k = 0; k < cfg.sides; k++) {
        const a = k * Math.PI * 2 / cfg.sides;
        const px = Math.cos(a) * e.size, py = Math.sin(a) * e.size;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = cfg.line;
    if (cfg.scanner) {
      ctx.fillRect(-e.size * 1.6, -2, e.size * 3.2, 4);
      ctx.fillRect(-2, -e.size * 1.6, 4, e.size * 3.2);
      ctx.beginPath();
      ctx.arc(0, 0, e.size * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (cfg.turret) {
      for (let i = 0; i < 5; i++) {
        const angle = (i + 0.5) * Math.PI * 2 / 5;
        ctx.save();
        ctx.rotate(angle);
        ctx.fillRect(e.size * 0.72, -2, 10, 4);
        ctx.restore();
      }
    } else {
      ctx.fillRect(e.size * 0.8, -2, 10, 4);
    }
    ctx.restore();

    if (e.hp < e.maxHp) {                                             // health bar only when hurt
      const barWidth = e.size * 2.4;
      ctx.fillStyle = '#220000';
      ctx.fillRect(e.x - barWidth / 2, e.y - e.size - 13, barWidth, 4);
      ctx.fillStyle = cfg.color;
      ctx.fillRect(e.x - barWidth / 2, e.y - e.size - 13, barWidth * (e.hp / e.maxHp), 4);
    }
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  const s = PLAYER_SIZE;
  ctx.fillStyle   = '#2848c8';
  ctx.fillRect(-s, -s, s * 2, s * 2);
  ctx.strokeStyle = '#88aaff';
  ctx.lineWidth   = 2;
  ctx.strokeRect(-s, -s, s * 2, s * 2);
  ctx.fillStyle = '#b8c4ff';                                          // pistol barrel
  ctx.fillRect(s - 2, -3, 14, 6);
  ctx.restore();
}

function drawCrosshair() {
  const wx = mouse.x / CAMERA_ZOOM + camX, wy = mouse.y / CAMERA_ZOOM + camY;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth   = 1.5;
  ctx.beginPath(); ctx.moveTo(wx - 10, wy); ctx.lineTo(wx + 10, wy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(wx, wy - 10); ctx.lineTo(wx, wy + 10); ctx.stroke();
}


// ── PARTICLES ─────────────────────────────────────────────────────────────

function spawnBurst(x, y, color, count, speed, life) {
  for (let i = 0; i < count; i++)
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      life, maxLife: life, size: 2 + Math.random() * 3, color,
    });
}

function updateParticles(dt) {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.9;                                  // slow down a little every frame
    p.vy *= 0.9;
    p.life -= dt;
  }
  particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
  for (const p of particles) {
    const t = p.life / p.maxLife;                 // 1 = just born, 0 = gone
    ctx.globalAlpha = t;
    if (p.ring) {                                 // explosion ring grows to the blast radius
      ctx.strokeStyle = p.color;
      ctx.lineWidth   = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (1 - t), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;
}