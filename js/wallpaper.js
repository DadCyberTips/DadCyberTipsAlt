/**
 * Desktop wallpaper video: plays muted on an endless loop for as long as the
 * page is open. If the browser pauses it (power saving, tab switching, blocked
 * autoplay) it is resumed automatically, including on the first click or key press.
 */
(function() {
  const v = document.getElementById('wallpaper-video');
  if (!v) return;
  const go = () => { v.play().catch(() => {}); };

  v.loop = true; v.muted = true;
  v.addEventListener('ended', () => { v.currentTime = 0; go(); });
  v.addEventListener('pause', () => { if (!document.hidden) go(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) go(); });
  ['pointerdown', 'keydown'].forEach(e => document.addEventListener(e, go, { once: true, capture: true }));
  go();
})();
