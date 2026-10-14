/**
 * Light deterrents against casual inspection. These are speed bumps only:
 * anyone determined can still open developer tools or read the source.
 * Set ENABLED to false (or remove the script tag) while developing.
 */
(function() {
  const ENABLED = true;
  if (!ENABLED) return;

  // Block right-click and the common inspect / view-source / save shortcuts
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    const k = (e.key || '').toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    const devKeys = e.key === 'F12' ||
      (mod && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) ||   // Ctrl/Cmd+Shift+I/J/C/K
      (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(k)) || // Cmd+Opt+I/J/C/U
      (mod && ['u', 's'].includes(k));                              // view source / save page
    if (devKeys) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // Cover the page while developer tools appear to be open (desktop browsers only)
  const cover = document.createElement('div');
  cover.style.cssText = 'position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;background:#000;color:#fff;font:16px system-ui,sans-serif';
  cover.textContent = 'Developer tools are not supported on this page.';
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(cover));

  const probe = new Image();
  let consoleOpen = false;
  Object.defineProperty(probe, 'id', { get() { consoleOpen = true; return ''; } });

  const desktop = window.matchMedia('(pointer: fine)').matches;
  setInterval(() => {
    consoleOpen = false;
    console.debug(probe);
    console.clear();
    const docked = desktop && (outerWidth - innerWidth > 200 || outerHeight - innerHeight > 200);
    cover.style.display = (consoleOpen || docked) ? 'flex' : 'none';
  }, 1000);
})();
