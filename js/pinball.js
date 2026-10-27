/**
 * Pinball window: a modern-style cabinet (dot-matrix display backbox, chrome rails, lit inserts,
 * particle effects, chrome ball with trail) drawn over the engine in pinball-engine.js.
 * Controls: Left Arrow / Z = left flipper, Right Arrow / M or / = right flipper,
 * hold Space to pull the plunger and release to launch, Enter = new game, P = pause.
 * Touch/mouse: left half = left flipper, right half = right flipper,
 * press and hold the launch lane (bottom right) to pull the plunger.
 */
(function() {
  const { createEngine, W, H } = window.PinballEngine;
  const SC = 2, HDR = 88, CH = H + HDR, VIEW = 0.92, DW = 128, DH = 24, TAU = Math.PI * 2;
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ---------- small drawing helpers and pre-rendered sprites ---------- */
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
  (() => { const g = vx.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 420); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.5)'); vx.fillStyle = g; vx.fillRect(0, 0, W, H); })();

  function buildTable() {
    const [c, b] = mk(W, H);
    let g = b.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b2275'); g.addColorStop(0.5, '#0c1040'); g.addColorStop(1, '#070924');
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    [[300, 250, 190, '150,70,220', 0.32], [90, 420, 150, '40,140,255', 0.25], [200, 560, 160, '255,60,140', 0.12]].forEach(([x, y, r, rgb, a]) => {
      const n = b.createRadialGradient(x, y, 5, x, y, r); n.addColorStop(0, `rgba(${rgb},${a})`); n.addColorStop(1, `rgba(${rgb},0)`); b.fillStyle = n; b.fillRect(0, 0, W, H);
    });
    b.strokeStyle = 'rgba(120,170,255,.07)'; b.lineWidth = 1;
    for (let x = 0; x <= W; x += 30) { b.beginPath(); b.moveTo(x, 0); b.lineTo(x, H); b.stroke(); }
    for (let y = 0; y <= H; y += 30) { b.beginPath(); b.moveTo(0, y); b.lineTo(W, y); b.stroke(); }
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 110; i++) { b.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.6})`; const s = rnd() < 0.12 ? 1.8 : 0.9; b.fillRect(rnd() * W, rnd() * H, s, s); }
    // ringed planet: back of the ring, the planet, then the front of the ring
    const ring = (a0, a1, w) => { b.strokeStyle = 'rgba(255,213,107,.6)'; b.lineWidth = w; b.beginPath(); b.ellipse(95, 372, 80, 16, -0.35, a0, a1); b.stroke(); };
    ring(Math.PI, TAU, 3);
    g = b.createRadialGradient(80, 355, 3, 95, 372, 50); g.addColorStop(0, '#9fe0ff'); g.addColorStop(0.5, '#2a62d0'); g.addColorStop(1, '#0a1850');
    b.fillStyle = g; b.beginPath(); b.arc(95, 372, 46, 0, TAU); b.fill();
    b.save(); b.beginPath(); b.arc(95, 372, 46, 0, TAU); b.clip();
    b.fillStyle = 'rgba(255,255,255,.07)'; [[352, 6], [366, 9], [384, 5]].forEach(([y, h]) => b.fillRect(40, y, 110, h)); b.restore();
    ring(0, Math.PI, 3.5);
    // orbit lanes painted under the arch
    b.setLineDash([9, 7]);
    [168, 148].forEach((r, i) => { b.strokeStyle = i ? 'rgba(255,95,168,.22)' : 'rgba(76,194,255,.26)'; b.lineWidth = 2; b.beginPath(); b.arc(210, 210, r, Math.PI + 0.18, TAU - 0.18); b.stroke(); });
    b.setLineDash([]);
    b.font = 'italic 800 30px "Segoe UI", system-ui, sans-serif'; b.textAlign = 'center'; b.fillStyle = 'rgba(130,205,255,.16)'; b.fillText('NOVA STRIKE', 191, 392);
    // launch lane
    g = b.createLinearGradient(372, 0, 410, 0); g.addColorStop(0, 'rgba(10,14,46,.9)'); g.addColorStop(1, 'rgba(30,40,100,.7)');
    b.fillStyle = g; b.fillRect(372, 244, 38, 396);
    b.strokeStyle = 'rgba(255,213,107,.35)'; b.lineWidth = 2.5;
    [330, 385, 440].forEach(y => { b.beginPath(); b.moveTo(382, y + 8); b.lineTo(391, y - 2); b.lineTo(400, y + 8); b.stroke(); });
    return c;
  }
  function buildRails(E) {
    const [c, r] = mk(W, H);
    const plain = E.geo.segs.filter(s => !s.target && !s.sling && !s.rubber && !s.gate);
    const pass = (col, w, dx = 0, dy = 0) => { r.strokeStyle = col; r.lineWidth = w; r.beginPath(); plain.forEach(s => { r.moveTo(s.x1 + dx, s.y1 + dy); r.lineTo(s.x2 + dx, s.y2 + dy); }); r.stroke(); };
    r.lineCap = 'round'; r.lineJoin = 'round';
    pass('rgba(0,0,0,.5)', 8, 2, 3); pass('#0a0f2e', 7.5); pass('#8da3cc', 5); pass('#e6f0ff', 1.8, -0.9, -0.9);
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
    const TABLE = buildTable(), RAILS = buildRails(E);
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
      over: () => snd('triangle', 300, 60, 1.2, 0.14), flip: () => snd('triangle', 180, 90, 0.05, 0.09)
    };

    /* ---------- input ---------- */
    const active = () => node.isConnected && windowManager.order[windowManager.order.length - 1] === 'pinball' && !windowManager.wins.get('pinball').min;
    const flip = (side, down) => { if (keys[side] === down) return; keys[side] = down; E.setFlipper(side, down); if (down) SOUNDS.flip(); };
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
    const [dmd, dm] = [document.createElement('canvas'), null];
    dmd.width = DW; dmd.height = DH;
    const dctx = dmd.getContext('2d');
    let cur = null, shown = 0;
    const say = (a, b = '', ms = 1400) => { cur = { a, b, until: performance.now() + ms }; };
    const fmt = n => Math.round(n).toLocaleString('en-US');
    function dmdLines(a, b, blinkOff) {
      dctx.fillStyle = '#000'; dctx.fillRect(0, 0, DW, DH);
      dctx.fillStyle = '#ff9a1f'; dctx.textAlign = 'center'; dctx.textBaseline = 'top';
      if (blinkOff) return;
      if (!b) { dctx.font = 'bold 13px "Courier New", monospace'; dctx.fillText(a, DW / 2, 6); return; }
      dctx.font = 'bold 8px "Courier New", monospace'; dctx.fillText(a, DW / 2, 1);
      dctx.font = 'bold 13px "Courier New", monospace'; dctx.fillText(b, DW / 2, 10);
    }
    function drawBackbox(now) {
      const S = E.S;
      let g = ctx.createLinearGradient(0, 0, 0, HDR); g.addColorStop(0, '#11184a'); g.addColorStop(1, '#050716');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, HDR);
      ctx.fillStyle = '#02030a'; ctx.fillRect(6, 5, W - 12, 80);
      ctx.strokeStyle = '#4a5cae'; ctx.lineWidth = 1.5; ctx.strokeRect(6, 5, W - 12, 80);
      const blink = Math.floor(now / 450) % 2 === 1;
      if (cur && now < cur.until) dmdLines(cur.a, cur.b, false);
      else if (S.state === 'over') { const p = [['GAME OVER', ''], ['YOUR SCORE', fmt(S.score)], ['HIGH SCORE', fmt(S.hi)], ['PRESS ENTER', 'OR CLICK']][Math.floor(now / 2200) % 4]; dmdLines(p[0], p[1], false); }
      else if (S.state === 'launch') dmdLines(`BALL ${Math.min(S.ballNo, 3)}  BONUS ${S.mult}X`, S.charge > 0 ? 'POWER ' + '='.repeat(Math.round(S.charge * 10)) : 'PULL PLUNGER', S.charge === 0 && blink);
      else dmdLines(`BALL ${Math.min(S.ballNo, 3)}  BONUS ${S.mult}X`, fmt(shown), false);
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
      bump: f => { burst(f.x, f.y, 12, 'cyan'); rings.push({ x: f.x, y: f.y, r: 22, life: 0.35, c: 'cyan' });
        const n = performance.now(); bumpTimes = bumpTimes.filter(v => n - v < 2000); bumpTimes.push(n); if (bumpTimes.length >= 5 && bumpTimes.length % 5 === 0) say('BUMPER FRENZY', 'x' + bumpTimes.length, 1000); },
      sling: f => { burst(f.x, f.y, 8, 'pink', 200); if (!reduce) shake = 0.12; },
      target: f => { burst(f.x, f.y, 10, 'gold'); say('TARGET HIT', '+250', 700); },
      rollover: f => burst(f.x, f.y, 8, 'gold', 110),
      bank: f => { burst(f.x, f.y, 40, 'gold', 260); burst(f.x, f.y, 24, 'pink', 200); flash = 1; flashRGB = '255,213,107'; if (!reduce) shake = 0.2; say('MISSION COMPLETE', '+5,000', 1800); },
      bonus: () => { burst(190, 150, 50, 'cyan', 280); flash = 1; flashRGB = '76,194,255'; say('MULTIPLIER', 'x' + E.S.mult, 1800); },
      launch: f => burst(f.x, f.y, 10, 'white', 120),
      saved: f => { burst(f.x, f.y, 24, 'green', 200); say('BALL SAVED', 'SHOOT AGAIN', 1500); },
      drain: () => say('BALL LOST', '', 1100)
    };

    /* ---------- drawing the table ---------- */
    const circle = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); };
    const add = (name, x, y, size, a) => { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.drawImage(GL[name], x - size / 2, y - size / 2, size, size); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; };
    const arrow = (x, y, ang, on, col) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = on ? col : '#27325f';
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -6); ctx.lineTo(-2, 0); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.restore();
      if (on) add(col === '#ffd56b' ? 'gold' : 'cyan', x, y, 26, 0.7);
    };

    function drawTable(dt) {
      const S = E.S, g = E.geo;
      ctx.drawImage(TABLE, 0, 0, W, H);
      ctx.drawImage(RAILS, 0, 0, W, H);
      const speed = flash > 0 ? 24 : 9;

      // chasing lamps along the arch
      for (let i = 0; i < 28; i++) {
        const a = Math.PI + 0.12 + (Math.PI - 0.24) * i / 27, x = 210 + 186 * Math.cos(a), y = 210 + 186 * Math.sin(a);
        const on = (i + Math.floor(t * speed)) % 4 === 0;
        ctx.fillStyle = on ? '#ffd56b' : '#232e5c'; circle(x, y, 3); ctx.fill();
        if (on) add('gold', x, y, 18, 0.65);
      }
      // lane arrows pointing the ball toward the flippers
      for (let i = 0; i < 3; i++) {
        const on = Math.floor(t * 5) % 3 === i, f = 0.22 + i * 0.26, x = 10 + 105 * f, y = 490 + 60 * f - 14, ang = 0.52;
        arrow(x + 8, y, ang, on, '#4cc2ff'); arrow(382 - x - 8, y, Math.PI - ang, on, '#4cc2ff');
      }
      // bonus multiplier lamps
      ctx.font = '700 10px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center';
      [2, 3, 4, 5].forEach((n, i) => {
        const x = 128 + i * 36, on = S.mult >= n;
        ctx.fillStyle = on ? '#ffb630' : '#1a2350'; ctx.fillRect(x - 14, 336, 28, 15);
        ctx.strokeStyle = '#4a5cae'; ctx.lineWidth = 1; ctx.strokeRect(x - 14, 336, 28, 15);
        ctx.fillStyle = on ? '#3a2400' : '#4a5cae'; ctx.fillText(n + 'X', x, 347);
        if (on) add('gold', x, 343, 40, 0.5);
      });
      // rollover stars
      for (const s of g.sensors) {
        ctx.fillStyle = s.lit ? '#ffd56b' : '#27325f'; star(ctx, s.x, s.y, 9.5, 4.2); ctx.fill();
        ctx.strokeStyle = '#4cc2ff'; ctx.lineWidth = 1.2; ctx.stroke();
        if (s.lit) add('gold', s.x, s.y, 36, 0.8);
      }
      // slingshots: plastic, glowing rubber edge
      const tri = (A, B, C, hit) => {
        const gr = ctx.createLinearGradient(A[0], A[1], C[0], C[1]); gr.addColorStop(0, hit ? 'rgba(255,255,255,.7)' : 'rgba(255,95,168,.38)'); gr.addColorStop(1, 'rgba(120,30,90,.22)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.lineTo(...C); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,95,168,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
      };
      const slings = g.segs.filter(s => s.sling);
      tri([52, 420], [52, 482], [98, 482], slings[0] && slings[0].hit > 0); tri([330, 420], [330, 482], [284, 482], slings[1] && slings[1].hit > 0);
      ctx.lineCap = 'round';
      for (const s of slings) {
        ctx.strokeStyle = s.hit > 0 ? '#fff' : '#ff3d8b'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
        if (s.hit > 0) add('pink', (s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, 70, 0.9);
      }
      // drop-in gate and target banks
      for (const s of g.segs) {
        if (s.gate) { ctx.strokeStyle = '#ffd56b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke(); }
        else if (s.target) {
          const hot = s.hit > 0;
          ctx.strokeStyle = hot ? '#fff' : s.lit ? '#ffd56b' : '#4a5a8c'; ctx.lineWidth = 6.5; ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(s.x1 - 1.2, s.y1 + 2); ctx.lineTo(s.x2 - 1.2, s.y2 - 2); ctx.stroke();
          if (s.lit || hot) add('gold', (s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, 48, hot ? 1 : 0.55);
        }
      }
      // pop bumpers
      for (const c of g.bumpers) {
        if (c.lit > 0) add('gold', c.x, c.y, c.r * 4.2, 0.9);
        ctx.drawImage(BUMP[c.lit > 0 ? 1 : 0], c.x - 28, c.y - 28, 56, 56);
      }
      for (const r of rings) { ctx.strokeStyle = `rgba(150,225,255,${Math.max(0, r.life / 0.35)})`; ctx.lineWidth = 2.5; circle(r.x, r.y, r.r); ctx.stroke(); }
      // flippers
      for (const f of g.flippers) {
        const tx = f.px + Math.cos(f.ang) * f.len, ty = f.py + Math.sin(f.ang) * f.len;
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(f.px + 2, f.py + 4); ctx.lineTo(tx + 2, ty + 4); ctx.stroke();
        ctx.strokeStyle = '#c8102e'; ctx.lineWidth = 15; ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.strokeStyle = '#f3efe4'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(f.px - 1, f.py - 2.5); ctx.lineTo(tx - 1, ty - 2.5); ctx.stroke();
        ctx.fillStyle = '#9db0d4'; circle(f.px, f.py, 5); ctx.fill(); ctx.fillStyle = '#2a3350'; circle(f.px, f.py, 2); ctx.fill();
      }
      // plunger power bar
      ctx.fillStyle = '#0a0f2e'; ctx.fillRect(373, 632, 36, 7);
      const pg = ctx.createLinearGradient(374, 0, 408, 0); pg.addColorStop(0, '#6cf096'); pg.addColorStop(0.6, '#ffd56b'); pg.addColorStop(1, '#ff4d4d');
      ctx.fillStyle = pg; ctx.fillRect(374, 633, 34 * S.charge, 5);
      // ball: shadow, trail, chrome sphere
      const b = S.ball;
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(b.x + 3, b.y + 5, 9, 7, 0, 0, TAU); ctx.fill();
      trail.forEach((p, i) => add('white', p.x, p.y, 8 + i * 1.6, 0.04 + i * 0.012));
      ctx.drawImage(BALL, b.x - 10, b.y - 10, 20, 20);
      // sparks
      for (const p of parts) add(p.c, p.x, p.y, p.s * Math.max(0.2, p.life / p.max), Math.min(1, p.life * 2.2));
      // vignette and light-show wash
      ctx.drawImage(VIG, 0, 0, W, H);
      if (flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(${flashRGB},${(flash * 0.1 * (0.6 + 0.4 * Math.sin(t * 13))).toFixed(3)})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
      if (S.state === 'launch' && S.charge === 0 && !S.pulling) { ctx.font = '600 12px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(207,232,255,.85)'; ctx.fillText('Hold SPACE (or the lane) to launch', 190, 440); }
    }

    function draw(dt, msg, now) {
      const S = E.S;
      ctx.setTransform(SC, 0, 0, SC, 0, 0);
      ctx.fillStyle = '#02030a'; ctx.fillRect(0, 0, W, CH);
      drawBackbox(now);
      ctx.save();
      ctx.translate(shake > 0 ? (Math.random() - 0.5) * 3 : 0, HDR + (shake > 0 ? (Math.random() - 0.5) * 3 : 0));
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
      drawTable(dt);
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
        if (SOUNDS[k]) SOUNDS[k]();
        if (k === 'over') { localStorage.setItem('pinball.hi', E.S.hi); say('GAME OVER', '', 2500); }
      }
      for (const f of E.S.fx.splice(0)) if (FX[f.k]) FX[f.k](f);
      shown += (E.S.score - shown) * Math.min(1, dt * 9); if (Math.abs(E.S.score - shown) < 1) shown = E.S.score;
      for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt; p.life -= dt; }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
      for (const r of rings) { r.r += 90 * dt; r.life -= dt; }
      for (let i = rings.length - 1; i >= 0; i--) if (rings[i].life <= 0) rings.splice(i, 1);
      shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt * 0.7);
      draw(dt, act && !paused ? '' : 'PAUSED', nowMs);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  };
})();
