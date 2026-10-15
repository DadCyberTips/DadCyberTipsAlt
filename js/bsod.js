/**
 * Random crash: each page load picks a moment between 1:30 and 4:30 after load.
 * The emulator then "blue screens", counts to 100%, goes dark, and reboots
 * (a full page reload). Reloading also resets the update install and the
 * Flag.txt unlock timer back to zero.
 */
(function() {
  const MIN_MS = 90000, MAX_MS = 270000; // 1:30 to 4:30
  const CODES = ['CRITICAL_PROCESS_DIED', 'IRQL_NOT_LESS_OR_EQUAL', 'SYSTEM_SERVICE_EXCEPTION',
                 'KERNEL_SECURITY_CHECK_FAILURE', 'PAGE_FAULT_IN_NONPAGED_AREA', 'MEMORY_MANAGEMENT'];
  const scr = document.getElementById('screen');

  setTimeout(crash, MIN_MS + Math.random() * (MAX_MS - MIN_MS));

  function qr() {
    const n = 25, inFinder = (x, y) => (x < 8 || x >= n - 8) && y < 8 || x < 8 && y >= n - 8;
    let s = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++)
      if (!inFinder(x, y) && Math.random() < 0.5) s += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    [[0, 0], [n - 7, 0], [0, n - 7]].forEach(([x, y]) => {
      s += `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
    });
    return `<svg class="bs-qr" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges">${s}</svg>`;
  }

  function crash() {
    const code = CODES[(Math.random() * CODES.length) | 0];
    const b = document.createElement('div');
    b.id = 'bsod';
    b.innerHTML = `<div class="bs-in">
      <div class="bs-face">:(</div>
      <p class="bs-msg">Your device ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.</p>
      <p class="bs-pct"><span class="bs-n">0</span>% complete</p>
      <div class="bs-row">${qr()}<div class="bs-info">
        <p>For more information about this issue and possible fixes, visit https://www.windows.com/stopcode</p>
        <p>If you call a support person, give them this info:<br>Stop code: ${code}</p>
      </div></div></div>`;
    scr.appendChild(b);

    const num = b.querySelector('.bs-n');
    let n = 0;
    const step = () => {
      n = Math.min(100, n + Math.ceil(Math.random() * 12));
      num.textContent = n;
      if (n < 100) setTimeout(step, 250 + Math.random() * 400);
      else setTimeout(() => { b.classList.add('off'); setTimeout(() => location.reload(), 1500); }, 800);
    };
    setTimeout(step, 1200);
  }
})();
