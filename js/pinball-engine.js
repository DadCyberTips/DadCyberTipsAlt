/**
 * Pinball physics + rules, with no drawing code (so it can be tested on its own).
 * An original table: arch, plunger lane with a one-way gate, three pop bumpers,
 * two slingshots, two flippers, two banks of standup targets, and three top rollovers.
 */
(function(root) {
  const W = 420, H = 640, R = 9, FR = 7, G = 900, DT = 1 / 240, VMAX = 1700;
  const clamp01 = t => Math.max(0, Math.min(1, t));

  function createEngine() {
    const segs = [], bumpers = [], sensors = [], flippers = [];
    const seg = (x1, y1, x2, y2, o = {}) => { const s = { x1, y1, x2, y2, e: 0.45, kick: 0, hit: 0, ...o }; segs.push(s); return s; };

    // outer walls, lane, slopes
    seg(10, 210, 10, 490); seg(410, 210, 410, 640); seg(372, 630, 410, 630, { e: 0 }); seg(372, 630, 372, 244);
    // guide rails end level with the top surface of each flipper, so the ball rolls on smoothly
    seg(10, 490, 115.3, 549.8, { e: 0.2 }); seg(372, 490, 264.7, 549.8, { e: 0.2 });
    // top arch
    for (let i = 0, px = 10, py = 210; i < 32; i++) {
      const a = Math.PI + Math.PI * (i + 1) / 32, x = 210 + 200 * Math.cos(a), y = 210 + 200 * Math.sin(a);
      seg(px, py, x, y, { e: 0.4 }); px = x; py = y;
    }
    // one-way gate at the top of the lane: balls pass going up, are deflected going down
    const gl = Math.hypot(-38, 22);
    seg(410, 222, 372, 244, { e: 0.2, gate: true, one: { nx: -22 / gl, ny: -38 / gl } });
    // slingshots (solid triangles, kicker on the slanted side)
    const sling = (A, B, C) => { seg(...A, ...C, { e: 0.6, kick: 300, sling: true }); seg(...A, ...B, { e: 0.3, rubber: true }); seg(...B, ...C, { e: 0.3, rubber: true }); };
    sling([52, 420], [52, 482], [98, 482]); sling([330, 420], [330, 482], [284, 482]);
    // standup target banks
    const banks = { L: [], R: [] };
    [[250, 278], [292, 320], [334, 362]].forEach(([a, b], i) => banks.L.push(seg(15, a, 15, b, { e: 0.3, target: 'L', idx: i, lit: false })));
    [[300, 328], [342, 370], [384, 412]].forEach(([a, b], i) => banks.R.push(seg(367, a, 367, b, { e: 0.3, target: 'R', idx: i, lit: false })));
    // bumpers, rollovers, flippers
    [[145, 215], [235, 175], [205, 258]].forEach(([x, y]) => bumpers.push({ x, y, r: 20, lit: 0, cool: 0 }));
    [[140, 70], [190, 50], [240, 70]].forEach(([x, y]) => sensors.push({ x, y, r: 14, lit: false, inside: false }));
    flippers.push({ side: 'L', px: 112, py: 556, len: 62, rest: 0.49, act: -0.49, ang: 0.49, om: 0, down: false });
    flippers.push({ side: 'R', px: 268, py: 556, len: 62, rest: Math.PI - 0.49, act: Math.PI + 0.49, ang: Math.PI - 0.49, om: 0, down: false });

    const S = { W, H, R, score: 0, hi: 0, balls: 3, ballNo: 1, mult: 1, state: 'launch', charge: 0, pulling: false,
      ball: { x: 391, y: 621, vx: 0, vy: 0 }, events: [], fx: [], t: 0, saveUntil: 0, saveAvail: true, autoAt: 0, paused: false, still: 0 };
    const ev = (e, x, y) => { S.events.push(e); if (x !== undefined) { S.fx.push({ k: e, x, y }); if (S.fx.length > 200) S.fx.shift(); } };
    const add = n => { S.score += n * S.mult; if (S.score > S.hi) S.hi = S.score; };

    function newBall() { S.ball = { x: 391, y: 621, vx: 0, vy: 0 }; S.state = 'launch'; S.charge = 0; S.still = 0; }
    function newGame() {
      S.score = 0; S.balls = 3; S.ballNo = 1; S.mult = 1; S.events.length = 0; S.fx.length = 0; S.saveUntil = 0; S.saveAvail = true; S.autoAt = 0;
      banks.L.concat(banks.R).forEach(s => { s.lit = false; }); sensors.forEach(s => { s.lit = false; s.inside = false; });
      newBall();
    }

    function collideSeg(b, s) {
      const dx = s.x2 - s.x1, dy = s.y2 - s.y1, l2 = dx * dx + dy * dy;
      const t = clamp01(((b.x - s.x1) * dx + (b.y - s.y1) * dy) / l2);
      const cx = s.x1 + t * dx, cy = s.y1 + t * dy;
      let nx = b.x - cx, ny = b.y - cy, d = Math.hypot(nx, ny);
      if (d >= R) return 0;
      if (d < 1e-6) { const l = Math.sqrt(l2); nx = -dy / l; ny = dx / l; d = 0; } else { nx /= d; ny /= d; }
      if (s.one) {
        const sd = (b.x - s.x1) * s.one.nx + (b.y - s.y1) * s.one.ny, vn0 = b.vx * s.one.nx + b.vy * s.one.ny;
        if (sd <= 0 || vn0 >= 0) return 0;
        nx = s.one.nx; ny = s.one.ny;
      }
      b.x += nx * (R - d); b.y += ny * (R - d);
      const vn = b.vx * nx + b.vy * ny;
      if (vn >= 0) return 0.001;
      const e = -vn < 40 ? 0 : s.e;
      b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
      if (s.kick && -vn > 40) { b.vx += nx * s.kick; b.vy += ny * s.kick; }
      return -vn;
    }

    function collideFlipper(b, f) {
      const dx = Math.cos(f.ang) * f.len, dy = Math.sin(f.ang) * f.len;
      const t = clamp01(((b.x - f.px) * dx + (b.y - f.py) * dy) / (f.len * f.len));
      const cx = f.px + t * dx, cy = f.py + t * dy;
      let nx = b.x - cx, ny = b.y - cy, d = Math.hypot(nx, ny);
      const rr = R + FR;
      if (d >= rr) return;
      if (d < 1e-6) { nx = 0; ny = -1; d = 0; } else { nx /= d; ny /= d; }
      b.x += nx * (rr - d); b.y += ny * (rr - d);
      const rx = cx - f.px, ry = cy - f.py, vfx = -f.om * ry, vfy = f.om * rx;
      const vn = (b.vx - vfx) * nx + (b.vy - vfy) * ny;
      if (vn < 0) { const j = -(1 + (Math.abs(f.om) > 1 ? 0.5 : 0.15)) * vn; b.vx += j * nx; b.vy += j * ny; }
    }

    function hitTarget(s) {
      if (s.lit) { add(50); return; }
      const mx = (s.x1 + s.x2) / 2, my = (s.y1 + s.y2) / 2;
      s.lit = true; add(250); ev('target', mx, my);
      const bank = banks[s.target];
      if (bank.every(x => x.lit)) { add(5000); ev('bank', mx, my); bank.forEach(x => { x.lit = false; }); }
    }

    function sub() {
      S.t += DT;
      if (S.pulling && S.state === 'launch') S.charge = Math.min(1, S.charge + DT / 1.1);
      flippers.forEach(f => {
        const old = f.ang, target = f.down ? f.act : f.rest, sp = (f.down ? 24 : 14) * DT;
        f.ang = Math.abs(target - f.ang) <= sp ? target : f.ang + Math.sign(target - f.ang) * sp;
        f.om = (f.ang - old) / DT;
      });
      bumpers.forEach(c => { c.lit = Math.max(0, c.lit - DT); c.cool = Math.max(0, c.cool - DT); });
      segs.forEach(s => { if (s.hit > 0) s.hit -= DT; });
      if (S.state === 'over') return;
      if (S.state === 'launch' && S.autoAt && S.t >= S.autoAt) { S.autoAt = 0; launch(0.88, true); }

      const b = S.ball;
      b.vy += G * DT;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > VMAX) { b.vx *= VMAX / sp; b.vy *= VMAX / sp; }
      b.x += b.vx * DT; b.y += b.vy * DT;

      for (let it = 0; it < 2; it++) {
        for (const s of segs) {
          const imp = collideSeg(b, s);
          if (imp > 60) {
            if (s.target) { hitTarget(s); s.hit = 0.15; }
            else if (s.sling && s.kick) { add(10); ev('sling', b.x, b.y); s.hit = 0.12; }
          }
        }
        flippers.forEach(f => collideFlipper(b, f));
        for (const c of bumpers) {
          const dx = b.x - c.x, dy = b.y - c.y, d = Math.hypot(dx, dy), rr = R + c.r;
          if (d >= rr) continue;
          const nx = dx / (d || 1), ny = d ? dy / d : -1;
          b.x = c.x + nx * rr; b.y = c.y + ny * rr;
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) { b.vx -= 1.6 * vn * nx; b.vy -= 1.6 * vn * ny; }
          b.vx += nx * 220; b.vy += ny * 220;
          if (c.cool <= 0) { add(100); ev('bump', c.x, c.y); c.lit = 0.15; c.cool = 0.05; }
        }
      }

      // top rollovers
      sensors.forEach(s => {
        const inside = Math.hypot(b.x - s.x, b.y - s.y) < s.r;
        if (inside && !s.inside && !s.lit) {
          s.lit = true; add(100); ev('rollover', s.x, s.y);
          if (sensors.every(x => x.lit)) { add(1000); S.mult = Math.min(5, S.mult + 1); ev('bonus', 190, 120); sensors.forEach(x => { x.lit = false; }); }
        }
        s.inside = inside;
      });

      // ball fell back into the lane: ready to launch again
      const speed = Math.hypot(b.vx, b.vy);
      if (S.state === 'play' && b.x > 372 && b.y > 600 && speed < 25) { S.state = 'launch'; S.charge = 0; }
      // rescue a ball that has stopped somewhere it cannot roll out of
      S.still = (speed < 10 && b.y < 500 && S.state === 'play') ? S.still + DT : 0;
      if (S.still > 2) { b.vy = -380; b.vx = (Math.random() - 0.5) * 300; S.still = 0; ev('rescue'); }

      if (b.y > H + 25) {
        if (S.state === 'play' && S.t < S.saveUntil) {         // ball save: a quick drain after launch is given back
          S.saveUntil = 0; newBall(); S.autoAt = S.t + 1.3; ev('saved', 391, 600);
        } else {
          ev('drain', b.x, H - 10);
          if (S.balls > 1) { S.balls--; S.ballNo++; S.mult = 1; S.saveAvail = true; newBall(); } else { S.state = 'over'; ev('over'); }
        }
      }
    }

    function launch(charge, auto) {
      S.ball.vy = -(650 + 850 * charge); S.ball.vx = 0; S.state = 'play';
      // one ball save per ball: the first player launch earns 10 seconds of protection
      if (!auto && S.saveAvail) { S.saveUntil = S.t + 10; S.saveAvail = false; } else S.saveUntil = 0;
      ev('launch', 391, 600);
    }

    let acc = 0;
    return {
      S, geo: { segs, bumpers, sensors, flippers, banks },
      step(dt) { acc += Math.min(dt, 0.05); let n = 0; while (acc >= DT && n++ < 30) { acc -= DT; sub(); } },
      setFlipper(side, down) { flippers.forEach(f => { if (f.side === side) f.down = !!down; }); },
      pull(down) {
        if (down) { S.pulling = true; return; }
        S.pulling = false;
        if (S.state === 'launch' && S.charge > 0.05) launch(S.charge, false);
        S.charge = 0;
      },
      newGame
    };
  }

  const api = { createEngine, W, H, R };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PinballEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
