/**
 * Settings app: sidebar navigation. Windows Update is the last entry and is
 * where the (fictional) update gets started.
 */
(function() {
  const NAV = [
    ['system', 'System', '🖥️'], ['bluetooth', 'Bluetooth & devices', '🎧'],
    ['network', 'Network & internet', '🌐'], ['personal', 'Personalization', '🎨'],
    ['apps', 'Apps', '🧩'], ['accounts', 'Accounts', '👤'],
    ['time', 'Time & language', '🕒'], ['privacy', 'Privacy & security', '🔒'],
    ['update', 'Windows Update', '🔄']
  ];
  const row = (t, d) => `<div class="settings-item"><h4>${t}</h4><p>${d}</p></div>`;

  function storageKB() {
    let b = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      b += k.length + (localStorage.getItem(k) || '').length;
    }
    return (b / 1024).toFixed(1);
  }

  function updatePane() {
    const busy = window.updateInProgress, pct = window.updatePct || 0;
    const body = busy
      ? `<p class="su-status">Installing — <span class="su-pct">${pct}% complete</span></p>
         <div class="progress-bar"><div class="progress-fill su-bar" style="width:${pct}%"></div></div>`
      : `<p class="su-status">Status: Pending download</p>
         <button class="btn" id="su-install">Download &amp; install</button>`;
    return `<div class="su-head"><h3>${busy ? 'Installing updates' : 'Updates available'}</h3><p>Last checked: today</p></div>
      <div class="su-card"><div class="su-item">
        <b>2026-10 Cumulative Security Update for Windows 11 (KB13375069)</b>
        <p>Fixes CVE-2026-31337, a critical Windows Kernel elevation of privilege vulnerability.</p>
        ${body}
      </div></div>`;
  }

  const PANES = {
    system: () => row('💾 Storage', `Local storage usage: ${storageKB()} KB used`) + row('🖼️ Appearance', 'Theme: Light') + row('ℹ️ Version', 'Web Desktop Simulator v1.1.0'),
    network: () => row('Ethernet', 'Connected'),
    update: updatePane
  };

  windowManager.openSettingsWindow = function() {
    const n = document.createElement('div');
    n.className = 'settings-app';
    n.innerHTML = '<div class="settings-nav"></div><div class="settings-main"></div>';
    const nav = n.querySelector('.settings-nav'), main = n.querySelector('.settings-main');

    const show = id => {
      nav.querySelectorAll('.nav-item').forEach(e => e.classList.toggle('sel', e.dataset.id === id));
      const title = NAV.find(x => x[0] === id)[1];
      main.innerHTML = `<h1>${title}</h1>` + (PANES[id] ? PANES[id]() : row('', "These settings aren't available in this simulation."));
      const b = main.querySelector('#su-install');
      if (b) b.addEventListener('click', () => { window.startUpdateSimulation(); show('update'); });
    };

    NAV.forEach(([id, label, icon]) => {
      const d = document.createElement('div');
      d.className = 'nav-item';
      d.dataset.id = id;
      d.innerHTML = `<span>${icon}</span>${label}`;
      d.addEventListener('pointerdown', () => show(id));
      nav.appendChild(d);
    });
    show('system');

    return this.createWindow({ key: 'settings', title: 'Settings', icon: 'gear', node: n, width: 720, height: 480, top: 50, left: 60 });
  };
})();
