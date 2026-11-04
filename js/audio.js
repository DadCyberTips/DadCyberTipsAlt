/**
 * EmuAudio: the emulator's master volume. The tray volume slider, the mute
 * button and the Settings > System > Sound slider all control it, and anything
 * that plays sound through it (or through an <audio>/<video> tag) follows.
 *
 *   EmuAudio.track(el)      // make a media element follow the volume (done automatically for <audio>/<video>)
 *   EmuAudio.ding()         // the little chime played when the slider is released
 *   EmuAudio.ctxOut()       // { ctx, out } to synthesize your own sounds through the master volume
 *   EmuAudio.vol / .muted   // current state (0-100 / boolean)
 */
(function() {
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };   // storage can be blocked
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const sv = get('vol');
  const S = { vol: sv === null ? 50 : Math.max(0, Math.min(100, +sv || 0)), muted: get('muted') === '1' };
  const media = new Set();
  let ctx = null, master = null;

  const gain = () => S.muted ? 0 : Math.pow(S.vol / 100, 2); // audio taper: quieter at low settings
  function applyEl(el) { el.volume = Math.min(1, gain() * (parseFloat(el.dataset.vol) || 1)); }

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
      put('vol', S.vol);
      put('muted', S.muted ? '1' : '0');
      if (master) master.gain.value = gain();
      media.forEach(applyEl);
      window.dispatchEvent(new Event('emuvolume'));
    },
    track(el) { media.add(el); applyEl(el); return el; },
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
