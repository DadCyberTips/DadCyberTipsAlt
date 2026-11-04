/**
 * Nova Strike pinball window, early-2000s rendered-3D look.
 * The table (art from pinball-art.js, physics from pinball-engine.js) is drawn flat,
 * warped onto a steep perspective below a lit backbox, given a glass sheen, and shown
 * with a glossy score panel on the right. Everything renders at 2x (A.SC).
 *
 * Controls: Left Arrow / Z = left flipper, Right Arrow / M or / = right flipper,
 * hold Space to pull the plunger and release to launch, Enter = new game, P = pause.
 * Touch/mouse: left half of the table = left flipper, right half = right flipper,
 * press and hold the launch lane (bottom right) to pull the plunger.
 */
(function() {
  const { createEngine, W, H } = window.PinballEngine;
  const A = window.PinballArt;
  const PANEL = 200, CW = W + PANEL, CH = H, TAU = Math.PI * 2, SC = A.SC;
  const TOP = 92;                                // backbox + back wall above the tilted table
  const NS = 220, SLH = H / NS, S_TOP = 0.5, DEPTH = 1.7;   // far rows are narrower (S_TOP) and squashed harder (DEPTH)
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const RGB = { gold: '255,213,107', cyan: '76,194,255', pink: '255,95,168', green: '108,240,150', white: '255,255,255' };
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

  // perspective slices, shared by drawing and pointer mapping
  const SLICES = [];
  (() => {
    let sum = 0;
    for (let i = 0; i < NS; i++) { const s = S_TOP + (1 - S_TOP) * (i + 0.5) / NS; SLICES.push({ s }); sum += SLH * Math.pow(s, DEPTH); }
    const k = (H - TOP) / sum; let y = TOP;
    SLICES.forEach(o => { o.dh = SLH * Math.pow(o.s, DEPTH) * k; o.dy = y; y += o.dh; o.dw = W * o.s; o.dx = (W - o.dw) / 2; });
  })();
  const toTable = (sx, sy) => {                  // screen point -> flat table point
    let i = SLICES.findIndex(o => sy < o.dy + o.dh); if (i < 0) i = NS - 1;
    if (sy < TOP) return [-1, -1];
    const o = SLICES[i], f = (sy - o.dy) / o.dh;
    return [(sx - o.dx) / o.dw * W, (i + f) * SLH];
  };

  /* ---------- 7-segment digits for the score ---------- */
  const DIG = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'];
  function seg7(c, x, y, w, h, d) {
    const t = 3, on = d === null ? '' : DIG[d], hh = h / 2;
    const S = { a: [x + t, y, w - 2 * t, t], d: [x + t, y + h - t, w - 2 * t, t], g: [x + t, y + hh - t / 2, w - 2 * t, t],
      f: [x, y + t, t, hh - t], b: [x + w - t, y + t, t, hh - t], e: [x, y + hh, t, hh - t], c: [x + w - t, y + hh, t, hh - t] };
    for (const k in S) { c.fillStyle = on.includes(k) ? '#6ff0ff' : '#0c2a3a'; c.fillRect(...S[k]); }
  }
  const rrect = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  function glassBox(c, x, y, w, h) {             // dark glass display with a chrome rim and a gloss highlight on the top half
    rrect(c, x - 2, y - 2, w + 4, h + 4, 7); let g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#e8ecf8'); g.addColorStop(1, '#5a6080'); c.fillStyle = g; c.fill();
    rrect(c, x, y, w, h, 6); g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#0a1a3a'); g.addColorStop(1, '#020812'); c.fillStyle = g; c.fill();
    rrect(c, x + 2, y + 2, w - 4, h * 0.45, 5); g = c.createLinearGradient(0, y, 0, y + h * 0.45); g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(1, 'rgba(255,255,255,.02)'); c.fillStyle = g; c.fill();
  }

  function buildPanel() {
    const [c, x] = A.mk(PANEL, CH);
    let g = x.createLinearGradient(0, 0, PANEL, 0); g.addColorStop(0, '#1a2240'); g.addColorStop(0.5, '#2c3a6a'); g.addColorStop(1, '#141a32');
    x.fillStyle = g; x.fillRect(0, 0, PANEL, CH);
    for (let y = 0; y < CH; y += 2) { x.fillStyle = `rgba(255,255,255,${(y * 7919 % 13) / 400})`; x.fillRect(0, y, PANEL, 1); }   // brushed metal
    x.fillStyle = '#8a94b8'; x.fillRect(0, 0, 2, CH);
    // logo plate
    glassBox(x, 8, 8, PANEL - 16, 112);
    let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 40; i++) { x.fillStyle = '#c8d8ff'; x.fillRect(12 + rnd() * (PANEL - 24), 12 + rnd() * 104, 1, 1); }
    const pg = x.createRadialGradient(150, 40, 2, 160, 50, 30); pg.addColorStop(0, '#ffd0a0'); pg.addColorStop(0.5, '#d0388a'); pg.addColorStop(1, '#3a0a40');
    x.fillStyle = pg; x.beginPath(); x.arc(160, 50, 26, 0, TAU); x.fill();
    A.chromeText(x, 'NOVA', PANEL / 2 - 8, 46, 34); A.chromeText(x, 'STRIKE', PANEL / 2, 88, 30);
    // labels and display boxes
    x.font = '700 10px Verdana, Tahoma, sans-serif'; x.textBaseline = 'top';
    [['SCORE', 128, 50], ['MESSAGES', 236, 72], ['MISSION', 330, 72], ['BONUS MULTIPLIER', 424, 30], ['HIGH SCORE', 474, 30], ['CONTROLS', 520, 76]].forEach(([t, y, h]) => {
      x.fillStyle = '#9fc8ff'; x.fillText(t, 12, y); glassBox(x, 9, y + 13, PANEL - 18, h);
    });
    x.font = '10px Verdana, Tahoma, sans-serif'; x.fillStyle = '#9fb0d8';
    ['Z / ←   Left flipper', 'M / →   Right flipper', 'SPACE   Hold to launch', 'P   Pause   ENTER   New game'].forEach((t, i) => x.fillText(t, 16, 540 + i * 16));
    return c;
  }

  function buildBackbox() {                      // lit sign behind the far end of the table
    const [c, x] = A.mk(W, TOP + 30);
    let g = x.createLinearGradient(0, 0, 0, TOP); g.addColorStop(0, '#0a0c18'); g.addColorStop(1, '#262c48');
    x.fillStyle = g; x.fillRect(0, 0, W, TOP + 30);
    const a = SLICES[0];
    rrect(x, a.dx + 6, 8, a.dw - 12, TOP - 26, 10); g = x.createLinearGradient(0, 8, 0, TOP - 18); g.addColorStop(0, '#2a1060'); g.addColorStop(0.5, '#6a2aa0'); g.addColorStop(1, '#14306a');
    x.fillStyle = g; x.fill(); x.strokeStyle = '#c8d0ec'; x.lineWidth = 2; x.stroke();
    for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(255,255,255,.8)'; x.fillRect(a.dx + 12 + (i * 97 % (a.dw - 24)), 12 + (i * 53 % (TOP - 34)), 1, 1); }
    A.chromeText(x, 'NOVA STRIKE', W / 2, 8 + (TOP - 26) / 2, 26);
    rrect(x, a.dx + 8, 10, a.dw - 16, (TOP - 26) * 0.45, 8); x.fillStyle = 'rgba(255,255,255,.12)'; x.fill();   // glass gloss
    // back wall of the playfield: a vertical face the table runs into
    g = x.createLinearGradient(0, TOP - 14, 0, TOP); g.addColorStop(0, '#c8d0ec'); g.addColorStop(0.3, '#5a6488'); g.addColorStop(1, '#141a32');
    x.fillStyle = g; x.fillRect(a.dx, TOP - 14, a.dw, 14);
    return c;
  }

  window.openPinball = function() {
    if (windowManager.wins.has('pinball')) { windowManager.createWindow({ key: 'pinball' }); return; }

    const node = document.createElement('div');
    node.className = 'pb';
    node.innerHTML = '<canvas class="pb-cv"></canvas>';
    const cv = node.querySelector('.pb-cv'), ctx = cv.getContext('2d');
    cv.width = CW * SC; cv.height = CH * SC; cv.style.width = CW + 'px'; cv.style.height = CH + 'px';
    windowManager.createWindow({ key: 'pinball', title: 'Nova Strike Pinball', icon: 'pinball', node, width: CW + 2, height: CH + 34, left: 200, top: 4 });

    const E = createEngine(), S = E.S, G = E.geo;
    node._engine = E;
    S.hi = +store.get('pinball.hi') || 0;
    E.newGame();

    const TABLE = A.table(W, H), RAILS = A.rails(G.segs, W, H), LANES = A.lanes(G.lanes, W, H), APRON = A.apron(W);
    const BALL = A.ball(), BUMP = [A.bumper(false), A.bumper(true)], PANELBG = buildPanel(), BACK = buildBackbox();
    const SHEEN = (() => {                   // the playfield glass: a broad diagonal reflection and a soft top highlight
      const [cn, x] = A.mk(W, H), a0 = SLICES[0], z = SLICES[NS - 1];
      x.beginPath(); x.moveTo(a0.dx, TOP); x.lineTo(W - a0.dx, TOP); x.lineTo(W - z.dx, H); x.lineTo(z.dx, H); x.closePath(); x.clip();
      let g = x.createLinearGradient(0, TOP, W, H);
      g.addColorStop(0, 'rgba(255,255,255,.10)'); g.addColorStop(0.28, 'rgba(255,255,255,0)'); g.addColorStop(0.36, 'rgba(255,255,255,.07)'); g.addColorStop(0.42, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      g = x.createLinearGradient(0, TOP, 0, TOP + 140); g.addColorStop(0, 'rgba(160,190,255,.14)'); g.addColorStop(1, 'rgba(160,190,255,0)');
      x.fillStyle = g; x.fillRect(0, TOP, W, 140);
      return cn;
    })();
    const HALO = {}; for (const k in RGB) HALO[k] = A.halo(RGB[k]);
    const [tbl, c] = A.mk(W, H);            // the table is drawn flat here, then warped onto the screen
    const keys = { L: false, R: false };
    const life = new AbortController(), on = { signal: life.signal };
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
    const arp = notes => notes.forEach((f, i) => snd('square', f, f * 1.01, 0.12, 0.08, i * 0.08));
    const SOUNDS = {
      bump: () => snd('square', 520, 780, 0.1, 0.1), sling: () => snd('sawtooth', 300, 200, 0.08, 0.08),
      target: () => snd('square', 880, 1320, 0.1, 0.09), rollover: () => snd('triangle', 660, 990, 0.08, 0.1),
      bank: () => arp([523, 659, 784, 1047]), bonus: () => arp([392, 523, 659, 784, 1047]), saved: () => arp([784, 659, 523]),
      launch: () => snd('sawtooth', 160, 700, 0.35, 0.09), drain: () => snd('triangle', 420, 70, 0.7, 0.13),
      over: () => snd('triangle', 300, 60, 1.2, 0.14), flip: () => snd('triangle', 180, 90, 0.05, 0.09),
      orbit: () => snd('sawtooth', 220, 900, 0.45, 0.08), ramp: () => { snd('sawtooth', 160, 1100, 0.5, 0.09); snd('square', 400, 1600, 0.5, 0.05); },
      spin: () => snd('square', 1400, 1100, 0.025, 0.04), saucer: () => snd('triangle', 200, 80, 0.2, 0.15), eject: () => snd('sawtooth', 120, 600, 0.18, 0.1),
      drop: () => snd('square', 300, 140, 0.07, 0.1), dropbank: () => arp([392, 523, 784]), mission: () => arp([523, 659, 784, 1047, 1319]),
      wizard: () => arp([262, 330, 392, 523, 659, 784, 1047])
    };
    const lastSnd = {};
    const play = k => { const n = performance.now(); if (!SOUNDS[k] || n - (lastSnd[k] || 0) < (k === 'spin' ? 70 : 25)) return; lastSnd[k] = n; SOUNDS[k](); };

    /* ---------- input (listeners are removed when the window closes) ---------- */
    const win = () => windowManager.wins.get('pinball');
    const active = () => node.isConnected && windowManager.order[windowManager.order.length - 1] === 'pinball' && !win().min;
    const flip = (side, down) => { if (keys[side] === down) return; keys[side] = down; E.setFlipper(side, down); if (down) play('flip'); };
    const isL = k => k === 'ArrowLeft' || k === 'z' || k === 'Z', isR = k => k === 'ArrowRight' || k === '/' || k === 'm' || k === 'M';
    document.addEventListener('keydown', e => {
      if (!active() || (e.target.closest && e.target.closest('input,textarea'))) return;
      const k = e.key;
      if (isL(k)) { e.preventDefault(); flip('L', true); }
      else if (isR(k)) { e.preventDefault(); flip('R', true); }
      else if (k === ' ') { e.preventDefault(); E.pull(true); }
      else if (k === 'Enter' && S.state === 'over') E.newGame();
      else if (k === 'p' || k === 'P') paused = !paused;
    }, on);
    document.addEventListener('keyup', e => {
      const k = e.key;
      if (isL(k)) flip('L', false); else if (isR(k)) flip('R', false); else if (k === ' ' && S.pulling) E.pull(false);
    }, on);
    const pts = new Map();
    cv.addEventListener('pointerdown', e => {
      if (S.state === 'over') { E.newGame(); return; }
      const r = cv.getBoundingClientRect(), sx = (e.clientX - r.left) / r.width * CW, sy = (e.clientY - r.top) / r.height * CH;
      if (sx >= W) return;                                   // the score panel is not a control
      const [x, y] = toTable(sx, sy), role = x > 372 && y > 480 ? 'P' : x < W / 2 ? 'L' : 'R';
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

    /* ---------- messages shown in the panel ---------- */
    let cur = null, queue = [], shown = 0;
    const say = (a, b = '', ms = 1400) => { cur = { a, b, until: performance.now() + ms }; queue = []; };
    const sayQ = (a, b = '', ms = 1400) => { queue.push({ a, b, ms }); };
    const fmt = n => Math.round(n).toLocaleString('en-US');

    /* ---------- effects: lamp flashes and a few sparks, no modern glow ---------- */
    const sparks = [];
    let shake = 0, flash = 0, flashRGB = RGB.gold, bumpTimes = [];
    const burst = (x, y, n, col, sp = 140) => {
      for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (0.3 + Math.random()); sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.35 + Math.random() * 0.3, c: col }); }
      if (sparks.length > 200) sparks.splice(0, sparks.length - 200);
    };
    const FX = {
      bump: f => { burst(f.x, f.y, 6, 'cyan');
        const n = performance.now(); bumpTimes = bumpTimes.filter(v => n - v < 2000); bumpTimes.push(n); if (bumpTimes.length >= 5 && bumpTimes.length % 5 === 0) say('BUMPER FRENZY', 'x' + bumpTimes.length, 1000); },
      sling: f => { burst(f.x, f.y, 5, 'pink', 160); if (!reduce) shake = 0.1; },
      target: f => { burst(f.x, f.y, 6, 'gold'); say('TARGET HIT', '+250', 700); },
      rollover: f => burst(f.x, f.y, 4, 'gold', 90),
      bank: f => { burst(f.x, f.y, 20, 'gold', 200); flash = 1; flashRGB = RGB.gold; if (!reduce) shake = 0.18; say('TARGETS CLEARED', '+5,000', 1600); },
      bonus: () => { flash = 1; flashRGB = RGB.cyan; say('MULTIPLIER', S.mult + 'X', 1800); },
      launch: f => burst(f.x, f.y, 6, 'white', 100),
      saved: f => { burst(f.x, f.y, 12, 'green', 160); say('BALL SAVED', 'SHOOT AGAIN', 1500); },
      drain: () => say('BALL LOST', '', 1100),
      orbit: f => { burst(f.x, f.y, 8, 'cyan', 180); say('ORBIT', '+500', 800); },
      ramp: f => { burst(f.x, f.y, 10, 'gold', 200); say('SKYWAY', '+1,500', 900); },
      spin: f => burst(f.x, f.y + 8, 2, 'white', 80),
      saucer: f => { burst(f.x, f.y, 10, 'green', 140); say('DOCKING', '+1,000', 1000); },
      eject: f => burst(f.x + 10, f.y, 8, 'green', 200),
      drop: f => burst(f.x, f.y, 4, 'cyan', 100),
      dropbank: f => { burst(f.x, f.y, 14, 'gold', 180); say('SHIELDS DOWN', '+2,000', 1200); },
      mission: () => { flash = 1; flashRGB = RGB.gold; if (!reduce) shake = 0.18;
        say('MISSION COMPLETE', '+' + fmt(S.lastReward), 1700); sayQ('RANK UP', G.ranks[S.rank], 1700); sayQ('NEXT MISSION', S.mission.hint, 1900); },
      wizard: () => { flash = 1; flashRGB = RGB.pink; say('WARP MODE', 'x2 FOR 20 SEC', 2200); }
    };

    /* ---------- drawing the table (flat) ---------- */
    const circle = (x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
    const glow = (name, x, y, size, a) => { c.globalCompositeOperation = 'lighter'; c.globalAlpha = a; c.drawImage(HALO[name], x - size / 2, y - size / 2, size, size); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; };
    // a lamp insert set into the playfield: dark coloured plastic when off, bright with light spill when on
    const insert = (shape, on, col, offCol) => { c.fillStyle = on ? col : offCol; shape(); c.fill(); c.strokeStyle = '#000'; c.lineWidth = 1; c.stroke(); };
    const arrow = (x, y, ang, lit, col, sz = 1) => {
      insert(() => { c.save(); c.translate(x, y); c.rotate(ang); c.scale(sz, sz); c.beginPath(); c.moveTo(9, 0); c.lineTo(-6, -7); c.lineTo(-6, 7); c.closePath(); c.restore(); },
        lit, col === 'gold' ? '#ffd56b' : '#7ad4ff', col === 'gold' ? '#4a3510' : '#14305a');
      if (lit) glow(col, x, y, 34 * sz, 0.7);
    };
    const drawBall = (b, h) => {       // h = how high above the playfield the ball is (ramps)
      c.fillStyle = `rgba(0,0,20,${0.5 - h * 0.012})`; c.beginPath(); c.ellipse(b.x + 4 + h * 0.5, b.y + 7 + h * 1.1, 8 + h * 0.15, 6, 0, 0, TAU); c.fill();
      const s = 20 + h * 0.4; c.drawImage(BALL, b.x - s / 2, b.y - h - s / 2, s, s);
    };

    function drawTable() {
      const m = S.mission.key, blink = Math.floor(t * 4) % 2 === 0;
      c.drawImage(TABLE, 0, 0, W, H);
      const speed = flash > 0 ? 20 : 8;

      // chasing lamps along the arch
      for (let i = 0; i < 28; i++) {
        const a = Math.PI + 0.12 + (Math.PI - 0.24) * i / 27, x = 210 + 186 * Math.cos(a), y = 210 + 186 * Math.sin(a), lit = (i + Math.floor(t * speed)) % 4 === 0;
        insert(() => circle(x, y, 3.5), lit, '#ffe28a', '#3a2c10');
        if (lit) glow('gold', x, y, 20, 0.6);
      }
      // lead-in arrows toward the flippers
      for (let i = 0; i < 3; i++) {
        const lit = Math.floor(t * 5) % 3 === i, f = 0.22 + i * 0.26, x = 10 + 105 * f, y = 490 + 60 * f - 14;
        arrow(x + 8, y, 0.52, lit, 'cyan'); arrow(382 - x - 8, y, Math.PI - 0.52, lit, 'cyan');
      }
      // shot arrows: the shot the current mission wants flashes gold
      [['orbit', 40, 372], ['orbit', 342, 372], ['ramp', 190, 432]].forEach(([k, x, y]) => arrow(x, y, -Math.PI / 2, m === k ? blink : Math.floor(t * 3 + x) % 3 === 0, m === k ? 'gold' : 'cyan', 1.25));
      arrow(291, 194, -Math.PI / 2, m === 'spin' && blink, 'gold', 1.1);
      arrow(86, 262, Math.PI, m === 'saucer' && blink, 'gold', 1.1);
      arrow(300, 348, Math.PI / 2, m === 'drop' && blink, 'gold', 1.1);
      // mission lamps (six) and multiplier inserts
      for (let i = 0; i < 6; i++) {
        const x = [108, 134, 160, 236, 262, 288][i], done = i < S.mi, now = i === S.mi;
        insert(() => circle(x, 302, 6.5), done || (now && blink), done ? '#ffd56b' : '#7ad4ff', '#1a2350');
        if (done) glow('gold', x, 302, 26, 0.55); else if (now && blink) glow('cyan', x, 302, 26, 0.6);
      }
      c.font = '900 9px "Arial Black", "Segoe UI", sans-serif'; c.textAlign = 'center';
      [2, 3, 4, 5].forEach((n, i) => {
        const x = 62 + i * 33, lit = S.mult >= n;
        insert(() => { c.beginPath(); c.rect(x - 14, 336, 28, 15); }, lit, '#ffb630', '#3a2a10');
        c.fillStyle = lit ? '#3a2400' : '#8a7040'; c.fillText(n + 'X', x, 347);
        if (lit) glow('gold', x, 343, 44, 0.5);
      });
      // rollover stars
      for (const s of G.sensors) { insert(() => A.star(c, s.x, s.y, 9.5, 4.2), s.lit, '#ffd56b', '#3a3060'); if (s.lit) glow('gold', s.x, s.y, 36, 0.7); }

      c.drawImage(RAILS, 0, 0, W, H);

      // slingshots: solid plastic with bevelled edges and a rubber kicker
      const slings = G.segs.filter(s => s.sling);
      const tri = (P, hit) => {
        c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); P.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](p[0] + 3, p[1] + 6)); c.closePath(); c.fill();
        c.fillStyle = '#7a1848'; c.beginPath(); P.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](p[0], p[1] + 4)); c.closePath(); c.fill();
        c.fillStyle = hit ? '#ffd0e8' : '#e0488c'; c.beginPath(); P.forEach((p, i) => c[i ? 'lineTo' : 'moveTo'](...p)); c.closePath(); c.fill();
        c.strokeStyle = '#ffa0c8'; c.lineWidth = 1; c.stroke();
      };
      tri([[52, 420], [52, 482], [98, 482]], slings[0] && slings[0].hit > 0); tri([[330, 420], [330, 482], [284, 482]], slings[1] && slings[1].hit > 0);
      c.lineCap = 'round';
      for (const s of slings) {
        c.strokeStyle = '#000'; c.lineWidth = 6; c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke();
        c.strokeStyle = s.hit > 0 ? '#ffffff' : '#f4f0e0'; c.lineWidth = 4; c.stroke();
        if (s.hit > 0) glow('pink', (s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, 60, 0.8);
      }
      // gate and standup targets
      for (const s of G.segs) {
        if (s.gate) { c.strokeStyle = '#000'; c.lineWidth = 4; c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke(); c.strokeStyle = '#d8ddef'; c.lineWidth = 2; c.stroke(); }
        else if (s.target) {
          const hot = s.hit > 0;
          c.strokeStyle = '#000'; c.lineWidth = 8; c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke();
          c.strokeStyle = hot ? '#fff' : s.lit ? '#ffd56b' : '#c03030'; c.lineWidth = 6; c.stroke();
          c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(s.x1 - 1.5, s.y1 + 2); c.lineTo(s.x2 - 1.5, s.y2 - 2); c.stroke();
          if (s.lit || hot) glow('gold', (s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2, 40, hot ? 0.9 : 0.45);
        }
      }
      // drop targets: raised blocks with a visible side face, sink flat when hit
      for (const d of G.drops) {
        const len = d.y2 - d.y1;
        if (d.down) { c.fillStyle = '#05071a'; c.fillRect(d.x1 - 5, d.y1 + len / 2 - 2, 10, 4); continue; }
        c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(d.x1 - 2, d.y1 + 5, 10, len);
        c.fillStyle = '#806010'; c.fillRect(d.x1 - 5, d.y1 + 3, 10, len);
        c.fillStyle = d.hit > 0 ? '#fff' : (m === 'drop' && blink ? '#fff0a0' : '#ffc030'); c.fillRect(d.x1 - 5, d.y1, 10, len - 2);
        c.fillStyle = '#fff8d0'; c.fillRect(d.x1 - 5, d.y1, 10, 1);
      }
      // spinner flag on two posts
      const sp = G.spinner, th = 1.5 + 9 * Math.abs(Math.sin(sp.ang));
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(sp.x1 + 3, sp.y1 - th / 2 + 6, sp.x2 - sp.x1, th);
      c.fillStyle = '#9aa2c0'; c.fillRect(sp.x1 - 4, sp.y1 - 3, 5, 9); c.fillRect(sp.x2 - 1, sp.y1 - 3, 5, 9);
      c.fillStyle = Math.sin(sp.ang) > 0 ? '#e8ecf8' : '#7a84a8'; c.fillRect(sp.x1, sp.y1 - th / 2, sp.x2 - sp.x1, th);
      // kick-out saucer
      const sc = G.saucer, hot = S.hold || (m === 'saucer' && blink);
      c.fillStyle = '#9aa2c0'; circle(sc.x, sc.y, sc.r + 4); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(sc.x, sc.y, sc.r + 4, Math.PI, Math.PI * 1.5); c.lineWidth = 1; c.strokeStyle = '#fff'; c.stroke();
      c.fillStyle = '#000'; circle(sc.x, sc.y, sc.r - 1); c.fill();
      for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + t * (S.hold ? 4 : 0.6); insert(() => circle(sc.x + Math.cos(a) * (sc.r + 1), sc.y + Math.sin(a) * (sc.r + 1), 1.8), hot, '#6cf096', '#1a3a2a'); }
      if (hot) glow('green', sc.x, sc.y, 50, S.hold ? 0.8 : 0.45);
      // pop bumpers
      for (const b of G.bumpers) { c.drawImage(BUMP[b.lit > 0 ? 1 : 0], b.x - 30, b.y - 44, 60, 72); if (b.lit > 0) glow('gold', b.x, b.y, 80, 0.7); }
      // flippers: white plastic bat, red rubber, bevel highlight, steel pivot
      for (const f of G.flippers) {
        const tx = f.px + Math.cos(f.ang) * f.len, ty = f.py + Math.sin(f.ang) * f.len;
        const line = (col, w, dx = 0, dy = 0) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(f.px + dx, f.py + dy); c.lineTo(tx + dx, ty + dy); c.stroke(); };
        line('rgba(0,0,0,.6)', 15, 3, 6); line('#8a8478', 15, 0, 3); line('#c01828', 15); line('#f4f0e4', 10); line('#ffffff', 2, -1, -3);
        c.fillStyle = '#9aa2c0'; circle(f.px, f.py, 5); c.fill(); c.fillStyle = '#2a3050'; circle(f.px, f.py, 2); c.fill();
      }
      // ball under the ramps, the ramp plastics, then the ball on top while it rides one
      if (!S.ride && !S.hold) drawBall(S.ball, 0);
      c.drawImage(LANES, 0, 0, W, H);
      if (S.ride) drawBall(S.ball, 22);
      // apron over the drain, plunger in the launch lane
      c.drawImage(APRON, 0, 600, W, 40);
      const py = 626 + S.charge * 12;
      c.fillStyle = '#3a4060'; c.fillRect(388, py, 6, 640 - py + 4); c.fillStyle = '#c0c6dc'; c.fillRect(389, py, 2, 640 - py);
      c.fillStyle = '#c01828'; c.fillRect(380, py - 4, 22, 5); c.fillStyle = '#ff6070'; c.fillRect(380, py - 4, 22, 1);
      for (const p of sparks) glow(p.c, p.x, p.y, 10 * Math.max(0.3, p.life / 0.6), Math.min(1, p.life * 2.5));
      if (flash > 0) { c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(${flashRGB},${(flash * 0.12).toFixed(3)})`; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
    }

    /* ---------- cabinet sides, the warp, and the panel ---------- */
    function drawCabinet() {
      const a = SLICES[0], z = SLICES[NS - 1];
      const side = flipX => {
        const X = v => flipX ? W - v : v;
        const g = ctx.createLinearGradient(flipX ? W : 0, 0, flipX ? W - a.dx : a.dx, 0); g.addColorStop(0, '#0c0e1a'); g.addColorStop(0.75, '#2a3050'); g.addColorStop(1, '#5a6488');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(X(0), TOP - 14); ctx.lineTo(X(a.dx), TOP - 14); ctx.lineTo(X(z.dx), H); ctx.lineTo(X(0), H); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#c0c6dc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(a.dx), TOP - 14); ctx.lineTo(X(z.dx), H); ctx.stroke();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(a.dx + (flipX ? -2 : 2)), TOP); ctx.lineTo(X(z.dx + (flipX ? -2 : 2)), H); ctx.stroke();
      };
      side(false); side(true);
    }
    function drawPanel(now) {
      const X = W;
      ctx.drawImage(PANELBG, X, 0, PANEL, CH);
      // score
      const digits = String(Math.round(shown)).padStart(9, ' ').slice(-9);
      for (let i = 0; i < 9; i++) seg7(ctx, X + 13 + i * 20, 147, 15, 28, digits[i] === ' ' ? null : +digits[i]);
      ctx.font = '700 11px Verdana, sans-serif'; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      ctx.fillStyle = '#e0e8ff'; ctx.font = '700 11px Verdana, sans-serif'; ctx.fillText(`BALL ${Math.min(S.ballNo, 3)}`, X + 12, 196); ctx.fillText(`PLAYER 1`, X + 112, 196);
      ctx.fillStyle = '#ffd56b'; ctx.fillText(`RANK  ${G.ranks[S.rank]}`, X + 12, 213);
      // messages
      if (cur && now >= cur.until && queue.length) { const q = queue.shift(); cur = { a: q.a, b: q.b, until: now + q.ms }; }
      let l1, l2 = '';
      const blink = Math.floor(now / 450) % 2 === 1;
      if (cur && now < cur.until) { l1 = cur.a; l2 = cur.b; }
      else if (S.state === 'over') { l1 = 'GAME OVER'; l2 = blink ? '' : 'PRESS ENTER'; }
      else if (paused || !active()) { l1 = 'PAUSED'; l2 = paused ? 'PRESS P' : 'CLICK TABLE'; }
      else if (S.state === 'launch') { l1 = S.charge > 0 ? 'POWER' : 'HOLD SPACE'; l2 = S.charge > 0 ? '■'.repeat(Math.round(S.charge * 12)) : (blink ? '' : 'TO LAUNCH'); }
      else if (S.wizard > 0) { l1 = 'WARP MODE x2'; l2 = Math.ceil(S.wizard) + ' SEC'; }
      ctx.fillStyle = '#6ff0ff'; ctx.font = '700 12px Verdana, sans-serif';
      if (l1) ctx.fillText(l1, X + 14, 256); if (l2) ctx.fillText(l2, X + 14, 274);
      ctx.fillStyle = '#2a7a9a'; ctx.fillText(S.ride ? '>> ON LANE' : '', X + 14, 294);
      // mission
      const ms = S.mission;
      ctx.fillStyle = '#7ad4ff'; ctx.fillText(ms.name, X + 14, 348); ctx.fillStyle = '#6ff0ff'; ctx.font = '700 10px Verdana, sans-serif'; ctx.fillText(ms.hint, X + 14, 366);
      ctx.fillStyle = '#0c2a3a'; ctx.fillRect(X + 14, 382, PANEL - 28, 8); ctx.fillStyle = '#6ff0ff'; ctx.fillRect(X + 14, 382, (PANEL - 28) * Math.min(1, ms.have / ms.need), 8);
      ctx.fillText(`${ms.have}/${ms.need}   MISSIONS ${S.done}`, X + 14, 396);
      // multiplier lamps
      for (let n = 1; n <= 5; n++) {
        const x = X + 14 + (n - 1) * 35, lit = S.mult >= n;
        ctx.fillStyle = lit ? '#6ff0ff' : '#0c2a3a'; ctx.fillRect(x, 440, 30, 22);
        ctx.fillStyle = lit ? '#000' : '#2a5a7a'; ctx.font = '900 11px "Arial Black", sans-serif'; ctx.fillText(n + 'X', x + 6, 445);
      }
      // high score
      ctx.fillStyle = '#6ff0ff'; ctx.font = '700 14px Verdana, sans-serif'; ctx.fillText(fmt(Math.max(S.hi, S.score)), X + 14, 494);
    }
    function draw(now) {
      drawTable();
      ctx.setTransform(SC, 0, 0, SC, 0, 0);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(BACK, 0, 0, W, TOP + 30);
      drawCabinet();
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
      for (let i = 0; i < NS; i++) { const o = SLICES[i]; ctx.drawImage(tbl, 0, i * SLH * SC, W * SC, SLH * SC, o.dx, o.dy, o.dw, o.dh + 0.6); }
      ctx.restore();
      ctx.drawImage(SHEEN, 0, 0, W, H);
      if (S.state === 'over' || paused) {
        ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H);
        A.chromeText(ctx, paused ? 'PAUSED' : 'GAME OVER', W / 2, 320, 30, false);
        if (!paused) { ctx.font = '700 13px Tahoma, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('Score ' + fmt(S.score) + '  -  press Enter or click', W / 2, 360); ctx.textAlign = 'left'; }
      }
      drawPanel(now);
    }

    /* ---------- main loop ---------- */
    function frame(nowMs) {
      if (!node.isConnected) { life.abort(); return; }           // window closed: stop and drop listeners
      raf = requestAnimationFrame(frame);
      const dt = Math.min((nowMs - last) / 1000, 0.05); last = nowMs;
      if (win().min) return;                                      // minimised: no simulation, no drawing
      const act = active();
      if (!act) { flip('L', false); flip('R', false); S.pulling = false; S.charge = 0; }
      else if (!paused) { t += dt; E.step(dt); }
      for (const k of S.events.splice(0)) {
        play(k);
        if (k === 'over') { store.set('pinball.hi', S.hi); say('GAME OVER', '', 2500); }
      }
      for (const f of S.fx.splice(0)) if (FX[f.k]) FX[f.k](f);
      shown += (S.score - shown) * Math.min(1, dt * 9); if (Math.abs(S.score - shown) < 1) shown = S.score;
      for (const p of sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt; p.life -= dt; }
      for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
      shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt * 0.8);
      draw(nowMs);
    }
    raf = requestAnimationFrame(frame);
  };
})();
