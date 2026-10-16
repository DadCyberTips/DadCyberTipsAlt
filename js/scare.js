/**
 * Jump scare, triggered by opening setup.exe in File Explorer (node flag: scare).
 * Sequence: the emulator "hangs" for 5-8s -> slow synthesized music creeps in
 * -> music cuts to silence -> the scare hits. Audio goes through the master
 * volume (EmuAudio). Once per page load; Esc skips it at any time; no strobing.
 */
(function() {
  const CONFIG = { freezeMs: [5000, 8000], musicMs: [4000, 6000], silenceMs: [400, 700], scareMs: 900, blackMs: 300 };
  const scr = document.getElementById('screen');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let running = false;

  const FACE = `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
    <defs><radialGradient id="sg" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#3a0000"/><stop offset="1" stop-color="#000"/></radialGradient></defs>
    <rect width="400" height="300" fill="url(#sg)"/>
    <g class="sc-face">
      <ellipse cx="200" cy="150" rx="92" ry="128" fill="#cfcabd"/>
      <path d="M120 82 Q200 22 280 82M205 25 L190 70 L210 95" stroke="#7b776b" stroke-width="3" fill="none"/>
      <ellipse cx="160" cy="125" rx="28" ry="38" fill="#000"/><ellipse cx="240" cy="125" rx="28" ry="38" fill="#000"/>
      <circle cx="162" cy="131" r="4" fill="#fff"/><circle cx="238" cy="131" r="4" fill="#fff"/>
      <path d="M196 150 L186 188 L206 188 Z" fill="#9b968a"/>
      <ellipse cx="200" cy="236" rx="46" ry="38" fill="#000"/>
      <path d="M160 214 L166 234 L172 214 L178 234 L184 214 L190 234 L196 214 L202 234 L208 214 L214 234 L220 214 L226 234 L232 214 L238 234 L244 214 Z" fill="#e9e5d6"/>
    </g></svg>`;

  function playMusic({ ctx, out }, ms) {
    const t0 = ctx.currentTime, dur = ms / 1000, nodes = [];
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, t0); bus.gain.linearRampToValueAtTime(0.5, t0 + 1.2); bus.connect(out);
    // slow music-box melody in a minor key
    const notes = [440, 523.25, 659.25, 622.25, 523.25, 440, 415.3, 440];
    for (let i = 0; i * 0.7 < dur; i++) {
      const tt = t0 + i * 0.7, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = notes[i % notes.length];
      g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(0.35, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.001, tt + 1.3);
      o.connect(g); g.connect(bus); o.start(tt); o.stop(tt + 1.4); nodes.push(o);
    }
    // low drone that swells, plus a thin tone creeping upward
    const d = ctx.createOscillator(), dg = ctx.createGain(), lp = ctx.createBiquadFilter();
    d.type = 'sawtooth'; d.frequency.setValueAtTime(55, t0); d.frequency.linearRampToValueAtTime(62, t0 + dur);
    lp.type = 'lowpass'; lp.frequency.value = 180;
    dg.gain.setValueAtTime(0, t0); dg.gain.linearRampToValueAtTime(0.35, t0 + dur);
    d.connect(lp); lp.connect(dg); dg.connect(bus); d.start(t0); nodes.push(d);
    const s = ctx.createOscillator(), sg = ctx.createGain();
    s.type = 'sine'; s.frequency.setValueAtTime(880, t0); s.frequency.exponentialRampToValueAtTime(1000, t0 + dur);
    sg.gain.setValueAtTime(0, t0); sg.gain.linearRampToValueAtTime(0.06, t0 + dur);
    s.connect(sg); sg.connect(bus); s.start(t0); nodes.push(s);
    return { stop() {
      const n = ctx.currentTime;
      bus.gain.cancelScheduledValues(n); bus.gain.setValueAtTime(0, n);
      nodes.forEach(o => { try { o.stop(n + 0.02); } catch (e) {} });
    } };
  }

  function stab({ ctx, out }) {
    const t = ctx.currentTime, comp = ctx.createDynamicsCompressor(), g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    g.connect(comp); comp.connect(out);
    [[440, 'sawtooth'], [466.16, 'sawtooth'], [622.25, 'square']].forEach(([f, ty]) => {
      const o = ctx.createOscillator(); o.type = ty; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + 0.9);
    });
    const sc = ctx.createOscillator();
    sc.type = 'sawtooth'; sc.frequency.setValueAtTime(2000, t); sc.frequency.exponentialRampToValueAtTime(320, t + 0.6);
    sc.connect(g); sc.start(t); sc.stop(t + 0.7);
    const len = ctx.sampleRate * 0.5, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const nz = ctx.createBufferSource(); nz.buffer = buf; nz.connect(g); nz.start(t);
  }

  function plainMessage() {
    windowManager.createWindow({
      key: 'setup-msg', title: 'setup.exe', icon: 'doc', width: 450, height: 270, top: 180, left: 140,
      content: `<div class="dialog"><h2>Windows protected your PC</h2><p>This app can't run on your PC. To find a version for your PC, check with the software publisher.</p></div>`
    });
  }

  window.runJumpScare = async function() {
    if (running) return;
    if (window.scareDone) { plainMessage(); return; }
    running = true; window.scareDone = true;

    const h = window.EmuAudio && EmuAudio.ctxOut ? EmuAudio.ctxOut() : null; // unlock audio inside the click
    const freeze = document.createElement('div');
    freeze.id = 'freeze';
    scr.appendChild(freeze);

    // The Explorer window greys out and says "(Not Responding)"
    const ex = document.getElementById('explorer'), tt = ex && ex.querySelector('.title'), oldTitle = tt && tt.textContent;
    if (ex) { ex.classList.add('nr'); tt.textContent = oldTitle + ' (Not Responding)'; }

    let music = null, scare = null, over = false;
    const cleanup = () => {
      if (over) return;
      over = true;
      document.removeEventListener('keydown', onKey, true);
      if (music) music.stop();
      freeze.remove(); if (scare) scare.remove();
      if (ex && ex.isConnected) { ex.classList.remove('nr'); tt.textContent = oldTitle; }
      running = false;
    };
    const onKey = e => { if (e.key === 'Escape') cleanup(); }; // always a way out
    document.addEventListener('keydown', onKey, true);

    await wait(rnd(...CONFIG.freezeMs));
    if (over) return;
    const musicMs = rnd(...CONFIG.musicMs);
    if (h) music = playMusic(h, musicMs);
    await wait(h ? musicMs : 0);
    if (over) return;
    if (music) music.stop();                       // cut to silence...
    await wait(rnd(...CONFIG.silenceMs));
    if (over) return;

    scare = document.createElement('div');          // ...then the scare
    scare.id = 'scare';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) scare.classList.add('calm');
    scare.innerHTML = FACE;
    scr.appendChild(scare);
    if (h) stab(h);
    await wait(CONFIG.scareMs);
    if (over) return;
    scare.innerHTML = '';                            // quick cut to black, then back to the desktop
    await wait(CONFIG.blackMs);
    cleanup();
  };
})();
