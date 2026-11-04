/**
 * Snack Cyber pinball: static art in a realistic rendered style (printed playfield with
 * clearcoat and grain, cabinet lighting, polished metal, chrome ball, glossy plastics).
 * Everything here is drawn once when the window opens, at 2x for sharpness.
 * Coordinates match the engine (the table is W x H).
 */
(function() {
  const TAU = Math.PI * 2;
  const SC = 2;
  const mk = (w, h, sc = SC) => { const c = document.createElement('canvas'); c.width = w * sc; c.height = h * sc; const x = c.getContext('2d'); x.scale(sc, sc); return [c, x]; };

  const star = (x, cx, cy, R1, R2, n = 5) => {
    x.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? R2 : R1; x[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    x.closePath();
  };
  // Bevelled printed text: dark outline, drop shadow, banded chrome fill
  function chromeText(x, t, cx, cy, size, ital = true) {
    x.save(); x.font = `${ital ? 'italic ' : ''}900 ${size}px "Arial Black", "Segoe UI", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineJoin = 'round';
    x.fillStyle = 'rgba(0,0,0,.55)'; x.fillText(t, cx + 1.5, cy + 2.5);
    x.strokeStyle = '#1a1208'; x.lineWidth = 2.5; x.strokeText(t, cx, cy);
    const g = x.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);   // brushed gold with a sky/horizon reflection
    g.addColorStop(0, '#fff4d8'); g.addColorStop(0.4, '#e8c070'); g.addColorStop(0.52, '#6a4a18'); g.addColorStop(0.62, '#b88a3a'); g.addColorStop(1, '#f0d8a0');
    x.fillStyle = g; x.fillText(t, cx, cy);
    x.restore();
  }

  /* ---------- procedural noise for the nebula ---------- */
  function valueNoise(seed) {
    const P = new Uint8Array(512), V = new Float32Array(256); let s = seed;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 256; i++) { P[i] = i; V[i] = r(); }
    for (let i = 255; i > 0; i--) { const j = r() * (i + 1) | 0; [P[i], P[j]] = [P[j], P[i]]; }
    for (let i = 0; i < 256; i++) P[i + 256] = P[i];
    const sm = t => t * t * (3 - 2 * t);
    const n = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
      const a = V[P[X + P[Y]]], b2 = V[P[X + 1 + P[Y]]], c2 = V[P[X + P[Y + 1]]], d = V[P[X + 1 + P[Y + 1]]], u = sm(xf), v = sm(yf);
      return a + (b2 - a) * u + (c2 - a) * v + (a - b2 - c2 + d) * u * v;
    };
    return (x, y, oct = 5) => { let f = 0, amp = 0.5, fr = 1; for (let o = 0; o < oct; o++) { f += amp * n(x * fr, y * fr); amp *= 0.5; fr *= 2.03; } return f; };
  }
  function nebula(W, H) {          // computed at quarter resolution, then drawn smoothly scaled
    const w = W / 2 | 0, h = H / 2 | 0, [c, x] = mk(w, h, 1), id = x.createImageData(w, h), d = id.data;
    const f1 = valueNoise(7), f2 = valueNoise(19);
    for (let j = 0, i = 0; j < h; j++) for (let k = 0; k < w; k++, i += 4) {
      const u = k / w * 4, v = j / h * 6;
      const wx = f2(u + 3.1, v + 1.7, 3) * 2, wy = f2(u - 2.3, v + 5.2, 3) * 2;      // domain warp gives wispy filaments
      const n = f1(u + wx, v + wy), m = f1(u * 2 + 9, v * 2 - 4, 4);
      const dust = Math.max(0, n - 0.42) * 2.6, glow = Math.max(0, m - 0.5) * 2;
      d[i] = 30 + dust * 190 + glow * 60; d[i + 1] = 18 + dust * 60 + glow * 40; d[i + 2] = 60 + dust * 170 + glow * 140;   // magenta dust over blue emission
      d[i + 3] = Math.min(255, 70 + (dust + glow) * 210);
      if (n < 0.36) { d[i] *= 0.4; d[i + 1] *= 0.4; d[i + 2] *= 0.55; }                // dark dust lanes
    }
    x.putImageData(id, 0, 0);
    return c;
  }

  /* ---------- playfield ---------- */
  function table(W, H) {
    const [c, b] = mk(W, H);
    // deep-space backdrop: a procedurally generated nebula (domain-warped fractal noise), not flat gradients
    b.fillStyle = '#03040e'; b.fillRect(0, 0, W, H);
    b.drawImage(nebula(W, H), 0, 0, W, H);
    let g, seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // stars: mostly faint, a few bright ones with soft halos and diffraction spikes
    for (let i = 0; i < 900; i++) {
      const x = rnd() * W, y = rnd() * H, m = Math.pow(rnd(), 3), t = rnd();
      const col = t < 0.15 ? '255,210,180' : t < 0.3 ? '190,210,255' : '235,240,255';
      b.fillStyle = `rgba(${col},${0.25 + m * 0.75})`; b.fillRect(x, y, 0.5 + m * 1.2, 0.5 + m * 1.2);
      if (m > 0.55) {
        const hg = b.createRadialGradient(x, y, 0, x, y, 6 * m); hg.addColorStop(0, `rgba(${col},.5)`); hg.addColorStop(1, `rgba(${col},0)`); b.fillStyle = hg; b.fillRect(x - 6, y - 6, 12, 12);
        if (m > 0.8) { b.strokeStyle = `rgba(${col},.35)`; b.lineWidth = 0.5; b.beginPath(); b.moveTo(x - 9, y); b.lineTo(x + 9, y); b.moveTo(x, y - 9); b.lineTo(x, y + 9); b.stroke(); }
      }
    }
    // spiral galaxy, top left: thousands of points along two log-spiral arms with a bright core
    b.save(); b.translate(70, 160); b.rotate(-0.5); b.scale(1, 0.45);
    for (let i = 0; i < 1800; i++) {
      const arm = i % 2 ? 0 : Math.PI, d = Math.pow(rnd(), 0.7) * 40, a = arm + d * 0.16 + (rnd() - 0.5) * 0.9 * (1 - d / 50);
      b.fillStyle = `rgba(${d < 10 ? '255,230,200' : '200,200,255'},${0.15 + 0.5 * (1 - d / 40)})`; b.fillRect(Math.cos(a) * d, Math.sin(a) * d, 0.7, 0.7);
    }
    g = b.createRadialGradient(0, 0, 0, 0, 0, 10); g.addColorStop(0, 'rgba(255,240,220,.9)'); g.addColorStop(1, 'rgba(255,240,220,0)'); b.fillStyle = g; b.fillRect(-10, -10, 20, 20);
    b.restore();
    // gas giant, lower left: banded surface, sunlit from the upper left, atmosphere rim, ring with shadow
    const PX = 95, PY = 372, PR = 46;
    const ring = front => {
      b.save(); b.translate(PX, PY); b.rotate(-0.35);
      for (let r = 58; r < 82; r += 0.8) {
        const a = 0.25 + 0.35 * Math.sin(r * 0.9) * Math.sin(r * 0.23); if (r > 70 && r < 72) continue;   // Cassini-style gap
        b.strokeStyle = `rgba(${200 + r},${170 + r * 0.5 | 0},120,${a})`; b.lineWidth = 0.8;
        b.beginPath(); b.ellipse(0, 0, r, r * 0.2, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); b.stroke();
      }
      b.restore();
    };
    ring(false);
    b.save(); b.beginPath(); b.arc(PX, PY, PR, 0, TAU); b.clip();
    for (let y = -PR; y < PR; y++) {                       // turbulent bands
      const k = y / PR, v = Math.sin(k * 11 + Math.sin(k * 23) * 0.8) * 0.5 + 0.5;
      b.fillStyle = `rgb(${60 + v * 70 | 0},${100 + v * 80 | 0},${170 + v * 60 | 0})`; b.fillRect(PX - PR, PY + y, PR * 2, 1.2);
    }
    g = b.createRadialGradient(PX - 20, PY - 22, 4, PX + 8, PY + 8, PR * 1.25);   // lit side to night side
    g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(0.35, 'rgba(0,0,0,0)'); g.addColorStop(0.75, 'rgba(0,0,15,.75)'); g.addColorStop(1, 'rgba(0,0,10,.95)');
    b.fillStyle = g; b.fillRect(PX - PR, PY - PR, PR * 2, PR * 2);
    b.fillStyle = 'rgba(0,0,10,.45)'; b.save(); b.translate(PX, PY + 6); b.rotate(-0.35); b.fillRect(-PR, -2, PR * 2, 5); b.restore();   // ring shadow on the planet
    b.restore();
    g = b.createRadialGradient(PX, PY, PR - 2, PX, PY, PR + 5); g.addColorStop(0, 'rgba(140,200,255,.5)'); g.addColorStop(1, 'rgba(140,200,255,0)');
    b.fillStyle = g; b.beginPath(); b.arc(PX, PY, PR + 5, Math.PI * 0.75, Math.PI * 1.75); b.arc(PX, PY, PR - 2, Math.PI * 1.75, Math.PI * 0.75, true); b.fill();   // atmosphere on the lit limb
    ring(true);
    // printed artwork under the bumpers: metallic-ink rings with fine engraving instead of flat bands
    [[104, '#3a2470', '#1a0c40'], [96, '#c8407a', '#6a1440'], [86, '#24388a', '#0c1440'], [80, '#3a64c8', '#142a6a']].forEach(([r, c1, c2]) => {
      g = b.createLinearGradient(195 - r, 215 - r, 195 + r, 215 + r); g.addColorStop(0, c1); g.addColorStop(1, c2);
      b.fillStyle = g; b.beginPath(); b.arc(195, 215, r, 0, TAU); b.fill();
    });
    g = b.createRadialGradient(195, 215, 10, 195, 215, 78); g.addColorStop(0, '#0a1030'); g.addColorStop(1, '#101a50'); b.fillStyle = g; b.beginPath(); b.arc(195, 215, 77, 0, TAU); b.fill();
    b.strokeStyle = 'rgba(255,255,255,.08)'; b.lineWidth = 0.5; for (let r = 78; r < 104; r += 2) { b.beginPath(); b.arc(195, 215, r, 0, TAU); b.stroke(); }
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; b.fillStyle = '#d8b060'; b.beginPath(); b.arc(195 + Math.cos(a) * 89, 215 + Math.sin(a) * 89, 1.6, 0, TAU); b.fill(); }
    // orbit lanes printed under the arch
    [[170, '#1a2770'], [160, '#0a1040'], [150, '#2a1658'], [146, '#0a1040']].forEach(([r, col]) => { b.strokeStyle = col; b.lineWidth = 6; b.beginPath(); b.arc(210, 210, r, Math.PI + 0.16, TAU - 0.16); b.stroke(); });
    // hyperlanes: fine printed lines from the wormhole
    b.lineCap = 'round';
    [[-2.5, 150], [-1.9, 120], [-0.6, 120], [-1.2, 160], [2.2, 90], [0.9, 90]].forEach(([a, L]) => {
      const x2 = 190 + Math.cos(a) * L, y2 = 392 + Math.sin(a) * L;
      g = b.createLinearGradient(190, 392, x2, y2); g.addColorStop(0, 'rgba(160,220,255,.05)'); g.addColorStop(1, 'rgba(160,220,255,.45)');
      b.strokeStyle = g; b.lineWidth = 0.9; b.beginPath(); b.moveTo(190, 392); b.lineTo(x2, y2); b.stroke();
      b.fillStyle = 'rgba(200,235,255,.7)'; b.beginPath(); b.arc(x2, y2, 1.3, 0, TAU); b.fill();
    });
    // wormhole well: dark centre, glowing accretion disc
    g = b.createRadialGradient(190, 392, 10, 190, 392, 46); g.addColorStop(0, '#000'); g.addColorStop(0.5, '#14062a'); g.addColorStop(0.78, 'rgba(220,90,160,.75)'); g.addColorStop(0.88, 'rgba(255,200,150,.5)'); g.addColorStop(1, 'rgba(208,56,138,0)');
    b.fillStyle = g; b.beginPath(); b.arc(190, 392, 46, 0, TAU); b.fill();
    // hex panel pattern behind the bumpers (fine engraving)
    b.strokeStyle = 'rgba(140,180,255,.10)'; b.lineWidth = 0.6;
    for (let r = 0; r < 9; r++) for (let q = 0; q < 10; q++) {
      const hx = 110 + q * 19 + (r % 2) * 9.5, hy = 130 + r * 16.5;
      if (Math.hypot(hx - 195, hy - 215) > 74) continue;
      b.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; b[k ? 'lineTo' : 'moveTo'](hx + Math.cos(a) * 9, hy + Math.sin(a) * 9); } b.closePath(); b.stroke();
    }
    // cratered moon, right: noise surface, terminator shading
    b.save(); b.beginPath(); b.arc(330, 456, 12, 0, TAU); b.clip();
    b.fillStyle = '#9a9aa4'; b.fillRect(318, 444, 24, 24);
    for (let i = 0; i < 26; i++) { const x = 318 + rnd() * 24, y = 444 + rnd() * 24, r = 0.6 + rnd() * 2.2; b.fillStyle = 'rgba(40,40,50,.35)'; b.beginPath(); b.arc(x, y, r, 0, TAU); b.fill(); b.fillStyle = 'rgba(255,255,255,.25)'; b.beginPath(); b.arc(x - 0.4, y - 0.4, r * 0.7, Math.PI, Math.PI * 1.5); b.fill(); }
    g = b.createRadialGradient(325, 451, 2, 332, 458, 15); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.6, 'rgba(0,0,10,.3)'); g.addColorStop(1, 'rgba(0,0,10,.85)');
    b.fillStyle = g; b.fillRect(316, 442, 28, 28); b.restore();
    // comet, lower left: bright nucleus, blue ion tail and a broader dust tail
    [[0.5, 'rgba(255,240,210,', 7], [0, 'rgba(140,200,255,', 2.5]].forEach(([off, col, w]) => {
      g = b.createLinearGradient(106, 523, 26 + off * 12, 568 - off * 10); g.addColorStop(0, col + '.6)'); g.addColorStop(1, col + '0)');
      b.strokeStyle = g; b.lineWidth = w; b.beginPath(); b.moveTo(106, 523); b.quadraticCurveTo(70, 548 - off * 6, 26 + off * 12, 568 - off * 10); b.stroke();
    });
    g = b.createRadialGradient(106, 523, 0, 106, 523, 6); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(200,230,255,0)'); b.fillStyle = g; b.fillRect(100, 517, 12, 12);
    chromeText(b, 'SNACK CYBER', 191, 528, 22);
    // printed shot labels
    const label = (t, x, y, ang = 0) => {
      b.save(); b.translate(x, y); b.rotate(ang); b.font = '700 9px Arial, sans-serif'; b.textAlign = 'center';
      b.strokeStyle = 'rgba(0,0,10,.8)'; b.lineWidth = 2; b.lineJoin = 'round'; b.strokeText(t, 0, 0); b.fillStyle = '#e8eef8'; b.fillText(t, 0, 0); b.restore();
    };
    label('ORBIT', 31, 302, -Math.PI / 2); label('ORBIT', 351, 302, Math.PI / 2); label('WORMHOLE', 190, 446); label('SPIN', 291, 178); label('DOCK', 72, 265); label('SHIELDS', 300, 351);
    // launch lane: dark metal channel with grooves
    g = b.createLinearGradient(372, 0, 410, 0); g.addColorStop(0, '#05071a'); g.addColorStop(0.5, '#262c52'); g.addColorStop(1, '#0a0e2a');
    b.fillStyle = g; b.fillRect(372, 244, 38, 396);
    b.fillStyle = '#3a4270'; for (let y = 260; y < 640; y += 12) b.fillRect(376, y, 30, 1);
    b.fillStyle = '#ffd56b'; [330, 385, 440].forEach(y => { b.beginPath(); b.moveTo(382, y + 8); b.lineTo(391, y - 2); b.lineTo(400, y + 8); b.lineTo(391, y + 3); b.closePath(); b.fill(); });
    // printed-on-wood grain: fine per-pixel noise plus faint long fibres
    const id = b.getImageData(0, 0, c.width, c.height), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
    b.putImageData(id, 0, 0);
    b.globalAlpha = 0.05; b.strokeStyle = '#000'; b.lineWidth = 0.6;
    for (let i = 0; i < 90; i++) { const y = rnd() * H; b.beginPath(); b.moveTo(0, y); b.bezierCurveTo(W / 3, y + (rnd() - 0.5) * 8, W * 2 / 3, y + (rnd() - 0.5) * 8, W, y + (rnd() - 0.5) * 6); b.stroke(); }
    b.globalAlpha = 1;
    return c;
  }

  /* ---------- cabinet lighting: applied over the dynamic table every frame ---------- */
  function shade(W, H) {           // multiply layer: dim room, far end and edges fall off, lamp-lit centre
    const [c, x] = mk(W, H, 1);
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    let g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3a3a50'); g.addColorStop(0.3, '#b8b8c8'); g.addColorStop(0.7, '#f0ece6'); g.addColorStop(1, '#8a8682');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(30,30,50,.7)'); g.addColorStop(0.16, 'rgba(255,255,255,0)'); g.addColorStop(0.84, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(30,30,50,.7)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    return c;
  }
  function gi(W, H) {              // additive layer: warm light pools from the bulbs hidden under the side rails and slings
    const [c, x] = mk(W, H, 1);
    [[30, 300, 70], [350, 300, 70], [70, 470, 80], [310, 470, 80], [190, 560, 90], [60, 140, 60], [330, 140, 60]].forEach(([px, py, r]) => {
      const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(255,200,140,.22)'); g.addColorStop(1, 'rgba(255,200,140,0)');
      x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
    });
    return c;
  }

  /* ---------- raised walls: side face, top face, bevel highlight ---------- */
  function rails(segs, W, H) {
    const [c, r] = mk(W, H);
    const plain = segs.filter(s => !s.target && !s.sling && !s.rubber && !s.gate && !s.drop);
    const pass = (col, w, dx = 0, dy = 0) => { r.strokeStyle = col; r.lineWidth = w; r.beginPath(); plain.forEach(s => { r.moveTo(s.x1 + dx, s.y1 + dy); r.lineTo(s.x2 + dx, s.y2 + dy); }); r.stroke(); };
    r.lineCap = 'round'; r.lineJoin = 'round';
    pass('rgba(60,200,255,.10)', 22, 0, 6);   // light spill from the lit edges
    pass('rgba(0,0,20,.35)', 12, 7, 16);   // long soft cast shadow
    pass('rgba(0,0,20,.55)', 9, 4, 11);
    for (let k = 10; k >= 2; k -= 2) pass(`rgb(${40 + k * 4},${44 + k * 4},${70 + k * 5})`, 9, 0, k);   // tall side face, lit from the top
    pass('#5fe0ff', 1.5, 0, 6);            // lit strip along the base of each wall
    pass('#6a7088', 8);                    // polished top: dark reflection of the room...
    pass('#b8bccc', 5, -0.5, -0.8);        // ...lit band...
    pass('#f4f6fc', 1.6, -1, -1.8);        // ...and a sharp highlight
    pass('rgba(255,255,255,.5)', 0.8, 1.2, 1.2);
    return c;
  }

  /* ---------- orbit plastics on posts ---------- */
  function lanes(L, W, H) {
    const [c, x] = mk(W, H);
    x.lineCap = 'round'; x.lineJoin = 'round';
    L.forEach(l => {
      const hw = 8, P = l.pts, left = [], right = [];
      P.forEach((p, i) => {
        const a = P[Math.max(0, i - 1)], q = P[Math.min(P.length - 1, i + 1)];
        let dx = q[0] - a[0], dy = q[1] - a[1]; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
        left.push([p[0] - dy * hw, p[1] + dx * hw]); right.push([p[0] + dy * hw, p[1] - dx * hw]);
      });
      const ribbon = (dx, dy) => { x.beginPath(); left.forEach((p, i) => x[i ? 'lineTo' : 'moveTo'](p[0] + dx, p[1] + dy)); for (let i = right.length - 1; i >= 0; i--) x.lineTo(right[i][0] + dx, right[i][1] + dy); x.closePath(); };
      const rail = (pts, col, w, dx, dy) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); pts.forEach((p, i) => x[i ? 'lineTo' : 'moveTo'](p[0] + dx, p[1] + dy)); x.stroke(); };
      for (let k = 1; k <= 6; k++) { ribbon(k * 2, k * 4); x.fillStyle = 'rgba(0,0,20,.09)'; x.fill(); }      // soft shadow far below: the ramps sit high
      for (let i = 4; i < P.length - 2; i += 14) { const p = P[i]; const pg = x.createLinearGradient(p[0] - 2, 0, p[0] + 2, 0); pg.addColorStop(0, '#5a6080'); pg.addColorStop(0.5, '#e0e6f6'); pg.addColorStop(1, '#4a5070'); x.fillStyle = pg; x.fillRect(p[0] - 2, p[1] - 2, 4, 22); }   // chrome support posts
      ribbon(0, -2); x.fillStyle = 'rgba(150,160,255,.32)'; x.fill();   // tinted plastic
      ribbon(0, -2); const sh = x.createLinearGradient(0, 0, W, H); sh.addColorStop(0, 'rgba(255,255,255,.25)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,255,255,.12)'); x.fillStyle = sh; x.fill();   // gloss
      [left, right].forEach(s => { rail(s, '#2a2f48', 5, 0, 2); rail(s, '#8a94b8', 3.5, 0, -2); rail(s, '#ffffff', 1.2, -0.5, -3); });
    });
    return c;
  }

  /* ---------- sprites ---------- */
  function ball() {                // chrome: sky above the horizon, dark room band, playfield reflected below
    const [c, x] = mk(20, 20, 4);
    x.save(); x.beginPath(); x.arc(10, 10, 9, 0, TAU); x.clip();
    let g = x.createLinearGradient(0, 1, 0, 19);
    g.addColorStop(0, '#f4f6fa'); g.addColorStop(0.38, '#aab2c4'); g.addColorStop(0.48, '#2a2e3c'); g.addColorStop(0.58, '#1a1e2c'); g.addColorStop(0.72, '#3a4a9a'); g.addColorStop(1, '#6a5ab0');
    x.fillStyle = g; x.fillRect(0, 0, 20, 20);
    g = x.createRadialGradient(10, 10, 5, 10, 10, 9.5); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,10,.55)');   // edge darkening
    x.fillStyle = g; x.fillRect(0, 0, 20, 20);
    x.fillStyle = 'rgba(255,220,170,.5)'; x.beginPath(); x.ellipse(13, 14, 3, 1.4, -0.4, 0, TAU); x.fill();   // warm lamp reflection
    x.restore();
    x.fillStyle = '#fff'; x.beginPath(); x.ellipse(7, 5.5, 2.4, 1.6, -0.5, 0, TAU); x.fill();                  // key light
    return c;
  }
  function bumper(lit) {                     // tall bumper: chrome base, coloured body, glossy dome cap. Base centre is (30, 44).
    const [c, x] = mk(60, 72), m = 30, base = 44, top = 30;
    x.fillStyle = 'rgba(0,0,20,.45)'; x.beginPath(); x.ellipse(m + 6, base + 10, 26, 18, 0, 0, TAU); x.fill();
    let g = x.createLinearGradient(m - 24, 0, m + 24, 0); g.addColorStop(0, '#4a5070'); g.addColorStop(0.35, '#f4f6ff'); g.addColorStop(1, '#3a4060');
    x.fillStyle = g; x.beginPath(); x.ellipse(m, base, 24, 12, 0, 0, TAU); x.fill();                          // chrome base ring
    g = x.createLinearGradient(m - 18, 0, m + 18, 0);
    g.addColorStop(0, lit ? '#a05000' : '#5a0a30'); g.addColorStop(0.4, lit ? '#ffd040' : '#e0307a'); g.addColorStop(1, lit ? '#804000' : '#40061e');
    x.fillStyle = g; x.fillRect(m - 18, top, 36, base - top); x.beginPath(); x.ellipse(m, base, 18, 9, 0, 0, Math.PI); x.fill();   // body (cylinder)
    g = x.createRadialGradient(m - 6, top - 6, 1, m, top, 20);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, lit ? '#fff0a0' : '#a8dcff'); g.addColorStop(0.7, lit ? '#ffb020' : '#2a6ae0'); g.addColorStop(1, lit ? '#a06000' : '#0a2a80');
    x.fillStyle = g; x.beginPath(); x.ellipse(m, top, 20, 11, 0, 0, TAU); x.fill();                           // dome cap
    x.fillStyle = lit ? '#7a4000' : '#0a1450'; x.save(); x.translate(m, top); x.scale(1, 0.55); star(x, 0, 0, 9, 3.8); x.fill(); x.restore();
    x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.ellipse(m - 7, top - 4, 6, 2.5, -0.3, 0, TAU); x.fill();   // specular glint
    return c;
  }
  function halo(rgb, size = 48) {            // a lamp's light spill
    const [c, x] = mk(size, size), h = size / 2;
    const g = x.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, `rgba(${rgb},.9)`); g.addColorStop(0.35, `rgba(${rgb},.45)`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    return c;
  }
  function apron(W) {                         // grey plastic plate over the drain, with printed instructions
    const [c, x] = mk(W, 40);
    let g = x.createLinearGradient(0, 0, 0, 40); g.addColorStop(0, '#d0d4e0'); g.addColorStop(0.2, '#9aa0b8'); g.addColorStop(1, '#4a5070');
    x.fillStyle = g;
    x.beginPath(); x.moveTo(10, 6); x.lineTo(150, 6); x.lineTo(166, 0); x.lineTo(216, 0); x.lineTo(232, 6); x.lineTo(372, 6); x.lineTo(372, 40); x.lineTo(10, 40); x.closePath(); x.fill();
    x.strokeStyle = '#ffffff'; x.lineWidth = 1; x.beginPath(); x.moveTo(10, 6.5); x.lineTo(150, 6.5); x.lineTo(166, 0.5); x.lineTo(216, 0.5); x.lineTo(232, 6.5); x.lineTo(372, 6.5); x.stroke();
    x.fillStyle = '#20263e'; x.fillRect(150, 10, 82, 18);
    x.font = '900 9px "Arial Black", "Segoe UI", sans-serif'; x.textAlign = 'center'; x.fillStyle = '#ffd56b'; x.fillText('SNACK CYBER', 191, 22);
    x.font = '700 8px "Segoe UI", sans-serif'; x.fillStyle = '#20263e';
    x.fillText('3 BALLS PER GAME', 80, 17); x.fillText('COMPLETE MISSIONS', 80, 26); x.fillText('TO RANK UP', 300, 17); x.fillText('6 MISSIONS = WARP', 300, 26);
    return c;
  }

  window.PinballArt = { SC, mk, star, chromeText, table, shade, gi, rails, lanes, ball, bumper, halo, apron };
})();
