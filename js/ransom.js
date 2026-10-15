/**
 * Fake ransomware event (fictional CTF scenario). Nothing is encrypted and no
 * payment exists: it locks Flag.txt, swaps the desktop for a ransom note and
 * counts down. It lasts until the page is reloaded.
 */
(function() {
  const solved = () => window.flagOpened || localStorage.getItem('flagFound');

  window.triggerRansom = function() {
    if (solved() || window.ransomActive) return;
    window.ransomActive = true;
    window.docLocked = true;
    window.docUnlocked = false;

    if (typeof closeStartMenu === 'function') closeStartMenu();
    document.getElementById('update-modal').style.display = 'none';
    ['doc', 'blocked'].forEach(k => windowManager.closeWindow(k));

    // The file icon becomes a locked file
    const ic = document.getElementById('doc-icon');
    ic.querySelector('use').setAttribute('href', '#i-lock');
    ic.querySelector('span').textContent = 'Flag.txt.locked';

    // Ransom note replaces the desktop background
    const r = document.createElement('div');
    r.id = 'ransom';
    r.innerHTML = `<div class="rs-card">
      <div class="rs-head"><span class="rs-lock">🔒</span><h1>YOUR FILES HAVE BEEN LOCKED</h1></div>
      <p>Flag.txt and every other file on this machine were encrypted with <b>SnackCrypt-9000</b>.</p>
      <p>The only copy of the decryption key is held by the SnackSpaceCon Syndicate.</p>
      <p>Send <b>1.337 SnackCoin</b> to the wallet below to recover your files:</p>
      <div class="rs-wallet">SNACK-F4KE-0000-1337-C0DE</div>
      <div class="rs-timer"><small>Time left until the key is destroyed</small><b class="rs-clock">72:00:00</b></div>
      <div class="rs-btns"><button class="rs-check">Check payment</button><button class="rs-dec">Decrypt files</button></div>
      <p class="rs-msg"></p>
      <p class="rs-fine">This is a fictional scenario for the Dad Cyber Tips x SnackSpaceCon CTF. No payment is requested or possible.</p>
    </div>`;
    document.getElementById('wallpaper').after(r);

    const msg = r.querySelector('.rs-msg');
    r.querySelector('.rs-check').addEventListener('click', () => { msg.textContent = 'No payment detected. The clock is still ticking...'; });
    r.querySelector('.rs-dec').addEventListener('click', () => { msg.textContent = 'Decryption key not found. Payment required.'; });

    let secs = 72 * 3600;
    const clock = r.querySelector('.rs-clock');
    setInterval(() => {
      secs = Math.max(0, secs - 1);
      const p = n => String(n).padStart(2, '0');
      clock.textContent = `${p((secs / 3600) | 0)}:${p(((secs % 3600) / 60) | 0)}:${p(secs % 60)}`;
    }, 1000);
  };
})();
