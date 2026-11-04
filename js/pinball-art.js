/**
 * Nova Strike pinball: static art in an early-2000s rendered-3D style
 * (smooth high-colour shading, tall extruded walls, glossy plastics).
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
    x.fillStyle = '#000'; x.fillText(t, cx + 2, cy + 3);
    x.strokeStyle = '#05081c'; x.lineWidth = 5; x.strokeText(t, cx, cy);
    const g = x.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
    g.addColorStop(0, '#fff7d0'); g.addColorStop(0.45, '#ffc93a'); g.addColorStop(0.5, '#b0560c'); g.addColorStop(0.75, '#ff9a1f'); g.addColorStop(1, '#ffe7a0');
    x.fillStyle = g; x.fillText(t, cx, cy);
    x.restore();
  }

  /* ---------- playfield ---------- */
  function table(W, H) {
    const [c, b] = mk(W, H);
    let g = b.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a1048'); g.addColorStop(0.45, '#14207a'); g.addColorStop(1, '#0a0f3c');
    b.fillStyle = g; b.fillRect(0, 0, W, H);
    // nebula clouds
    [[300, 250, 170, '170,60,200', 0.45], [80, 430, 150, '40,120,255', 0.4], [210, 560, 150, '230,50,120', 0.25], [200, 120, 140, '60,180,255', 0.3]].forEach(([x, y, r, rgb, a]) => {
      const n = b.createRadialGradient(x, y, 4, x, y, r); n.addColorStop(0, `rgba(${rgb},${a})`); n.addColorStop(1, `rgba(${rgb},0)`); b.fillStyle = n; b.fillRect(0, 0, W, H);
    });
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 170; i++) { const v = 150 + rnd() * 105 | 0; b.fillStyle = `rgb(${v},${v},255)`; const s = rnd() < 0.1 ? 2 : 1; b.fillRect(rnd() * W | 0, rnd() * H | 0, s, s); }
    // ringed planet, lower left
    const ring = (a0, a1) => { b.strokeStyle = '#d9a640'; b.lineWidth = 4; b.beginPath(); b.ellipse(95, 372, 80, 16, -0.35, a0, a1); b.stroke(); b.strokeStyle = '#7a5418'; b.lineWidth = 1; b.stroke(); };
    ring(Math.PI, TAU);
    g = b.createRadialGradient(76, 352, 3, 95, 372, 50); g.addColorStop(0, '#c8f0ff'); g.addColorStop(0.35, '#4a8ae8'); g.addColorStop(0.8, '#14307a'); g.addColorStop(1, '#060c30');
    b.fillStyle = g; b.beginPath(); b.arc(95, 372, 46, 0, TAU); b.fill();
    b.save(); b.beginPath(); b.arc(95, 372, 46, 0, TAU); b.clip(); b.fillStyle = 'rgba(255,255,255,.12)'; [[350, 6], [364, 9], [383, 5]].forEach(([y, h]) => b.fillRect(40, y, 110, h)); b.restore();
    ring(0, Math.PI);
    // reactor emblem under the pop bumpers: solid painted bands
    [[104, '#2a1660'], [96, '#d0388a'], [92, '#2a1660'], [86, '#1a2a8a'], [80, '#3a6ae0'], [77, '#101a5a']].forEach(([r, col]) => { b.fillStyle = col; b.beginPath(); b.arc(195, 215, r, 0, TAU); b.fill(); });
    for (let i = 0; i < 12; i++) { const a = i * TAU / 12; b.fillStyle = '#ffd56b'; b.beginPath(); b.arc(195 + Math.cos(a) * 89, 215 + Math.sin(a) * 89, 2, 0, TAU); b.fill(); }
    // orbit lanes painted under the arch
    [[170, '#1d2f9a'], [160, '#0c144c'], [150, '#3a1a70'], [146, '#0c144c']].forEach(([r, col]) => { b.strokeStyle = col; b.lineWidth = 6; b.beginPath(); b.arc(210, 210, r, Math.PI + 0.16, TAU - 0.16); b.stroke(); });
    chromeText(b, 'NOVA STRIKE', 191, 420, 28);
    // printed shot labels
    const label = (t, x, y, ang = 0) => {
      b.save(); b.translate(x, y); b.rotate(ang); b.font = '900 10px "Arial Black", "Segoe UI", sans-serif'; b.textAlign = 'center';
      b.fillStyle = '#000'; b.fillText(t, 1, 1); b.fillStyle = '#9fd8ff'; b.fillText(t, 0, 0); b.restore();
    };
    label('ORBIT', 31, 302, -Math.PI / 2); label('ORBIT', 351, 302, Math.PI / 2); label('SKYWAY', 190, 452); label('SPIN', 291, 178); label('DOCK', 72, 265); label('SHIELDS', 300, 351);
    // launch lane: dark metal channel with grooves
    g = b.createLinearGradient(372, 0, 410, 0); g.addColorStop(0, '#05071a'); g.addColorStop(0.5, '#262c52'); g.addColorStop(1, '#0a0e2a');
    b.fillStyle = g; b.fillRect(372, 244, 38, 396);
    b.fillStyle = '#3a4270'; for (let y = 260; y < 640; y += 12) b.fillRect(376, y, 30, 1);
    b.fillStyle = '#ffd56b'; [330, 385, 440].forEach(y => { b.beginPath(); b.moveTo(382, y + 8); b.lineTo(391, y - 2); b.lineTo(400, y + 8); b.lineTo(391, y + 3); b.closePath(); b.fill(); });
    // far end of the table sits in shadow
    g = b.createLinearGradient(0, 0, 0, H * 0.5); g.addColorStop(0, 'rgba(0,0,20,.5)'); g.addColorStop(1, 'rgba(0,0,20,0)'); b.fillStyle = g; b.fillRect(0, 0, W, H);
    return c;
  }

  /* ---------- raised walls: side face, top face, bevel highlight ---------- */
  function rails(segs, W, H) {
    const [c, r] = mk(W, H);
    const plain = segs.filter(s => !s.target && !s.sling && !s.rubber && !s.gate && !s.drop);
    const pass = (col, w, dx = 0, dy = 0) => { r.strokeStyle = col; r.lineWidth = w; r.beginPath(); plain.forEach(s => { r.moveTo(s.x1 + dx, s.y1 + dy); r.lineTo(s.x2 + dx, s.y2 + dy); }); r.stroke(); };
    r.lineCap = 'round'; r.lineJoin = 'round';
    pass('rgba(0,0,20,.35)', 12, 7, 16);   // long soft cast shadow
    pass('rgba(0,0,20,.55)', 9, 4, 11);
    for (let k = 10; k >= 2; k -= 2) pass(`rgb(${40 + k * 4},${44 + k * 4},${70 + k * 5})`, 9, 0, k);   // tall side face, lit from the top
    pass('#a8b0cc', 8);                    // top face
    pass('#e4e8f6', 3, -1, -1.5);          // specular edge
    pass('#ffffff', 1, -1.5, -2.5);
    return c;
  }

  /* ---------- ramp + orbit plastics on posts ---------- */
  function lanes(L, W, H) {
    const [c, x] = mk(W, H);
    x.lineCap = 'round'; x.lineJoin = 'round';
    L.forEach(l => {
      const hw = l.key === 'ramp' ? 12 : 8, P = l.pts, left = [], right = [];
      P.forEach((p, i) => {
        const a = P[Math.max(0, i - 1)], q = P[Math.min(P.length - 1, i + 1)];
        let dx = q[0] - a[0], dy = q[1] - a[1]; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
        left.push([p[0] - dy * hw, p[1] + dx * hw]); right.push([p[0] + dy * hw, p[1] - dx * hw]);
      });
      const ribbon = (dx, dy) => { x.beginPath(); left.forEach((p, i) => x[i ? 'lineTo' : 'moveTo'](p[0] + dx, p[1] + dy)); for (let i = right.length - 1; i >= 0; i--) x.lineTo(right[i][0] + dx, right[i][1] + dy); x.closePath(); };
      const rail = (pts, col, w, dx, dy) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); pts.forEach((p, i) => x[i ? 'lineTo' : 'moveTo'](p[0] + dx, p[1] + dy)); x.stroke(); };
      for (let k = 1; k <= 6; k++) { ribbon(k * 2, k * 4); x.fillStyle = 'rgba(0,0,20,.09)'; x.fill(); }      // soft shadow far below: the ramps sit high
      for (let i = 4; i < P.length - 2; i += 14) { const p = P[i]; const pg = x.createLinearGradient(p[0] - 2, 0, p[0] + 2, 0); pg.addColorStop(0, '#5a6080'); pg.addColorStop(0.5, '#e0e6f6'); pg.addColorStop(1, '#4a5070'); x.fillStyle = pg; x.fillRect(p[0] - 2, p[1] - 2, 4, 22); }   // chrome support posts
      ribbon(0, -2); x.fillStyle = l.key === 'ramp' ? 'rgba(90,200,255,.42)' : 'rgba(150,160,255,.32)'; x.fill();   // tinted plastic
      ribbon(0, -2); const sh = x.createLinearGradient(0, 0, W, H); sh.addColorStop(0, 'rgba(255,255,255,.25)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(255,255,255,.12)'); x.fillStyle = sh; x.fill();   // gloss
      [left, right].forEach(s => { rail(s, '#2a2f48', 5, 0, 2); rail(s, '#8a94b8', 3.5, 0, -2); rail(s, '#ffffff', 1.2, -0.5, -3); });
    });
    return c;
  }

  /* ---------- sprites ---------- */
  function ball() {
    const [c, x] = mk(20, 20);
    const g = x.createRadialGradient(7, 6, 1, 10, 10, 10);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, '#dfe6f5'); g.addColorStop(0.6, '#7d88a8'); g.addColorStop(0.85, '#2c3350'); g.addColorStop(1, '#151a2e');
    x.fillStyle = g; x.beginPath(); x.arc(10, 10, 9, 0, TAU); x.fill();
    x.fillStyle = '#8fa0d8'; x.fillRect(12, 14, 3, 1);      // reflected playfield
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
    x.fillStyle = '#20263e'; x.fillRect(150, 14, 82, 20);
    x.font = '900 9px "Arial Black", "Segoe UI", sans-serif'; x.textAlign = 'center'; x.fillStyle = '#ffd56b'; x.fillText('NOVA STRIKE', 191, 28);
    x.font = '700 8px "Segoe UI", sans-serif'; x.fillStyle = '#20263e';
    x.fillText('3 BALLS PER GAME', 80, 20); x.fillText('COMPLETE MISSIONS', 80, 31); x.fillText('TO RANK UP', 300, 20); x.fillText('6 MISSIONS = WARP', 300, 31);
    return c;
  }

  window.PinballArt = { SC, mk, star, chromeText, table, rails, lanes, ball, bumper, halo, apron };
})();
