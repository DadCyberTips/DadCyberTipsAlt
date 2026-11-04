/**
 * Pinball physics + rules, with no drawing code (so it can be tested on its own).
 * An original table: arch, plunger lane with a one-way gate, three pop bumpers, two slingshots,
 * two flippers, two standup-target banks, a drop-target bank, a spinner, a kick-out saucer,
 * three top rollovers, two orbit loops and a centre ramp (balls ride those on scripted paths),
 * and a mission mode that cycles through shots and ranks you up.
 */
(function(root) {
  const W = 420, H = 640, R = 9, FR = 7, G = 900, DT = 1 / 240, VMAX = 1700;
  const clamp01 = t => Math.max(0, Math.min(1, t));

  // Catmull-Rom smoothing for the ramp / orbit paths
  function spline(pts, per = 12) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t, f = j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
        out.push([f(0), f(1)]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  const MISSIONS = [
    { key: 'orbit', need: 3, name: 'ORBIT RUN', hint: 'SHOOT THE ORBITS' },
    { key: 'ramp', need: 2, name: 'SKYWAY', hint: 'SHOOT THE RAMP' },
    { key: 'bump', need: 20, name: 'REACTOR', hint: 'HIT THE BUMPERS' },
    { key: 'drop', need: 2, name: 'SHIELDS', hint: 'CLEAR THE DROP BANK' },
    { key: 'spin', need: 40, name: 'WARP DRIVE', hint: 'SPIN THE SPINNER' },
    { key: 'saucer', need: 2, name: 'DOCKING', hint: 'SHOOT THE SAUCER' }
  ];
  const RANKS = ['DOCK HAND', 'PILOT', 'NAVIGATOR', 'COMMANDER', 'STARLORD'];

  function createEngine() {
    const segs = [], bumpers = [], sensors = [], flippers = [], lanes = [], drops = [];
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
    // drop-target bank: knocked flat by a firm hit, pops back up after the bank is cleared
    [[262, 282], [286, 306], [310, 330]].forEach(([a, b], i) => drops.push(seg(300, a, 300, b, { e: 0.3, drop: true, down: false, idx: i })));

    // bumpers, rollovers, flippers
    [[145, 215], [235, 175], [205, 258]].forEach(([x, y]) => bumpers.push({ x, y, r: 20, lit: 0, cool: 0 }));
    [[140, 112], [190, 94], [240, 112]].forEach(([x, y]) => sensors.push({ x, y, r: 14, lit: false, inside: false }));
    flippers.push({ side: 'L', px: 112, py: 556, len: 62, rest: 0.49, act: -0.49, ang: 0.49, om: 0, down: false });
    flippers.push({ side: 'R', px: 268, py: 556, len: 62, rest: Math.PI - 0.49, act: Math.PI + 0.49, ang: Math.PI - 0.49, om: 0, down: false });

    // ramp + orbit loops: a ball that enters fast enough in the right direction rides a scripted path
    const mkLane = o => {
      const pts = spline(o.path), cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      return { ...o, pts, cum, len: cum[cum.length - 1] };
    };
    lanes.push(mkLane({ id: 'orbitL', key: 'orbit', entry: { x: 40, y: 345, r: 20 }, dir: { x: 0, y: -1 }, minSpeed: 400, rideSpeed: 560, exit: { vx: -40, vy: 360 },
      path: [[40, 345], [32, 260], [44, 172], [88, 102], [150, 62], [210, 48], [270, 62], [332, 102], [352, 160]] }));
    lanes.push(mkLane({ id: 'orbitR', key: 'orbit', entry: { x: 342, y: 345, r: 20 }, dir: { x: 0, y: -1 }, minSpeed: 400, rideSpeed: 560, exit: { vx: 40, vy: 360 },
      path: [[342, 345], [350, 260], [338, 172], [294, 102], [232, 62], [172, 48], [112, 62], [50, 102], [30, 160]] }));
    lanes.push(mkLane({ id: 'ramp', key: 'ramp', entry: { x: 190, y: 392, r: 20 }, dir: { x: 0, y: -1 }, minSpeed: 440, rideSpeed: 520, exit: { vx: 50, vy: 260 },
      path: [[190, 392], [192, 330], [202, 262], [218, 196], [246, 140], [292, 108]] }));
    const saucer = { x: 72, y: 235, r: 13, holdFor: 1.0 };
    const spinner = { x1: 270, x2: 312, y1: 152, ang: 0, om: 0, turns: 0 };

    const S = { W, H, R, score: 0, hi: 0, balls: 3, ballNo: 1, mult: 1, state: 'launch', charge: 0, pulling: false,
      ball: { x: 391, y: 621, vx: 0, vy: 0 }, events: [], fx: [], t: 0, saveUntil: 0, saveAvail: true, autoAt: 0, still: 0,
      ride: null, hold: null, dropReset: 0, mi: 0, have: 0, rank: 0, done: 0, wizard: 0, mission: { ...MISSIONS[0], have: 0 } };
    const ev = (e, x, y) => { S.events.push(e); if (x !== undefined) { S.fx.push({ k: e, x, y }); if (S.fx.length > 200) S.fx.shift(); } };
    const add = n => { S.score += n * S.mult * (S.wizard > 0 ? 2 : 1); if (S.score > S.hi) S.hi = S.score; };

    // mission mode: do the current shot enough times, earn points and a rank; after all six, warp mode (x2) for 20s
    function shot(key) {
      const m = MISSIONS[S.mi];
      if (m.key !== key) return;
      S.have++; S.mission.have = S.have;
      if (S.have < m.need) { ev('progress'); return; }
      S.lastReward = 10000 * (S.rank + 1); add(S.lastReward); S.rank = Math.min(RANKS.length - 1, S.rank + 1); S.done++;
      S.mi = (S.mi + 1) % MISSIONS.length; S.have = 0; S.mission = { ...MISSIONS[S.mi], have: 0 };
      ev('mission', 190, 300);
      if (S.done % MISSIONS.length === 0) { S.wizard = 20; ev('wizard', 190, 300); }
    }

    function newBall() { S.ball = { x: 391, y: 621, vx: 0, vy: 0 }; S.state = 'launch'; S.charge = 0; S.still = 0; S.ride = null; S.hold = null; }
    function newGame() {
      S.score = 0; S.balls = 3; S.ballNo = 1; S.mult = 1; S.events.length = 0; S.fx.length = 0; S.saveUntil = 0; S.saveAvail = true; S.autoAt = 0;
      S.mi = 0; S.have = 0; S.rank = 0; S.done = 0; S.wizard = 0; S.dropReset = 0; S.mission = { ...MISSIONS[0], have: 0 };
      banks.L.concat(banks.R).forEach(s => { s.lit = false; }); drops.forEach(d => { d.down = false; });
      sensors.forEach(s => { s.lit = false; s.inside = false; }); spinner.ang = 0; spinner.om = 0; spinner.turns = 0;
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
    function hitDrop(s) {
      s.down = true; s.hit = 0.15; add(300); ev('drop', s.x1, (s.y1 + s.y2) / 2);
      if (drops.every(d => d.down)) { add(2000); ev('dropbank', 300, 296); shot('drop'); S.dropReset = S.t + 1.4; }
    }

    const pointAt = (L, d) => {
      const c = L.cum; let i = 1;
      while (i < c.length - 1 && c[i] < d) i++;
      const t = (d - c[i - 1]) / ((c[i] - c[i - 1]) || 1), a = L.pts[i - 1], b = L.pts[i];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      return [a[0] + dx * t, a[1] + dy * t, dx / l, dy / l];
    };

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
      if (S.wizard > 0) S.wizard = Math.max(0, S.wizard - DT);
      if (S.dropReset && S.t >= S.dropReset) { drops.forEach(d => { d.down = false; }); S.dropReset = 0; ev('dropup', 300, 296); }
      spinner.ang += spinner.om * DT; spinner.om *= 1 - 1.6 * DT; if (spinner.om < 0.6) spinner.om = 0;
      const turns = Math.floor(spinner.ang / Math.PI);
      if (turns > spinner.turns) {
        for (let i = spinner.turns; i < turns; i++) { add(50); shot('spin'); }
        spinner.turns = turns; ev('spin', (spinner.x1 + spinner.x2) / 2, spinner.y1);
      }
      if (S.state === 'over') return;
      if (S.state === 'launch' && S.autoAt && S.t >= S.autoAt) { S.autoAt = 0; launch(0.88, true); }

      const b = S.ball;
      if (S.hold) {                                           // sitting in the saucer
        S.hold.t += DT;
        if (S.hold.t >= saucer.holdFor) { b.x = saucer.x + 16; b.y = saucer.y - 2; b.vx = 480; b.vy = -80; S.hold = null; ev('eject', saucer.x, saucer.y); }
        return;
      }
      if (S.ride) {                                           // riding a ramp / orbit on its scripted path
        const r = S.ride, L = r.lane;
        r.d += r.speed * DT;
        if (r.d >= L.len) { const p = L.pts[L.pts.length - 1]; b.x = p[0]; b.y = p[1]; b.vx = L.exit.vx; b.vy = L.exit.vy; S.ride = null; ev('rideEnd'); }
        else { const q = pointAt(L, r.d); b.x = q[0]; b.y = q[1]; b.vx = q[2] * r.speed; b.vy = q[3] * r.speed; }
        return;
      }

      const py = b.y;
      b.vy += G * DT;
      const sp0 = Math.hypot(b.vx, b.vy);
      if (sp0 > VMAX) { b.vx *= VMAX / sp0; b.vy *= VMAX / sp0; }
      b.x += b.vx * DT; b.y += b.vy * DT;

      for (let it = 0; it < 2; it++) {
        for (const s of segs) {
          if (s.drop && s.down) continue;
          const imp = collideSeg(b, s);
          if (imp > 60) {
            if (s.target) { hitTarget(s); s.hit = 0.15; }
            else if (s.drop) hitDrop(s);
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
          if (c.cool <= 0) { add(100); ev('bump', c.x, c.y); shot('bump'); c.lit = 0.15; c.cool = 0.05; }
        }
      }

      // spinner: a ball crossing it sets it spinning
      if ((py - spinner.y1) * (b.y - spinner.y1) < 0 && b.x > spinner.x1 - 6 && b.x < spinner.x2 + 6) spinner.om = Math.min(55, spinner.om + Math.abs(b.vy) * 0.05 + 4);
      // top rollovers
      sensors.forEach(s => {
        const inside = Math.hypot(b.x - s.x, b.y - s.y) < s.r;
        if (inside && !s.inside && !s.lit) {
          s.lit = true; add(100); ev('rollover', s.x, s.y);
          if (sensors.every(x => x.lit)) { add(1000); S.mult = Math.min(5, S.mult + 1); ev('bonus', 190, 120); sensors.forEach(x => { x.lit = false; }); }
        }
        s.inside = inside;
      });
      // ramp / orbit entrances: fast enough and heading the right way
      const speed = Math.hypot(b.vx, b.vy);
      for (const L of lanes) {
        const e = L.entry, dx = b.x - e.x, dy = b.y - e.y;
        if (dx * dx + dy * dy < e.r * e.r && speed >= L.minSpeed && (b.vx * L.dir.x + b.vy * L.dir.y) / speed > 0.6) {
          S.ride = { lane: L, d: 0, speed: Math.max(L.rideSpeed, Math.min(speed, 900)) };
          add(L.key === 'ramp' ? 1500 : 500); ev(L.key, e.x, e.y); shot(L.key);
          b.x = e.x; b.y = e.y;
          return;
        }
      }
      // kick-out saucer: a ball that rolls in is held for a moment, then fired back out
      if (speed < 900 && Math.hypot(b.x - saucer.x, b.y - saucer.y) < saucer.r - 2) {
        S.hold = { t: 0 }; b.x = saucer.x; b.y = saucer.y; b.vx = 0; b.vy = 0;
        add(1000); ev('saucer', saucer.x, saucer.y); shot('saucer');
        return;
      }

      // ball fell back into the lane: ready to launch again
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
      S, geo: { segs, bumpers, sensors, flippers, banks, lanes, drops, saucer, spinner, missions: MISSIONS, ranks: RANKS },
      step(dt) { acc += Math.min(dt, 0.05); let n = 0; while (acc >= DT && n++ < 30) { acc -= DT; sub(); } },
      setFlipper(side, down) { flippers.forEach(f => { if (f.side === side) f.down = !!down; }); },
      pull(down) {
        if (down) { S.pulling = true; return; }
        S.pulling = false;
        if (S.state === 'launch' && S.charge > 0.05) launch(S.charge, false);
        S.charge = 0;
      },
      newGame, _shot: shot   // _shot is exposed for tests
    };
  }

  const api = { createEngine, W, H, R, MISSIONS, RANKS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.PinballEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
