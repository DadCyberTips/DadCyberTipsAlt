/**
 * Update Simulator
 * The user starts the update from Settings > Windows Update. A non-blocking
 * progress panel then appears; progress wanders up and down, shows exactly 23%
 * at the moment Flag.txt unlocks, and parks at 99% after ~4 minutes.
 * It never completes. Flag.txt unlocks 45s-1:15 after the install is started.
 */
(function() {
  const DURATION = 240000;                     // ms until it sticks at 99%
  const UNLOCK_MIN = 45000, UNLOCK_MAX = 75000; // unlock moment, after install starts
  const AT_UNLOCK = 23;                         // % shown at the unlock moment
  const modal = document.getElementById('update-modal');
  const progressEl = document.getElementById('update-progress');
  const percentEl = document.getElementById('update-percent');
  const rnd = (a, b) => a + Math.random() * (b - a);

  function render(n) {
    window.updatePct = n;
    progressEl.style.width = n + '%';
    percentEl.textContent = n + '% complete';
    // Keep the Settings > Windows Update page in sync, if it is open
    document.querySelectorAll('.su-pct').forEach(e => { e.textContent = n + '% complete'; });
    document.querySelectorAll('.su-bar').forEach(e => { e.style.width = n + '%'; });
  }

  window.startUpdateSimulation = async function() {
    if (window.updateInProgress) return;
    window.updateInProgress = true;
    if (window.scheduleCrash) window.scheduleCrash();
    if (typeof windowManager !== 'undefined') windowManager.closeWindow('blocked');

    modal.style.display = 'flex';
    render(0);

    const unlockAt = rnd(UNLOCK_MIN, UNLOCK_MAX);
    setTimeout(() => {
      render(AT_UNLOCK);
      if (!window.docLocked) window.docUnlocked = true;
      if (typeof windowManager !== 'undefined') windowManager.closeWindow('blocked');
    }, unlockAt);

    // Expected progress: 0 -> 23% by the unlock moment, then 23% -> 98% by DURATION
    const target = t => t < unlockAt
      ? AT_UNLOCK * (t / unlockAt)
      : AT_UNLOCK + (98 - AT_UNLOCK) * Math.pow((t - unlockAt) / (DURATION - unlockAt), 0.85);

    const t0 = performance.now();
    let shown = 0;
    while (true) {
      const t = performance.now() - t0;
      if (t >= DURATION) { render(99); break; }

      const bias = t < 10000 ? 2 : 0;
      let next = Math.round(target(t) + bias + rnd(-3.5, 4.5));
      next = Math.max(0, Math.min(98, next));
      if (next === shown && Math.random() < 0.5) next = Math.max(0, Math.min(98, shown + (Math.random() < 0.5 ? -2 : 3)));
      shown = next;
      render(shown);

      // Usually a few seconds between changes, sometimes a long stall
      const wait = Math.random() < 0.1 ? rnd(8000, 14000) : rnd(1200, 4500);
      await delay(Math.min(wait, DURATION - t));
    }
  };
})();
