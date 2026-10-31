/**
 * Pinball window: a modern cabinet seen through a tilted "camera" (dot-matrix display backbox, chrome
 * rails, raised ramps and orbit loops, lit inserts, particle effects, chrome ball with trail) drawn over
 * the engine in pinball-engine.js.
 * Controls: Left Arrow / Z = left flipper, Right Arrow / M or / = right flipper,
 * hold Space to pull the plunger and release to launch, Enter = new game, P = pause.
 * Touch/mouse: left half = left flipper, right half = right flipper,
 * press and hold the launch lane (bottom right) to pull the plunger.
 */
(function() {
  const { createEngine, W, H } = window.PinballEngine;
  const SC = 2, HDR = 88, CH = H + HDR, VIEW = 0.92, DW = 128, DH = 24, TAU = Math.PI * 2;
  const NS = 160, SLH = H / NS, S_TOP = 0.8;     // perspective: table drawn in 160 horizontal slices, narrower at the far (top) end
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- drawing helpers and pre-rendered sprites ---------- */
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w * SC; c.height = h * SC; const x = c.getContext('2d'); x.scale(SC, SC); return [c, x]; };
  const star = (x, cx, cy, R1, R2, n = 5) => {
    x.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? R2 : R1; x[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    x.closePath();
  };
  const GL = {};
  [['cyan', '76,194,255'], ['gold', '255,213,107'], ['pink', '255,95,168'], ['white', '255,255,255'], ['green', '108,240,150']].forEach(([n, rgb]) => {
    const [c, x] = mk(64, 64), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${rgb},.95)`); g.addColorStop(0.3, `rgba(${rgb},.4)`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); GL[n] = c;
  });
  const [BALL, bx] = mk(20, 20);
  (() => {
    const g = bx.createRadialGradient(8, 7, 1, 10, 10, 10);
    g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#c9d4ea'); g.addColorStop(0.7, '#6b7894'); g.addColorStop(1, '#2a3350');
    bx.fillStyle = g; bx.beginPath(); bx.arc(10, 10, 9, 0, TAU); bx.fill();
    bx.fillStyle = 'rgba(255,255,255,.85)'; bx.beginPath(); bx.ellipse(7, 6, 3, 1.8, -0.6, 0, TAU); bx.fill();
    bx.strokeStyle = 'rgba(180,220,255,.5)'; bx.lineWidth = 0.8; bx.beginPath(); bx.arc(10, 10, 8.6, 0.3, 1.6); bx.stroke();
  })();
  const bumperSprite = lit => {
    const [c, x] = mk(56, 56), m = 28, r = 20;
    let g = x.createRadialGradient(m - 5, m - 5, 4, m, m, r + 5); g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#9fb4d6'); g.addColorStop(1, '#39466e');
    x.fillStyle = g; x.beginPath(); x.arc(m, m, r + 4, 0, TAU); x.fill();
    x.fillStyle = lit ? '#ffe28a' : '#1c3a8a'; x.beginPath(); x.arc(m, m, r, 0, TAU); x.fill();
    g = x.createRadialGradient(m - 6, m - 7, 2, m, m, r - 5); g.addColorStop(0, lit ? '#fff' : '#bfe6ff'); g.addColorStop(1, lit ? '#ffb630' : '#2f78ff');
    x.fillStyle = g; x.beginPath(); x.arc(m, m, r - 5, 0, TAU); x.fill();
    x.fillStyle = lit ? '#8a5a00' : '#0d1a4a'; star(x, m, m, 8, 3.4); x.fill();
    return c;
  };
  const BUMP = [bumperSprite(false), bumperSprite(true)];
  const [VIG, vx] = mk(W, H);
  (() => {
    const g = vx.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 420); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); vx.fillStyle = g; vx.fillRect(0, 0, W, H);
    const d = vx.createLinearGradient(0, 0, 0, H * 0.55); d.addColorStop(0, 'rgba(0,0,40,.4)'); d.addColorStop(1, 'rgba(0,0,40,0)'); vx.fillStyle = d; vx.fillRect(0, 0, W, H);   // far end of the table is dimmer: depth
  })();

  // perspective slices: each row of the table is scaled by how far away it is
  const SLICES = [];
  (() => {
    let sum = 0;
    for (let i = 0; i < NS; i++) { const s = S_TOP + (1 - S_TOP) * (i + 0.5) / NS; SLICES.push({ s }); sum += SLH * s; }
    const k = H / sum; let y = 0;
    SLICES.forEach(o => { o.dh = SLH * o.s * k; o.dy = y; y += o.dh; o.dw = W * o.s; o.dx = (W - o.dw) / 2; });
  })();

  /* ---------- static art: playfield, rails, ramps ---------- */
  function buildTable() {
    const [c, b] = mk(W, H);
    let g = b.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b2275'); g.addColorStop(0.5, '#0c1040'); g.addColorStop(1, '#070924');
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    [[300, 250, 190, '150,70,220', 0.32], [90, 420, 150, '40,140,255', 0.25], [200, 560, 160, '255,60,140', 0.12], [195, 215, 120, '60,160,255', 0.16]].forEach(([x, y, r, rgb, a]) => {
      const n = b.createRadialGradient(x, y, 5, x, y, r); n.addColorStop(0, `rgba(${rgb},${a})`); n.addColorStop(1, `rgba(${rgb},0)`); b.fillStyle = n; b.fillRect(0, 0, W, H);
    });
    b.strokeStyle = 'rgba(120,170,255,.07)'; b.lineWidth = 1;
    for (let x = 0; x <= W; x += 30) { b.beginPath(); b.moveTo(x, 0); b.lineTo(x, H); b.stroke(); }
    for (let y = 0; y <= H; y += 30) { b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); }
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 130; i++) { b.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.6})`; const s = rnd() < 0.12 ? 1.8 : 0.9; b.fillRect(rnd() * W, rnd() * H, s, s); }
    // constellations
    b.strokeStyle = 'rgba(160,210,255,.22)'; b.lineWidth = 1; b.fillStyle = 'rgba(200,230,255,.6)';
    [[[58, 118], [92, 96], [120, 130], [152, 104]], [[262, 112], [300, 94], [330, 124], [316, 152]], [[40, 440], [70, 410], [64, 380]]].forEach(pl => {
      b.beginPath(); pl.forEach((p, i) => b[i ? 'lineTo' : 'moveTo'](...p)); b.stroke(); pl.forEach(p => { b.beginPath(); b.arc(p[0], p[1], 2, 0, TAU); b.fill(); });
    });
    // ringed planet: back of the ring, the planet, then the front of the ring
    const ring = (a0, a1, w) => { b.strokeStyle = 'rgba(255,213,107,.6)'; b.lineWidth = w; b.beginPath(); b.ellipse(95, 372, 80, 16, -0.35, a0, a1); b.stroke(); };
    ring(Math.PI, TAU, 3);
    g = b.createRadialGradient(80, 355, 3, 95, 372, 50); g.addColorStop(0, '#9fe0ff'); g.addColorStop(0.5, '#2a62d0'); g.addColorStop(1, '#0a1850');
    b.fillStyle = g; b.beginPath(); b.arc(95, 372, 46, 0, TAU); b.fill();
    b.save(); b.beginPath(); b.arc(95, 372, 46, 0, TAU); b.clip();
    b.fillStyle = 'rgba(255,255,255,.07)'; [[352, 6], [366, 9], [384, 5]].forEach(([y, h]) => b.fillRect(40, y, 110, h)); b.restore();
    ring(0, Math.PI, 3.5);
    // reactor rings around the bumpers, orbit lanes under the arch
    b.setLineDash([9, 7]);
    [[195, 215, 88, 'rgba(76,194,255,.3)'], [195, 215, 104, 'rgba(255,95,168,.22)']].forEach(([x, y, r, col]) => { b.strokeStyle = col; b.lineWidth = 2; b.beginPath(); b.arc(x, y, r, 0, TAU); b.stroke(); });
    [168, 148].forEach((r, i) => { b.strokeStyle = i ? 'rgba(255,95,168,.22)' : 'rgba(76,194,255,.26)'; b.lineWidth = 2; b.beginPath(); b.arc(210, 210, r, Math.PI + 0.18, TAU - 0.18); b.stroke(); });
    b.setLineDash([]);
    b.font = 'italic 800 30px "Segoe UI", system-ui, sans-serif'; b.textAlign = 'center'; b.fillStyle = 'rgba(130,205,255,.16)'; b.fillText('NOVA STRIKE', 191, 408);
    // painted shot labels
    const label = (t, x, y, ang = 0) => { b.save(); b.translate(x, y); b.rotate(ang); b.font = '700 10px "Segoe UI", system-ui, sans-serif'; b.textAlign = 'center'; b.fillStyle = 'rgba(190,225,255,.5)'; b.fillText(t, 0, 0); b.restore(); };
    label('ORBIT', 31, 302, -Math.PI / 2); label('ORBIT', 351, 302, Math.PI / 2); label('SKYWAY', 190, 450); label('SPIN', 291, 176); label('DOCK', 72, 263); label('SHIELDS', 300, 349);
    // launch lane
    g = b.createLinearGradient(372, 0, 410, 0); g.addColorStop(0, 'rgba(10,14,46,.9)'); g.addColorStop(1, 'rgba(30,40,100,.7)');
    b.fillStyle = g; b.fillRect(372, 244, 38, 396);
    b.strokeStyle = 'rgba(255,213,107,.35)'; b.lineWidth = 2.5;
    [330, 385, 440].forEach(y => { b.beginPath(); b.moveTo(382, y + 8); b.lineTo(391, y - 2); b.lineTo(400, y + 8); b.stroke(); });
    return c;
  }
  function buildRails(E) {          // raised metal guides: shadow, side wall, dark body, chrome top, highlight
    const [c, r] = mk(W, H);
    const plain = E.geo.segs.filter(s => !s.target && !s.sling && !s.rubber && !s.gate && !s.drop);
    const pass = (col, w, dx = 0, dy = 0) => { r.strokeStyle = col; r.lineWidth = w; r.beginPath(); plain.forEach(s => { r.moveTo(s.x1 + dx, s.y1 + dy); r.lineTo(s.x2 + dx, s.y2 + dy); }); r.stroke(); };
    r.lineCap = 'round'; r.lineJoin = 'round';
    pass('rgba(0,0,0,.5)', 8, 3, 6); pass('#26356b', 7.5, 1.6, 3.4); pass('#0a0f2e', 7.5); pass('#8da3cc', 5); pass('#e6f0ff', 1.8, -0.9, -0.9);
    return c;
  }
  function buildLanes(E) {          // ramp and orbit loops: translucent plastic with chrome side rails, lifted above the playfield
    const [c, x] = mk(W, H);
    x.lineCap = 'round'; x.lineJoin = 'round';
    E.geo.lanes.forEach(L => {
      const hw = L.key === 'ramp' ? 12 : 8, P = L.pts, left = [], right = [];
      P.forEach((p, i) => {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
        let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
        left.push([p[0] - dy * hw, p[1] + dx * hw]); right.push([p[0] + dy * hw, p[1] - dx * hw]);
      });
      const ribbon = (dx, dy) => { x.beginPath(); left.forEach((p, i) => x[i ? 'lineTo' : 'moveTo'](p[0] + dx, p[1] + dy)); for (let i = right.length - 1; i >= 0; i--) x.lineTo(right[i][0] + dx, right[i][1] + dy); x.closePath(); };
      const rail = (pts, col, w, dx, dy) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); pts.forEach((p, i) => x[i ? 'lineTo' : 'moveTo'](p[0] + dx, p[1] + dy)); x.stroke(); };
      for (let k = 1; k <= 7; k++) { ribbon(k * 1.3, k * 2.1); x.fillStyle = 'rgba(0,0,30,0.07)'; x.fill(); }                                   // soft shadow on the playfield
      [left, right].forEach(s => rail(s, '#1d2a5e', 5, 0, 5));                                                                                         // side wall
      ribbon(0, -2); x.fillStyle = L.key === 'ramp' ? 'rgba(120,205,255,.15)' : 'rgba(150,170,255,.10)'; x.fill();                                    // plastic surface
      x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 1; x.setLineDash([6, 8]); x.beginPath(); P.forEach((p, i) => x[i ? 'lineTo' : 'moveTo'](p[0], p[1] - 2)); x.stroke(); x.setLineDash([]);
      [left, right].forEach(s => { rail(s, '#0a0f2e', 4.6, 0, -2); rail(s, '#8da3cc', 3, 0, -2); rail(s, '#e6f0ff', 1, -0.6, -3); });                   // chrome rails
    });
    return c;
  }

  window.openPinball = function() {
    if (windowManager.wins.has('pinball')) { windowManager.createWindow({ key: 'pinball' }); return; }

    const node = document.createElement('div');
    node.className = 'pb';
    node.innerHTML = '<canvas class="pb-cv"></canvas>';
    const cv = node.querySelector('.pb-cv'), ctx = cv.getContext('2d');
    cv.width = W * SC; cv.height = CH * SC; cv.style.width = (W * VIEW) + 'px'; cv.style.height = (CH * VIEW) + 'px';
    const win = windowManager.createWindow({ key: 'pinball', title: 'Pinball', icon: 'pinball', node, width: Math.round(W * VIEW) + 2, height: Math.round(CH * VIEW) + 34, left: 300, top: 4 });
    win.style.minWidth = '0'; win.style.minHeight = '0';

    const E = createEngine();
    node._engine = E;
    E.S.hi = +localStorage.getItem('pinball.hi') || 0;
    E.newGame();
    const TABLE = buildTable(), RAILS = buildRails(E), LANES = buildLanes(E);
    const [tbl, tctx] = mk(W, H);            // the table is drawn flat here, then warped onto the screen
    let cx = tctx;                           // context the helpers draw on
    const keys = { L: false, R: false };
    let paused = false, raf = 0, last = performance.now(), t = 0;

    /* ---------- sound (through the emulator's master volume) ---------- */
    const snd = (type, f0, f1, dur, vol = 0.12, delay = 0) => {
      const h = window.EmuAudio && EmuAudio.ctxOut();
      if (!h) return;
      const at = h.ctx.currentTime + delay, o = h.ctx.createOscillator(), g = h.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + dur);
      g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.001, at + dur);
      o.connect(g); g.connect(h.out); o.start(at); o.stop(at + dur + 0.02);
    };
    const arp = notes => notes.forEach((f, i) => snd('sine', f, f * 1.02, 0.14, 0.14, i * 0.09));
    const SOUNDS = {
      bump: () => snd('square', 520, 780, 0.1, 0.1), sling: () => snd('sawtooth', 300, 200, 0.08, 0.08),
      target: () => snd('sine', 880, 1320, 0.12, 0.14), rollover: () => snd('sine', 660, 990, 0.08, 0.1),
      bank: () => arp([523, 659, 784, 1047]), bonus: () => arp([392, 523, 659, 784, 1047]), saved: () => arp([784, 659, 523]),
      launch: () => snd('sawtooth', 160, 700, 0.35, 0.09), drain: () => snd('sine', 420, 70, 0.7, 0.13),
      over: () => snd('triangle', 300, 60, 1.2, 0.14), flip: () => snd('triangle', 180, 90, 0.05, 0.09),
      orbit: () => snd('sawtooth', 220, 900, 0.45, 0.08), ramp: () => { snd('sawtooth', 160, 1100, 0.5, 0.09); snd('sine', 400, 1600, 0.5, 0.08); },
      spin: () => snd('square', 1400, 1100, 0.025, 0.04), saucer: () => snd('triangle', 200, 80, 0.2, 0.15), eject: () => snd('sawtooth', 120, 600, 0.18, 0.1),
      drop: () => snd('square', 300, 140, 0.07, 0.1), dropbank: () => arp([392, 523, 784]), mission: () => arp([523, 659, 784, 1047, 1319]),
      wizard: () => arp([262, 330, 392, 523, 659, 784, 1047])
    };
    const lastSnd = {};
    const play = k => { const n = performance.now(); if (!SOUNDS[k] || n - (lastSnd[k] || 0) < (k === 'spin' ? 70 : 25)) return; lastSnd[k] = n; SOUNDS[k](); };

    /* ---------- input ---------- */
    const active = () => node.isConnected && windowManager.order[windowManager.order.length - 1] === 'pinball' && !windowManager.wins.get('pinball').min;
    const flip = (side, down) => { if (keys[side] === down) return; keys[side] = down; E.setFlipper(side, down); if (down) play('flip'); };
    document.addEventListener('keydown', e => {
      if (!node.isConnected || !active() || (e.target.closest && e.target.closest('input,textarea'))) return;
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'z' || k === 'Z') { e.preventDefault(); flip('L', true); }
      else if (k === 'ArrowRight' || k === '/' || k === 'm' || k === 'M') { e.preventDefault(); flip('R', true); }
      else if (k === ' ') { e.preventDefault(); E.pull(true); }
      else if (k === 'Enter' && E.S.state === 'over') E.newGame();
      else if (k === 'p' || k === 'P') paused = !paused;
    });
    document.addEventListener('keyup', e => {
      if (!node.isConnected) return;
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'z' || k === 'Z') flip('L', false);
      else if (k === 'ArrowRight' || k === '/' || k === 'm' || k === 'M') flip('R', false);
      else if (k === ' ' && E.S.pulling) E.pull(false);
    });
    const pts = new Map();
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * CH - HDR]; };
    cv.addEventListener('pointerdown', e => {
      if (E.S.state === 'over') { E.newGame(); return; }
      const [x, y] = pos(e), role = x > 372 && y > 480 ? 'P' : x < W / 2 ? 'L' : 'R';
      pts.set(e.pointerId, role);
      if (role === 'P') E.pull(true); else flip(role, true);
      try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    });
    const release = e => {
      const role = pts.get(e.pointerId); if (!role) return;
      pts.delete(e.pointerId);
      if (role === 'P') E.pull(false); else flip(role, false);
    };
    cv.addEventListener('pointerup', release);
    cv.addEventListener('pointercancel', release);

    /* ---------- dot-matrix display ---------- */
    const dmd = document.createElement('canvas');
    dmd.width = DW; dmd.height = DH;
    const dctx = dmd.getContext('2d');
    let cur = null, queue = [], shown = 0;
    const say = (a, b = '', ms = 1400) => { cur = { a, b, until: performance.now() + ms }; queue = []; };
    const sayQ = (a, b = '', ms = 1400) => { queue.push({ a, b, ms }); };
    const fmt = n => Math.round(n).toLocaleString('en-US');
    function dmdLines(a, b, blinkOff) {
      dctx.fillStyle = '#000'; dctx.fillRect(0, 0, DW, DH);
      dctx.fillStyle = '#ff9a1f'; dctx.textAlign = 'center'; dctx.textBaseline = 'top';
      if (!b) { if (!blinkOff) { dctx.font = 'bold 13px "Courier New", monospace'; dctx.fillText(a, DW / 2, 6); } return; }
      dctx.font = 'bold 8px "Courier New", monospace'; dctx.fillText(a, DW / 2, 1);
      if (!blinkOff) { dctx.font = 'bold 13px "Courier New", monospace'; dctx.fillText(b, DW / 2, 10); }   // only the second line blinks
    }
    function drawBackbox(now) {
      const S = E.S, m = S.mission, ranks = E.geo.ranks;
      let g = ctx.createLinearGradient(0, 0, 0, HDR); g.addColorStop(0, '#11184a'); g.addColorStop(1, '#050716');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, HDR);
      ctx.fillStyle = '#02030a'; ctx.fillRect(6, 5, W - 12, 80);
      ctx.strokeStyle = '#4a5cae'; ctx.lineWidth = 1.5; ctx.strokeRect(6, 5, W - 12, 80);
      if (cur && now >= cur.until && queue.length) { const q = queue.shift(); cur = { a: q.a, b: q.b, until: now + q.ms }; }
      const blink = Math.floor(now / 450) % 2 === 1, ph = Math.floor(now / 2400) % 3;
      const l1 = S.wizard > 0 ? `WARP MODE x2  ${Math.ceil(S.wizard)}S` : ph === 0 ? `BALL ${Math.min(S.ballNo, 3)}  BONUS ${S.mult}X` : ph === 1 ? `${m.hint} ${m.have}/${m.need}` : `RANK ${ranks[S.rank]}`;
      if (cur && now < cur.until) dmdLines(cur.a, cur.b, false);
      else if (S.state === 'over') { const p = [['GAME OVER', ''], ['YOUR SCORE', fmt(S.score)], ['HIGH SCORE', fmt(S.hi)], ['PRESS ENTER', 'OR CLICK']][Math.floor(now / 2200) % 4]; dmdLines(p[0], p[1], false); }
      else if (S.state === 'launch') dmdLines(l1, S.charge > 0 ? 'POWER ' + '='.repeat(Math.round(S.charge * 10)) : 'PULL PLUNGER', S.charge === 0 && blink);
      else dmdLines(l1, fmt(shown), false);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(dmd, 10, 8, 400, 75); ctx.imageSmoothingEnabled = true;
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      for (let i = 1; i < DW; i++) ctx.fillRect(10 + i * 3.125 - 0.3, 8, 0.6, 75);
      for (let j = 1; j < DH; j++) ctx.fillRect(10, 8 + j * 3.125 - 0.3, 400, 0.6);
      g = ctx.createLinearGradient(0, 8, 0, 83); g.addColorStop(0, 'rgba(255,255,255,.10)'); g.addColorStop(0.5, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(10, 8, 400, 75);
      ctx.fillStyle = '#8da3cc'; ctx.fillRect(0, HDR - 3, W, 3);
    }

    /* ---------- effects ---------- */
    const parts = [], rings = [], trail = [];
    let shake = 0, flash = 0, flashRGB = '255,213,107', bumpTimes = [];
    const burst = (x, y, n, col, sp = 160) => {
      for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (0.3 + Math.random()); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.5 + Math.random() * 0.4, max: 0.9, c: col, s: 7 + Math.random() * 9 }); }
      if (parts.length > 400) parts.splice(0, parts.length - 400);
    };
    const FX = {
      bump: f => { burst(f.x, f.y, 12, 'cyan'); rings.push({ x: f.x, y: f.y, r: 22, life: 0.35 });
        const n = performance.now(); bumpTimes = bumpTimes.filter(v => n - v < 2000); bumpTimes.push(n); if (bumpTimes.length >= 5 && bumpTimes.length % 5 === 0) say('BUMPER FRENZY', 'x' + bumpTimes.length, 1000); },
      sling: f => { burst(f.x, f.y, 8, 'pink', 200); if (!reduce) shake = 0.12; },
      target: f => { burst(f.x, f.y, 10, 'gold'); say('TARGET HIT', '+250', 700); },
      rollover: f => burst(f.x, f.y, 8, 'gold', 110),
      bank: f => { burst(f.x, f.y, 40, 'gold', 260); burst(f.x, f.y, 24, 'pink', 200); flash = 1; flashRGB = '255,213,107'; if (!reduce) shake = 0.2; say('TARGETS CLEARED', '+5,000', 1600); },
      bonus: () => { burst(190, 150, 50, 'cyan', 280); flash = 1; flashRGB = '76,194,255'; say('MULTIPLIER', 'x' + E.S.mult, 1800); },
      launch: f => burst(f.x, f.y, 10, 'white', 120),
      saved: f => { burst(f.x, f.y, 24, 'green', 200); say('BALL SAVED', 'SHOOT AGAIN', 1500); },
      drain: () => say('BALL LOST', '', 1100),
      orbit: f => { burst(f.x, f.y, 14, 'cyan', 220); say('ORBIT', '+500', 800); },
      ramp: f => { burst(f.x, f.y, 18, 'gold', 240); say('SKYWAY', '+1,500', 900); },
      spin: f => burst(f.x, f.y + 8, 3, 'white', 90),
      saucer: f => { burst(f.x, f.y, 20, 'green', 160); say('DOCKING', '+1,000', 1000); },
      eject: f => burst(f.x + 10, f.y, 16, 'green', 260),
      drop: f => burst(f.x, f.y, 6, 'cyan', 120),
      dropbank: f => { burst(f.x, f.y, 26, 'gold', 220); say('SHIELDS DOWN', '+2,000', 1200); },
      mission: () => { const S = E.S; burst(190, 300, 60, 'gold', 300); burst(190, 300, 30, 'cyan', 240); flash = 1; flashRGB = '255,213,107'; if (!reduce) shake = 0.2;
        say('MISSION COMPLETE', '+' + fmt(S.lastReward), 1700); sayQ('RANK UP', E.geo.ranks[S.rank], 1700); sayQ('NEXT MISSION', S.mission.hint, 1900); },
      wizard: () => { burst(190, 300, 80, 'pink', 320); flash = 1; flashRGB = '255,95,168'; say('WARP MODE', 'x2 FOR 20 SEC', 2200); }
    };

    /* ---------- drawing the table (flat), then warping it ---------- */
    const circle = (x, y, r) => { cx.beginPath(); cx.arc(x, y, r, 0, TAU); };
    const add = (name, x, y, size, a) => { cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = a; cx.drawImage(GL[name], x - size / 2, y - size / 2, size, size); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; };
    const arrow = (x, y, ang, on, col, sz = 1) => {
      cx.save(); cx.translate(x, y); cx.rotate(ang); cx.scale(sz, sz); cx.fillStyle = on ? col : '#27325f';
      cx.beginPath(); cx.moveTo(8, 0); cx.lineTo(-5, -6); cx.lineTo(-2, 0); cx.lineTo(-5, 6); cx.closePath(); cx.fill(); cx.restore();
      if (on) add(col === '#ffd56b' ? 'gold' : 'cyan', x, y, 28 * sz, 0.75);
    };
    const drawBall = (b, h) => {       // h = how high above the playfield the ball is (ramps)
      cx.fillStyle = `rgba(0,0,0,${0.4 - h * 0.012})`; cx.beginPath(); cx.ellipse(b.x + 3 + h * 0.8, b.y + 5 + h * 1.2, 9 + h * 0.2, 7, 0, 0, TAU); cx.fill();
      trail.forEach((p, i) => add('white', p.x, p.y - h, 8 + i * 1.6, 0.04 + i * 0.012));
      const s = 20 + h * 0.5; cx.drawImage(BALL, b.x - s / 2, b.y - h - s / 2, s, s);
    };

    function drawTable() {
      cx = tctx; const c = tctx, S = E.S, g = E.geo, m = S.mission.key, blink = Math.floor(t * 4) % 2 === 0;
      c.setTransform(SC, 0, 0, SC, 0, 0);
      c.drawImage(TABLE, 0, 0, W, H);
      c.drawImage(RAILS, 0, 0, W, H);
      const speed = flash > 0 ? 24 : 9;

      // chasing lamps along the arch
      for (let i = 0; i < 28; i++) {
        const a = Math.PI + 0.12 + (Math.PI - 0.24) * i / 27, x = 210 + 186 * Math.cos(a), y = 210 + 186 * Math.sin(a);
        const on = (i + Math.floor(t * speed)) % 4 === 0;
        c.fillStyle = on ? '#ffd56b' : '#232e5c'; circle(x, y, 3); c.fill();
        if (on) add('gold', x, y, 18, 0.65);
      }
      // lead-in arrows toward the flippers
      for (let i = 0; i < 3; i++) {
        const on = Math.floor(t * 5) % 3 === i, f = 0.22 + i * 0.26, x = 10 + 105 * f, y = 490 + 60 * f - 14, ang = 0.52;
        arrow(x + 8, y, ang, on, '#4cc2ff'); arrow(382 - x - 8, y, Math.PI - ang, on, '#4cc2ff');
      }
      // shot arrows: flash for whichever shot the current mission wants
      const shots = [['orbit', 40, 372, 'orbit'], ['orbit', 342, 372, 'orbit'], ['ramp', 190, 428, 'ramp']];
      shots.forEach(([k, x, y]) => arrow(x, y, -Math.PI / 2, m === k ? blink : Math.floor(t * 3 + x) % 3 === 0, m === k ? '#ffd56b' : '#4cc2ff', 1.25));
      arrow(291, 192, -Math.PI / 2, m === 'spin' ? blink : false, '#ffd56b', 1.1);
      arrow(84, 262, Math.PI, m === 'saucer' ? blink : false, '#ffd56b', 1.1);
      arrow(300, 346, Math.PI / 2, m === 'drop' ? blink : false, '#ffd56b', 1.1);
      // mission lamps (six missions) and multiplier lamps
      c.font = '700 10px "Segoe UI", system-ui, sans-serif'; c.textAlign = 'center';
      for (let i = 0; i < 6; i++) {
        const x = [108, 134, 160, 236, 262, 288][i], done = i < S.mi, now = i === S.mi;
        c.fillStyle = done ? '#ffd56b' : now ? (blink ? '#4cc2ff' : '#1d4a7a') : '#1a2350'; circle(x, 302, 6.5); c.fill();
        c.strokeStyle = '#4a5cae'; c.lineWidth = 1; c.stroke();
        if (done) add('gold', x, 302, 26, 0.6); else if (now && blink) add('cyan', x, 302, 28, 0.7);
      }
      [2, 3, 4, 5].forEach((n, i) => {
        const x = 62 + i * 33, on = S.mult >= n;
        c.fillStyle = on ? '#ffb630' : '#1a2350'; c.fillRect(x - 14, 336, 28, 15);
        c.strokeStyle = '#4a5cae'; c.lineWidth = 1; c.strokeRect(x - 14, 336, 28, 15);
        c.fillStyle = on ? '#3a2400' : '#4a5cae'; c.fillText(n + 'X', x, 347);
        if (on) add('gold', x, 343, 40, 0.5);
      });
      // rollover stars
      for (const s of g.sensors) {
        c.fillStyle = s.lit ? '#ffd56b' : '#27325f'; star(c, s.x, s.y, 9.5, 4.2); c.fill();
        c.strokeStyle = '#4cc2ff'; c.lineWidth = 1.2; c.stroke();
        if (s.lit) add('gold', s.x, s.y, 36, 0.8);
      }
      // slingshots: plastic, glowing rubber edge
      const tri = (A, B, C, hit) => {
        const gr = c.createLinearGradient(A[0], A[1], C[0], C[1]); gr.addColorStop(0, hit ? 'rgba(255,255,255,.7)' : 'rgba(255,95,168,.38)'); gr.addColorStop(1, 'rgba(120,30,90,.22)');
        c.fillStyle = gr; c.beginPath(); c.moveTo(...A); c.lineTo(...B); c.lineTo(...C); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(255,95,168,.8)'; c.lineWidth = 1.5; c.stroke();
      };
      const slings = g.segs.filter(s => s.sling);
      tri([52, 420], [52, 482], [98, 482], slings[0] && slings[0].hit > 0); tri([330, 420], [330, 482], [284, 482], slings[1] && slings[1].hit > 0);
      c.lineCap = 'round';
      for (const s of slings) {
        c.strokeStyle = s.hit > 0 ? '#fff' : '#ff3d8b'; c.lineWidth = 4.5; c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke();
        if (s.hit > 0) add('pink', (s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, 70, 0.9);
      }
      // gate and standup targets
      for (const s of g.segs) {
        if (s.gate) { c.strokeStyle = '#ffd56b'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke(); }
        else if (s.target) {
          const hot = s.hit > 0;
          c.strokeStyle = hot ? '#fff' : s.lit ? '#ffd56b' : '#4a5a8c'; c.lineWidth = 6.5; c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke();
          c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(s.x1 - 1.2, s.y1 + 2); c.lineTo(s.x2 - 1.2, s.y2 - 2); c.stroke();
          if (s.lit || hot) add('gold', (s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, 48, hot ? 1 : 0.55);
        }
      }
      // drop targets: raised blocks that sink flat when hit
      for (const d of g.drops) {
        const len = d.y2 - d.y1;
        if (d.down) { c.fillStyle = '#26356b'; c.fillRect(d.x1 - 4.5, d.y1 + len / 2 - 1.5, 9, 3); continue; }
        c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(d.x1 - 1.5, d.y1 + 3, 9, len);
        const gr = c.createLinearGradient(d.x1 - 4.5, 0, d.x1 + 4.5, 0); gr.addColorStop(0, d.hit > 0 ? '#fff' : '#b9cdf5'); gr.addColorStop(1, d.hit > 0 ? '#fff' : '#4a5f9a');
        c.fillStyle = gr; c.fillRect(d.x1 - 4.5, d.y1, 9, len);
        c.fillStyle = m === 'drop' && blink ? '#ffd56b' : '#4cc2ff'; c.fillRect(d.x1 - 2, d.y1 + 3, 4, len - 6);
        c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(d.x1 - 4.5, d.y1, 9, 1.5);
      }
      // spinner
      const sp = g.spinner, scx = (sp.x1 + sp.x2) / 2, th = 1.5 + 9 * Math.abs(Math.sin(sp.ang));
      c.fillStyle = '#8da3cc'; circle(sp.x1 - 2, sp.y1, 3); c.fill(); circle(sp.x2 + 2, sp.y1, 3); c.fill();
      c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(sp.x1 + 2, sp.y1 - th / 2 + 4, sp.x2 - sp.x1, th);
      const sg = c.createLinearGradient(0, sp.y1 - th / 2, 0, sp.y1 + th / 2); sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, '#7f95c4');
      c.fillStyle = sg; c.fillRect(sp.x1, sp.y1 - th / 2, sp.x2 - sp.x1, th);
      if (sp.om > 8) add('white', scx, sp.y1, 60, Math.min(0.5, sp.om / 60));
      // saucer
      const sc = g.saucer, hot = S.hold || m === 'saucer' && blink;
      if (hot) add('green', sc.x, sc.y, 64, S.hold ? 0.9 : 0.55);
      let rg = c.createRadialGradient(sc.x - 4, sc.y - 4, 2, sc.x, sc.y, sc.r + 5); rg.addColorStop(0, '#fff'); rg.addColorStop(0.5, '#9fb4d6'); rg.addColorStop(1, '#39466e');
      c.fillStyle = rg; circle(sc.x, sc.y, sc.r + 4); c.fill();
      rg = c.createRadialGradient(sc.x, sc.y, 1, sc.x, sc.y, sc.r); rg.addColorStop(0, '#000'); rg.addColorStop(1, '#101a44');
      c.fillStyle = rg; circle(sc.x, sc.y, sc.r - 1); c.fill();
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * (S.hold ? 4 : 0.6); c.fillStyle = hot ? '#6cf096' : '#2d3a74'; circle(sc.x + Math.cos(a) * (sc.r + 1), sc.y + Math.sin(a) * (sc.r + 1), 1.8); c.fill(); }
      // pop bumpers
      for (const b of g.bumpers) {
        if (b.lit > 0) add('gold', b.x, b.y, b.r * 4.2, 0.9);
        c.drawImage(BUMP[b.lit > 0 ? 1 : 0], b.x - 28, b.y - 28, 56, 56);
      }
      for (const r of rings) { c.strokeStyle = `rgba(150,225,255,${Math.max(0, r.life / 0.35)})`; c.lineWidth = 2.5; circle(r.x, r.y, r.r); c.stroke(); }
      // flippers
      for (const f of g.flippers) {
        const tx = f.px + Math.cos(f.ang) * f.len, ty = f.py + Math.sin(f.ang) * f.len;
        c.lineCap = 'round';
        c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 15; c.beginPath(); c.moveTo(f.px + 2, f.py + 4); c.lineTo(tx + 2, ty + 4); c.stroke();
        c.strokeStyle = '#c8102e'; c.lineWidth = 15; c.beginPath(); c.moveTo(f.px, f.py); c.lineTo(tx, ty); c.stroke();
        c.strokeStyle = '#f3efe4'; c.lineWidth = 10; c.beginPath(); c.moveTo(f.px, f.py); c.lineTo(tx, ty); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(f.px - 1, f.py - 2.5); c.lineTo(tx - 1, ty - 2.5); c.stroke();
        c.fillStyle = '#9db0d4'; circle(f.px, f.py, 5); c.fill(); c.fillStyle = '#2a3350'; circle(f.px, f.py, 2); c.fill();
      }
      // plunger power bar
      c.fillStyle = '#0a0f2e'; c.fillRect(373, 632, 36, 7);
      const pg = c.createLinearGradient(374, 0, 408, 0); pg.addColorStop(0, '#6cf096'); pg.addColorStop(0.6, '#ffd56b'); pg.addColorStop(1, '#ff4d4d');
      c.fillStyle = pg; c.fillRect(374, 633, 34 * S.charge, 5);
      // ball under the ramps, ramps and loops, ball on top of them when it is riding
      const riding = !!S.ride;
      if (!riding && !S.hold) drawBall(S.ball, 0);
      c.drawImage(LANES, 0, 0, W, H);
      if (riding) drawBall(S.ball, 14);
      if (S.hold) add('green', E.geo.saucer.x, E.geo.saucer.y, 26, 0.9);
      for (const p of parts) add(p.c, p.x, p.y, p.s * Math.max(0.2, p.life / p.max), Math.min(1, p.life * 2.2));
      c.drawImage(VIG, 0, 0, W, H);
      if (flash > 0) { c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(${flashRGB},${(flash * 0.1 * (0.6 + 0.4 * Math.sin(t * 13))).toFixed(3)})`; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
      if (S.state === 'launch' && S.charge === 0 && !S.pulling) { c.font = '600 11px "Segoe UI", system-ui, sans-serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(207,232,255,.85)'; c.fillText('Hold SPACE to launch', 190, 508); }
      cx = ctx;
    }

    function drawCabinet() {          // dark side panels fill the corners left by the tilted table
      const a = SLICES[0], z = SLICES[NS - 1];
      const edge = (x1, x2) => { ctx.strokeStyle = '#8da3cc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x1, HDR); ctx.lineTo(x2, HDR + H); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 0.8; ctx.stroke(); };
      let g = ctx.createLinearGradient(0, HDR, 0, HDR + H); g.addColorStop(0, '#05070f'); g.addColorStop(1, '#1a2350');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(0, HDR); ctx.lineTo(a.dx, HDR); ctx.lineTo(z.dx, HDR + H); ctx.lineTo(0, HDR + H); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W, HDR); ctx.lineTo(W - a.dx, HDR); ctx.lineTo(W - z.dx, HDR + H); ctx.lineTo(W, HDR + H); ctx.closePath(); ctx.fill();
      edge(a.dx, z.dx); edge(W - a.dx, W - z.dx);
    }

    function draw(msg, now) {
      const S = E.S;
      ctx.setTransform(SC, 0, 0, SC, 0, 0);
      ctx.fillStyle = '#02030a'; ctx.fillRect(0, 0, W, CH);
      drawBackbox(now);
      drawCabinet();
      drawTable();
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
      ctx.beginPath(); ctx.rect(0, HDR, W, H); ctx.clip();
      for (let i = 0; i < NS; i++) { const o = SLICES[i]; ctx.drawImage(tbl, 0, i * SLH * SC, W * SC, SLH * SC, o.dx, HDR + o.dy, o.dw, o.dh + 0.6); }
      ctx.restore();
      if (S.state === 'over' || msg) {
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, HDR, W, H);
        ctx.font = '700 26px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd56b';
        ctx.fillText(msg || 'GAME OVER', W / 2, HDR + 300);
        if (!msg) { ctx.font = '600 15px "Segoe UI", system-ui, sans-serif'; ctx.fillStyle = '#cfe8ff'; ctx.fillText('Score ' + fmt(S.score), W / 2, HDR + 332); ctx.fillText('Press Enter or click to play again', W / 2, HDR + 360); }
      }
    }

    /* ---------- main loop ---------- */
    function frame(nowMs) {
      if (!node.isConnected) { cancelAnimationFrame(raf); return; }
      const dt = Math.min((nowMs - last) / 1000, 0.05); last = nowMs; t += dt;
      const act = active();
      if (!act) { flip('L', false); flip('R', false); E.S.pulling = false; E.S.charge = 0; }
      else if (!paused) {
        E.step(dt);
        const p = E.S.ball;
        trail.push({ x: p.x, y: p.y }); if (trail.length > 9) trail.shift();
        if (Math.hypot(p.vx, p.vy) < 250) trail.length = 0;
      }
      for (const k of E.S.events.splice(0)) {
        play(k);
        if (k === 'over') { localStorage.setItem('pinball.hi', E.S.hi); say('GAME OVER', '', 2500); }
      }
      for (const f of E.S.fx.splice(0)) if (FX[f.k]) FX[f.k](f);
      shown += (E.S.score - shown) * Math.min(1, dt * 9); if (Math.abs(E.S.score - shown) < 1) shown = E.S.score;
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt; p.life -= dt; }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
      for (const r of rings) { r.r += 90 * dt; r.life -= dt; }
      for (let i = rings.length - 1; i >= 0; i--) if (rings[i].life <= 0) rings.splice(i, 1);
      shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt * 0.7);
      draw(act && !paused ? '' : 'PAUSED', nowMs);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  };
})();
