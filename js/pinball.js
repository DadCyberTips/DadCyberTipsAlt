/**
 * Pinball window: drawing, controls and sound for the engine in pinball-engine.js.
 * Controls: Left Arrow / Z = left flipper, Right Arrow / M or / = right flipper,
 * hold Space to pull the plunger and release to launch, Enter = new game, P = pause.
 * Touch/mouse: left half = left flipper, right half = right flipper,
 * press and hold the launch lane (bottom right) to pull the plunger.
 */
(function() {
  const { createEngine, W, H } = window.PinballEngine;
  const SC = 2;   // draw at 2x for crisp lines

  window.openPinball = function() {
    if (windowManager.wins.has('pinball')) { windowManager.createWindow({ key: 'pinball' }); return; }

    const node = document.createElement('div');
    node.className = 'pb';
    node.innerHTML = `<div class="pb-hud"><span>SCORE <b class="pb-score">0</b></span><span>BALL <b class="pb-ball">1</b>/3</span><span>BONUS <b class="pb-mult">x1</b></span><span>HI <b class="pb-hi">0</b></span></div><canvas class="pb-cv"></canvas>`;
    const cv = node.querySelector('.pb-cv'), ctx = cv.getContext('2d');
    cv.width = W * SC; cv.height = H * SC; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const win = windowManager.createWindow({ key: 'pinball', title: 'Pinball', icon: 'pinball', node, width: W + 2, height: H + 62, left: 300, top: 4 });
    win.style.minWidth = '0'; win.style.minHeight = '0';

    const E = createEngine();
    E.S.hi = +localStorage.getItem('pinball.hi') || 0;
    E.newGame();
    const keys = { L: false, R: false };
    let paused = false, raf = 0;

    /* ---------- sound (through the emulator's master volume) ---------- */
    const snd = (type, f0, f1, dur, vol = 0.12, delay = 0) => {
      const h = window.EmuAudio && EmuAudio.ctxOut();
      if (!h) return;
      const t = h.ctx.currentTime + delay, o = h.ctx.createOscillator(), g = h.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(h.out); o.start(t); o.stop(t + dur + 0.02);
    };
    const arp = notes => notes.forEach((f, i) => snd('sine', f, f * 1.02, 0.14, 0.14, i * 0.09));
    const SOUNDS = {
      bump: () => snd('square', 520, 780, 0.1, 0.1), sling: () => snd('sawtooth', 300, 200, 0.08, 0.08),
      target: () => snd('sine', 880, 1320, 0.12, 0.14), rollover: () => snd('sine', 660, 990, 0.08, 0.1),
      bank: () => arp([523, 659, 784, 1047]), bonus: () => arp([392, 523, 659, 784, 1047]),
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
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
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

    /* ---------- drawing ---------- */
    const bg = document.createElement('canvas');
    bg.width = W * SC; bg.height = H * SC;
    (() => {
      const b = bg.getContext('2d');
      b.scale(SC, SC);
      const gr = b.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0b1140'); gr.addColorStop(1, '#03040f');
      b.fillStyle = gr; b.fillRect(0, 0, W, H);
      const nb = b.createRadialGradient(260, 300, 10, 260, 300, 200); nb.addColorStop(0, 'rgba(140,60,200,.35)'); nb.addColorStop(1, 'rgba(140,60,200,0)');
      b.fillStyle = nb; b.fillRect(0, 0, W, H);
      let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 90; i++) { b.fillStyle = `rgba(255,255,255,${0.3 + rand() * 0.7})`; const s = rand() < 0.15 ? 1.6 : 0.9; b.fillRect(rand() * W, rand() * H, s, s); }
      const pl = b.createRadialGradient(80, 345, 4, 95, 360, 50); pl.addColorStop(0, '#7fd0ff'); pl.addColorStop(1, '#14307a');
      b.fillStyle = pl; b.beginPath(); b.arc(95, 360, 46, 0, Math.PI * 2); b.fill();
      b.strokeStyle = 'rgba(255,213,107,.55)'; b.lineWidth = 3; b.beginPath(); b.ellipse(95, 360, 78, 15, -0.35, 0, Math.PI * 2); b.stroke();
    })();

    const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    const tri = (A, B, C) => { ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...B); ctx.lineTo(...C); ctx.closePath(); ctx.fill(); };
    const text = (t, x, y, size, color = '#cfe8ff') => { ctx.font = `600 ${size}px "Segoe UI", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = color; ctx.fillText(t, x, y); };

    function draw(msg) {
      const S = E.S, g = E.geo;
      ctx.setTransform(SC, 0, 0, SC, 0, 0);
      ctx.drawImage(bg, 0, 0, W, H);
      ctx.fillStyle = 'rgba(76,194,255,.06)'; ctx.fillRect(372, 244, 38, 396);
      ctx.fillStyle = 'rgba(255,95,168,.2)'; tri([52, 420], [52, 482], [98, 482]); tri([330, 420], [330, 482], [284, 482]);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const s of g.segs) {
        if (s.gate) { ctx.strokeStyle = '#ffd56b'; ctx.lineWidth = 2; }
        else if (s.target) { ctx.strokeStyle = s.hit > 0 ? '#fff' : s.lit ? '#ffd56b' : '#5d6f99'; ctx.lineWidth = 6; }
        else if (s.sling || s.kick === 0 && s.e === 0.3 && s.x1 !== 15 && s.x1 !== 367) { ctx.strokeStyle = s.hit > 0 ? '#fff' : '#ff5fa8'; ctx.lineWidth = 3; }
        else { ctx.strokeStyle = '#4cc2ff'; ctx.lineWidth = 3; }
        line(s.x1, s.y1, s.x2, s.y2);
      }
      for (const s of g.sensors) {
        ctx.fillStyle = s.lit ? '#ffd56b' : '#27325f'; ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#4cc2ff'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      for (const c of g.bumpers) {
        const gr = ctx.createRadialGradient(c.x - 6, c.y - 6, 2, c.x, c.y, c.r);
        gr.addColorStop(0, c.lit > 0 ? '#fff' : '#9bdcff'); gr.addColorStop(1, c.lit > 0 ? '#ffd56b' : '#2b6bd6');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#cfe8ff'; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.lineWidth = 14; ctx.strokeStyle = '#ffd56b';
      for (const f of g.flippers) { line(f.px, f.py, f.px + Math.cos(f.ang) * f.len, f.py + Math.sin(f.ang) * f.len); }
      ctx.fillStyle = '#7a5a10';
      for (const f of g.flippers) { ctx.beginPath(); ctx.arc(f.px, f.py, 3.5, 0, Math.PI * 2); ctx.fill(); }

      // plunger power bar
      ctx.fillStyle = '#10163a'; ctx.fillRect(374, 633, 34, 5);
      ctx.fillStyle = S.charge > 0.8 ? '#ff5f5f' : '#ffd56b'; ctx.fillRect(374, 633, 34 * S.charge, 5);

      // ball
      const b = S.ball, bgr = ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, 9);
      bgr.addColorStop(0, '#ffffff'); bgr.addColorStop(1, '#8a97b5');
      ctx.fillStyle = bgr; ctx.beginPath(); ctx.arc(b.x, b.y, 9, 0, Math.PI * 2); ctx.fill();

      if (S.state === 'launch' && S.charge === 0 && !S.pulling) text('Hold SPACE (or the lane) to launch', 190, 410, 13);
      if (S.state === 'over') {
        ctx.fillStyle = 'rgba(0,0,0,.62)'; ctx.fillRect(0, 0, W, H);
        text('GAME OVER', W / 2, 290, 28, '#ffd56b'); text('Score ' + S.score, W / 2, 322, 16);
        text('Press Enter or click to play again', W / 2, 356, 13);
      } else if (msg) { ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, H); text(msg, W / 2, 320, 24, '#ffd56b'); }
    }

    /* ---------- HUD, events, main loop ---------- */
    const q = s => node.querySelector(s), cache = {};
    const setText = (sel, v) => { if (cache[sel] !== v) { cache[sel] = v; q(sel).textContent = v; } };
    function frame(now) {
      if (!node.isConnected) { cancelAnimationFrame(raf); return; }
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      const act = active();
      if (!act) { flip('L', false); flip('R', false); E.S.pulling = false; E.S.charge = 0; }
      else if (!paused) E.step(dt);
      for (const k of E.S.events.splice(0)) {
        if (SOUNDS[k]) SOUNDS[k]();
        if (k === 'over') localStorage.setItem('pinball.hi', E.S.hi);
      }
      draw(act && !paused ? '' : 'PAUSED');
      setText('.pb-score', E.S.score); setText('.pb-ball', Math.min(E.S.ballNo, 3)); setText('.pb-mult', 'x' + E.S.mult); setText('.pb-hi', E.S.hi);
      raf = requestAnimationFrame(frame);
    }
    let last = performance.now();
    raf = requestAnimationFrame(frame);
  };
})();
