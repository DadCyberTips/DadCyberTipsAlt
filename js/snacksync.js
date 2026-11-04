/**
 * SnackSync: "something else is on this PC". snacksync.exe (PID 4242) is behind:
 *  - the webcam: Camera says it is in use by snacksync.exe, and a red camera light appears at the top of the screen
 *  - whispers: from WHISPER_AT, a faint whisper plays now and then; muting in the tray shows a hint
 *  - remote control: from TAKEOVER_AT, a second cursor opens Notepad and types a message (Esc interrupts it; it comes back)
 * Ending snacksync.exe stops all of it for the rest of the visit: Task Manager > Processes > SnackSync > End task,
 * taskkill /im snacksync.exe, or Stop-Process -Name snacksync.
 */
(function() {
  const WHISPER_AT = 10 * 60e3, WHISPER_GAP = [35e3, 70e3];   // first whisper after 10 min, then every 35-70 s
  const TAKEOVER_AT = 13 * 60e3, TAKEOVER_GAP = [180e3, 300e3]; // first takeover after 13 min, then every 3-5 min
  const scr = document.getElementById('screen');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const SS = window.SnackSync = { alive: true, whispering: false };

  /* ---------- Windows-style toast notification ---------- */
  SS.toast = function(title, text, ms = 7000) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = '<b></b><p></p>';
    t.firstChild.textContent = title; t.lastChild.textContent = text;
    scr.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 400); }, ms);
  };

  /* ---------- Webcam ---------- */
  let led = null;
  const cameraLight = () => { if (SS.alive && !led) { led = document.createElement('div'); led.id = 'cam-led'; led.title = 'Your camera is on'; scr.appendChild(led); } };
  window.openCamera = function() {
    if (windowManager.wins.has('camera')) { windowManager.createWindow({ key: 'camera' }); return; }
    const n = document.createElement('div');
    n.className = 'perm';
    n.innerHTML = '<div class="perm-body"><span class="perm-ic">📷</span><div><h3></h3><p class="perm-txt"></p><p class="perm-path"></p></div></div><div class="perm-btns"><button>OK</button></div>';
    n.querySelector('h3').textContent = SS.alive ? "We can't start your camera" : "We can't find your camera";
    n.querySelector('.perm-txt').textContent = SS.alive ? "It's being used by another app: snacksync.exe. Close that app and try again." : "Check that it's connected and installed properly.";
    n.querySelector('.perm-path').textContent = SS.alive ? '0xA00F4243 (0xC00D3704)' : '0xA00F4244 (0xC00D36D5)';
    const w = windowManager.createWindow({ key: 'camera', title: 'Camera', icon: 'camera', node: n, width: 470, height: 230, top: 160, left: 240 });
    w.style.minWidth = '0'; w.style.minHeight = '0';
    n.querySelector('button').addEventListener('click', () => windowManager.closeWindow('camera'));
    cameraLight();
  };

  /* ---------- Whispers: band-passed noise shaped into syllables, at low volume, panned left or right ---------- */
  function whisper() {
    const h = window.EmuAudio && EmuAudio.ctxOut();
    if (!h) return;
    const { ctx, out } = h, t0 = ctx.currentTime + 0.05, len = 3;
    const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf; f1.type = f2.type = 'bandpass'; f1.Q.value = 6; f2.Q.value = 9;
    const FORMANTS = [[700, 1200], [400, 2200], [600, 1000], [300, 2500], [500, 1800]];
    g.gain.setValueAtTime(0, t0);
    let t = t0;
    for (let i = 0, n = 5 + (Math.random() * 4 | 0); i < n; i++) {
      const dur = rnd(0.12, 0.3), F = FORMANTS[(Math.random() * FORMANTS.length) | 0];
      f1.frequency.setValueAtTime(F[0] * rnd(0.9, 1.1), t); f2.frequency.setValueAtTime(F[1] * rnd(0.9, 1.1), t);
      g.gain.linearRampToValueAtTime(rnd(0.05, 0.09), t + dur * 0.3); g.gain.linearRampToValueAtTime(0.004, t + dur);
      t += dur + rnd(0.03, 0.14);
    }
    g.gain.linearRampToValueAtTime(0, t + 0.1);
    src.connect(f1); src.connect(f2); f1.connect(g); f2.connect(g);
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = rnd(-0.8, 0.8); g.connect(p); p.connect(out); } else g.connect(out);
    src.start(t0); src.stop(t0 + len);
  }
  const whisperLoop = () => { if (!SS.alive) return; SS.whispering = true; whisper(); SS.whisperT = setTimeout(whisperLoop, rnd(...WHISPER_GAP)); };
  let hinted = false;
  window.addEventListener('emuvolume', () => {
    if (!SS.alive || !SS.whispering || hinted || !EmuAudio.muted) return;
    hinted = true;
    SS.toast('Sound', 'Speakers muted. snacksync.exe (PID 4242) is still using the microphone.', 9000);
  });

  /* ---------- Remote control: a second cursor opens Notepad and types ---------- */
  let running = null;
  function takeover() {
    if (!SS.alive || running) return;
    cameraLight();
    const cur = document.createElement('div');
    cur.id = 'ghost-cursor';
    cur.innerHTML = '<svg viewBox="0 0 16 24"><path d="M1 1v19l5-5 3.5 7 3-1.5L9 14h7z" fill="#fff" stroke="#000" stroke-width="1.2"/></svg>';
    scr.appendChild(cur);
    const W = scr.offsetWidth, H = scr.offsetHeight, timers = [];
    let x = W * 0.85, y = H * 0.15, stop = false;
    const place = () => { cur.style.transform = `translate(${x}px,${y}px)`; };
    const wait = ms => new Promise(r => timers.push(setTimeout(r, ms)));
    const glide = (tx, ty, ms) => new Promise(res => {             // eased movement with a slight human wobble
      const sx = x, sy = y, t0 = performance.now();
      const f = now => {
        if (stop) return res();
        const k = Math.min(1, (now - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        x = sx + (tx - sx) * e + Math.sin(k * 9) * 6 * (1 - k); y = sy + (ty - sy) * e; place();
        if (k < 1) requestAnimationFrame(f); else res();
      };
      requestAnimationFrame(f);
    });
    const onKey = e => { if (e.key === 'Escape') end(); };
    const end = () => {
      if (stop) return;
      stop = true; timers.forEach(clearTimeout); cur.remove(); running = null;
      document.removeEventListener('keydown', onKey, true);
      if (SS.alive) SS.next = setTimeout(takeover, rnd(...TAKEOVER_GAP));   // it comes back until snacksync.exe is ended
    };
    document.addEventListener('keydown', onKey, true);
    running = { end };
    (async () => {
      place();
      await glide(W * 0.5, H - 30, 1800); await wait(450); if (stop) return;
      window.launchApp('notepad'); await wait(700); if (stop) return;
      const ta = document.querySelector('#notepad textarea');
      if (!ta) { end(); return; }
      const r = ta.getBoundingClientRect(), sr = scr.getBoundingClientRect(), k = sr.width / scr.offsetWidth;
      await glide((r.left - sr.left) / k + 40, (r.top - sr.top) / k + 30, 1200); if (stop) return;
      for (const ch of '\n\nhello guest.\ni can see you.\nyour snacks belong to the syndicate now.\n\n- snacksync\n') {
        if (stop) return;
        ta.value += ch; ta.scrollTop = ta.scrollHeight;              // not saved: Notepad only saves what the player types
        await wait(ch === '\n' ? 420 : rnd(60, 160));
      }
      await wait(1500); await glide(W * 0.9, H * 0.1, 1500); await wait(600);
      end();
    })();
  }

  /* ---------- Ending snacksync.exe stops everything ---------- */
  SS.kill = function() {
    if (!SS.alive) return false;
    SS.alive = false;
    clearTimeout(SS.whisperT); clearTimeout(SS.next);
    if (running) running.end();
    if (led) { led.remove(); led = null; }
    SS.toast('Task Manager', 'snacksync.exe has been ended. The camera light is off and the whispering has stopped.');
    return true;
  };

  SS.whisperT = setTimeout(whisperLoop, WHISPER_AT);
  SS.next = setTimeout(takeover, TAKEOVER_AT);
})();
