/**
 * EmuAudio: the emulator's master volume. The tray volume slider, the mute
 * button and the Settings > System > Sound slider all control it, and anything
 * that plays sound through it (or through an <audio>/<video> tag) follows.
 *
 *   EmuAudio.play('audio/song.mp3', { loop: true })  // start music, returns the <audio>
 *   EmuAudio.track(el)      // make an existing media element follow the volume
 *   EmuAudio.connect(el)    // optional: route through Web Audio (needed on iOS, same-origin files only)
 *   EmuAudio.ding()         // the little chime played when the slider is released
 *   EmuAudio.ctxOut()       // { ctx, out } to synthesize your own sounds through the master volume
 *   EmuAudio.vol / .muted   // current state (0-100 / boolean)
 */
(function() {
  const sv = localStorage.getItem('vol');
  const S = { vol: sv === null ? 50 : Math.max(0, Math.min(100, +sv || 0)), muted: localStorage.getItem('muted') === '1' };
  const media = new Set(), routed = new WeakSet();
  let ctx = null, master = null;

  const gain = () => S.muted ? 0 : Math.pow(S.vol / 100, 2); // audio taper: quieter at low settings
  function applyEl(el) { el.volume = routed.has(el) ? 1 : Math.min(1, gain() * (parseFloat(el.dataset.vol) || 1)); }

  function audioCtx() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C(); master = ctx.createGain(); master.connect(ctx.destination);
    }
    master.gain.value = gain();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  const api = {
    get vol() { return S.vol; },
    get muted() { return S.muted; },
    set(vol, muted) {
      S.vol = Math.max(0, Math.min(100, Math.round(vol)));
      S.muted = muted === undefined ? (S.vol > 0 ? false : S.muted) : !!muted;
      localStorage.setItem('vol', S.vol);
      localStorage.setItem('muted', S.muted ? '1' : '0');
      if (master) master.gain.value = gain();
      media.forEach(applyEl);
      window.dispatchEvent(new Event('emuvolume'));
    },
    track(el) { media.add(el); applyEl(el); return el; },
    connect(el) {
      const c = audioCtx();
      if (!c || routed.has(el)) return;
      c.createMediaElementSource(el).connect(master);
      routed.add(el); media.add(el); applyEl(el);
    },
    play(src, opt = {}) {
      const a = new Audio(src);
      a.loop = !!opt.loop; a.dataset.vol = opt.volume ?? 1;
      api.track(a);
      a.play().catch(() => {});
      return a;
    },
    ctxOut() { const c = audioCtx(); return c ? { ctx: c, out: master } : null; }, // for custom synthesized sounds
    ding() {
      const c = audioCtx();
      if (!c) return;
      const t = c.currentTime;
      [[880, 0], [1318, 0.09]].forEach(([f, d]) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0, t + d);
        g.gain.linearRampToValueAtTime(0.25, t + d + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.35);
        o.connect(g); g.connect(master);
        o.start(t + d); o.stop(t + d + 0.4);
      });
    }
  };
  window.EmuAudio = api;

  // Any <audio>/<video> tags on the page (now or added later) follow the master volume
  document.querySelectorAll('audio,video').forEach(api.track);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => {
    if (n.nodeType !== 1) return;
    if (/^(AUDIO|VIDEO)$/.test(n.tagName)) api.track(n);
    n.querySelectorAll && n.querySelectorAll('audio,video').forEach(api.track);
  }))).observe(document.documentElement, { childList: true, subtree: true });
})();
