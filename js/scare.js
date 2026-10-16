/**
 * Jump scare, triggered by opening setup.exe in File Explorer (node flag: scare).
 *
 * Sequence: the emulator "hangs" 5-8s -> a slow, creeping score builds for several
 * seconds (accelerating heartbeat, rising noise, dissonance, darkening vignette)
 * -> everything cuts to black silence -> the face SLAMS in, cuts out for a beat,
 * and slams in again closer -> back to the desktop.
 *
 * Put your own photo at img/scare.jpg (or .png / .webp). If none is found, a drawn
 * face is used. Audio goes through the master volume (EmuAudio). Once per page
 * load. Esc skips it at any time. Safety: never more than 2 bright flashes in the
 * first 1.3s, no strobing, and "reduce motion" visitors get a calm, single hit.
 */
(function() {
  const CONFIG = {
    freezeMs: [5000, 8000],    // the "Not Responding" hang
    musicMs: [6500, 9500],     // length of the build-up
    silenceMs: [500, 900],     // black + silence right before the scare
    images: ['img/scare.jpg', 'img/scare.png', 'img/scare.webp'],
    focus: ['50%', '40%']      // where the face is in your image (x, y); the zoom grows from here
  };
  const scr = document.getElementById('screen');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let running = false;

  const FACE = `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
    <defs><radialGradient id="sg" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#3a0000"/><stop offset="1" stop-color="#000"/></radialGradient></defs>
    <rect width="400" height="300" fill="url(#sg)"/>
    <ellipse cx="200" cy="150" rx="92" ry="128" fill="#cfcabd"/>
    <path d="M120 82 Q200 22 280 82M205 25 L190 70 L210 95" stroke="#7b776b" stroke-width="3" fill="none"/>
    <ellipse cx="160" cy="125" rx="28" ry="38" fill="#000"/><ellipse cx="240" cy="125" rx="28" ry="38" fill="#000"/>
    <circle cx="162" cy="131" r="4" fill="#fff"/><circle cx="238" cy="131" r="4" fill="#fff"/>
    <path d="M196 150 L186 188 L206 188 Z" fill="#9b968a"/>
    <ellipse cx="200" cy="236" rx="46" ry="38" fill="#000"/>
    <path d="M160 214 L166 234 L172 214 L178 234 L184 214 L190 234 L196 214 L202 234 L208 214 L214 234 L220 214 L226 234 L232 214 L238 234 L244 214 Z" fill="#e9e5d6"/></svg>`;

  // Try img/scare.jpg, .png, .webp in turn; resolves null if none exist
  function loadScareImage() {
    return new Promise(res => {
      let i = 0;
      const next = () => {
        if (i >= CONFIG.images.length) return res(null);
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = next;
        im.src = CONFIG.images[i++];
      };
      next();
    });
  }

  const noiseBuf = (ctx, sec) => {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  };

  /* ---------- The build-up score ---------- */
  function playMusic({ ctx, out }, ms, onBeat) {
    const t0 = ctx.currentTime, dur = ms / 1000, nodes = [], timers = [];
    const add = o => { nodes.push(o); return o; };
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, t0); bus.gain.linearRampToValueAtTime(0.55, t0 + 1.5); bus.connect(out);

    // Echoing music box that speeds up, wobbles out of tune, and picks up a dissonant shadow voice
    const dly = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();
    dly.delayTime.value = 0.34; fb.gain.value = 0.5; wet.gain.value = 0.45;
    dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(bus);
    const notes = [659.25, 622.25, 659.25, 523.25, 493.88, 466.16, 440, 415.3];
    const voice = (freq, gv, tt) => {
      const o = add(ctx.createOscillator()), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = freq;
      o.detune.setValueAtTime(0, tt); o.detune.linearRampToValueAtTime(-45, tt + 1.3);
      g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(gv, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.001, tt + 1.4);
      o.connect(g); g.connect(bus); g.connect(dly); o.start(tt); o.stop(tt + 1.5);
    };
    for (let t = 0, i = 0; t < dur; i++) {
      const p = t / dur;
      voice(notes[i % notes.length], 0.3 + 0.2 * p, t0 + t);
      if (p > 0.35) voice(notes[i % notes.length] * 1.0595, 0.18 * p, t0 + t);
      t += 0.95 - 0.5 * p;
    }

    // Deep detuned drone with a filter that slowly opens
    const lp = ctx.createBiquadFilter(), dg = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(120, t0); lp.frequency.exponentialRampToValueAtTime(500, t0 + dur);
    dg.gain.setValueAtTime(0, t0); dg.gain.linearRampToValueAtTime(0.5, t0 + dur);
    [41.2, 41.9, 82.4].forEach(f => { const o = add(ctx.createOscillator()); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(t0); });
    lp.connect(dg); dg.connect(bus);

    // Rising wash of noise + a thin tone climbing out of reach
    const ns = add(ctx.createBufferSource()), bp = ctx.createBiquadFilter(), rg = ctx.createGain();
    ns.buffer = noiseBuf(ctx, 2); ns.loop = true;
    bp.type = 'bandpass'; bp.Q.value = 5; bp.frequency.setValueAtTime(250, t0); bp.frequency.exponentialRampToValueAtTime(3500, t0 + dur);
    rg.gain.setValueAtTime(0.001, t0); rg.gain.exponentialRampToValueAtTime(0.35, t0 + dur);
    ns.connect(bp); bp.connect(rg); rg.connect(bus); ns.start(t0);
    const hi = add(ctx.createOscillator()), hg = ctx.createGain();
    hi.type = 'sine'; hi.frequency.setValueAtTime(900, t0); hi.frequency.exponentialRampToValueAtTime(2200, t0 + dur);
    hg.gain.setValueAtTime(0.001, t0); hg.gain.exponentialRampToValueAtTime(0.08, t0 + dur);
    hi.connect(hg); hg.connect(bus); hi.start(t0);

    // Heartbeat that speeds up the closer it gets
    const thump = (at, gv) => {
      [[95, 1], [190, 0.4]].forEach(([f, k]) => {
        const o = add(ctx.createOscillator()), g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(f, at); o.frequency.exponentialRampToValueAtTime(f * 0.5, at + 0.14);
        g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(gv * k, at + 0.005); g.gain.exponentialRampToValueAtTime(0.001, at + 0.25);
        o.connect(g); g.connect(bus); o.start(at); o.stop(at + 0.3);
      });
    };
    for (let bt = 1.2; bt < dur; ) {
      const gap = 1.0 - 0.55 * (bt / dur);
      thump(t0 + bt, 0.9);
      thump(t0 + bt + 0.17 * gap + 0.08, 0.6);
      if (onBeat) timers.push(setTimeout(onBeat, bt * 1000));
      bt += gap;
    }

    return { stop() {
      timers.forEach(clearTimeout);
      const n = ctx.currentTime;
      bus.gain.cancelScheduledValues(n); bus.gain.setValueAtTime(0, n);
      nodes.forEach(o => { try { o.stop(n + 0.02); } catch (e) {} });
    } };
  }

  /* ---------- The impact: two heavy, distorted hits ---------- */
  function stab({ ctx, out }, gapSec) {
    const t = ctx.currentTime + 0.02, nodes = [];
    const bus = ctx.createGain(), shaper = ctx.createWaveShaper(), comp = ctx.createDynamicsCompressor();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) curve[i] = Math.tanh((i / 128 - 1) * 3);
    shaper.curve = curve; shaper.oversample = '2x';
    comp.threshold.value = -18; comp.ratio.value = 12;
    bus.gain.value = 0.8; bus.connect(shaper); shaper.connect(comp); comp.connect(out);

    const hit = (at, size) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(size, at); g.gain.exponentialRampToValueAtTime(0.001, at + 1.3);
      g.connect(bus);
      const osc = (type, f0, f1, len) => {
        const o = ctx.createOscillator(); nodes.push(o);
        o.type = type; o.frequency.setValueAtTime(f0, at);
        if (f1) o.frequency.exponentialRampToValueAtTime(f1, at + len);
        o.connect(g); o.start(at); o.stop(at + len + 0.05);
      };
      osc('sine', 80, 28, 1.2);                                               // chest-rattling boom
      [220, 233.08, 311.13, 440, 466.16].forEach(f => osc('sawtooth', f, 0, 1.1)); // dissonant cluster
      osc('sawtooth', 3200, 350, 0.7); osc('sawtooth', 2600, 300, 0.8);      // screech
      const nz = ctx.createBufferSource(); nodes.push(nz);
      nz.buffer = noiseBuf(ctx, 0.8); nz.connect(g); nz.start(at);
    };
    hit(t, 0.9);
    if (gapSec) hit(t + gapSec, 1.0);
    return { stop() { bus.gain.setValueAtTime(0, ctx.currentTime); nodes.forEach(o => { try { o.stop(); } catch (e) {} }); } };
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

    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const h = window.EmuAudio && EmuAudio.ctxOut ? EmuAudio.ctxOut() : null; // unlock audio inside the click
    const imgP = loadScareImage();                                           // preload while it "hangs"
    const freeze = document.createElement('div');
    freeze.id = 'freeze';
    scr.appendChild(freeze);

    // The Explorer window greys out and says "(Not Responding)"
    const ex = document.getElementById('explorer'), tt = ex && ex.querySelector('.title'), oldTitle = tt && tt.textContent;
    if (ex) { ex.classList.add('nr'); tt.textContent = oldTitle + ' (Not Responding)'; }

    let music = null, hits = null, dread = null, scare = null, over = false;
    const cleanup = () => {
      if (over) return;
      over = true;
      document.removeEventListener('keydown', onKey, true);
      if (music) music.stop();
      if (hits) hits.stop();
      freeze.remove(); if (dread) dread.remove(); if (scare) scare.remove();
      if (ex && ex.isConnected) { ex.classList.remove('nr'); tt.textContent = oldTitle; }
      running = false;
    };
    const onKey = e => { if (e.key === 'Escape') cleanup(); }; // always a way out
    document.addEventListener('keydown', onKey, true);

    // 1) The hang
    await wait(rnd(...CONFIG.freezeMs));
    if (over) return;

    // 2) The build-up: darkening vignette + pulsing dim in time with the heartbeat
    const musicMs = rnd(...CONFIG.musicMs);
    dread = document.createElement('div');
    dread.id = 'dread';
    dread.innerHTML = '<div class="dr-pulse"></div>';
    scr.appendChild(dread);
    dread.offsetWidth;
    dread.style.transition = `opacity ${musicMs}ms linear`;
    dread.style.opacity = 1;
    const pulse = dread.firstChild;
    const onBeat = calm ? null : () => { pulse.classList.add('on'); setTimeout(() => pulse.classList.remove('on'), 110); };
    if (h) music = playMusic(h, musicMs, onBeat);
    await wait(musicMs);
    if (over) return;

    // 3) Cut to black and total silence
    if (music) music.stop();
    dread.style.transition = 'opacity .1s'; dread.style.background = '#000'; dread.style.opacity = 1;
    await wait(rnd(...CONFIG.silenceMs));
    if (over) return;

    // 4) The scare
    const img = await Promise.race([imgP, wait(1500).then(() => null)]);
    scare = document.createElement('div');
    scare.id = 'scare';
    scare.style.setProperty('--fx', CONFIG.focus[0]);
    scare.style.setProperty('--fy', CONFIG.focus[1]);
    if (calm) scare.classList.add('calm');
    scare.innerHTML = '<div class="sc-stage"></div><div class="sc-vig"></div><div class="sc-grain"></div>';
    const stage = scare.firstChild;
    if (img) { img.alt = ''; stage.appendChild(img); } else stage.innerHTML = FACE;
    scr.appendChild(scare);

    if (calm) {
      if (h) hits = stab(h, 0);
      await wait(900);
    } else {
      if (h) hits = stab(h, 0.57);
      scare.classList.add('hit');                    // slam in
      await wait(480);
      if (over) return;
      scare.classList.add('off');                    // one-beat blackout...
      await wait(90);
      if (over) return;
      scare.classList.remove('off', 'hit');
      scare.classList.add('hit2');                   // ...and slam in again, closer
      await wait(700);
    }
    if (over) return;
    stage.innerHTML = '';                            // cut to black, then back to the desktop
    await wait(400);
    cleanup();
  };
})();
