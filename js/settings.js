/**
 * Settings app: sidebar navigation with mock data on every page. Windows Update
 * is where the (fictional) update gets started. The Sound slider is live and
 * controls the same master volume as the tray (see audio.js).
 */
(function() {
  const NAV = [
    ['system', 'System', '🖥️'], ['bluetooth', 'Bluetooth & devices', '🎧'],
    ['network', 'Network & internet', '🌐'], ['personal', 'Personalization', '🎨'],
    ['apps', 'Apps', '🧩'], ['accounts', 'Accounts', '👤'],
    ['time', 'Time & language', '🕒'], ['privacy', 'Privacy & security', '🔒'],
    ['update', 'Windows Update', '🔄']
  ];
  const row = (t, d, r) => `<div class="settings-item"><div><h4>${t}</h4>${d ? `<p>${d}</p>` : ''}</div>${r ? `<div class="si-r">${r}</div>` : ''}</div>`;
  const tog = on => `<span class="tog${on ? ' on' : ''}"></span>`;

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
      </div></div>
      <div style="height:10px"></div>
      ${row('Pause updates', 'Temporarily stop updates from installing', '1 week ▾')}
      ${row('Update history', '3 updates installed in the last 90 days', '›')}
      ${row('Advanced options', 'Optional updates, delivery optimization, active hours', '›')}`;
  }

  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return 'Local time'; } })();
  const PANES = {
    system: () =>
      row('🖥️ Display', 'Generic PnP Monitor · 1024 × 768 (Recommended) · 60 Hz') +
      row('🔊 Sound', 'Speakers (High Definition Audio)', '<input type="range" class="si-slider" min="0" max="100">') +
      row('🔔 Notifications', 'Get notifications from apps and other senders', tog(1)) +
      row('🔋 Power', 'Power mode: Balanced · Plugged in') +
      row('💾 Storage', '98.4 GB of 237 GB used (Local Disk C:)') +
      row('ℹ️ About', 'DESKTOP-SNACK01 · Intel(R) Core(TM) i5-10400 CPU @ 2.90GHz · 16.0 GB RAM · 64-bit operating system, x64-based processor') +
      row('🪟 Windows specifications', 'Edition Windows 11 Pro · Version 24H2 · OS build 26100.2033') +
      row('🧩 Simulator', 'Web Desktop Simulator v1.1.0'),
    bluetooth: () =>
      row('Bluetooth', 'Discoverable as "DESKTOP-SNACK01"', tog(1)) +
      row('⌨️ Wireless Keyboard', 'Connected · Battery 82%') +
      row('🖱️ Wireless Mouse', 'Connected · Battery 64%') +
      row('🎧 Bluetooth Headphones', 'Paired · Not connected') +
      row('🖨️ Office Laser Printer', 'Ready · Default printer') +
      row('📱 Phone Link', 'Not set up', '›'),
    network: () =>
      row('Ethernet', 'Connected · Private network', 'Connected') +
      row('IP address (IPv4)', `${SYS.net.ip} · Gateway ${SYS.net.gw} · DNS ${SYS.net.dns}`) +
      row('Physical address (MAC)', '00-1A-2B-3C-4D-5E · Link speed 1000/1000 (Mbps)') +
      row('Wi-Fi', 'No wireless adapter in use', tog(0)) +
      row('Airplane mode', 'Stop all wireless communication', tog(0)) +
      row('VPN', 'Not connected', '›') +
      row('Proxy', 'Automatically detect settings', tog(1)),
    personal: () =>
      row('🖼️ Background', 'Picture · Dad Cyber Tips x SnackSpaceCon', '›') +
      row('🎨 Colors', 'Mode: Light · Accent color: <span class="swatch"></span> Blue', '›') +
      row('🪟 Themes', 'Current theme: Windows (light)', '›') +
      row('🔒 Lock screen', 'Windows spotlight', '›') +
      row('➖ Taskbar', 'Alignment: Center · Search: Icon only', '›') +
      row('🚀 Start', 'Layout: More pins · Show recently added apps', tog(1)),
    apps: () =>
      row('Installed apps', '6 apps') +
      row('📁 File Explorer', 'Microsoft Corporation (simulated) · —') +
      row('📝 Notepad', '0.8 MB · Installed 9/1/2026') +
      row('💣 Minesweeper', '2.1 MB · Installed 9/1/2026') +
      row('⚙️ Settings', '1.2 MB · Installed 9/1/2026') +
      row('🧮 Calculator', '4.6 MB · Installed 9/1/2026') +
      row('Default apps', 'Text files (.txt) open with Notepad', '›') +
      row('Startup apps', 'Security Health · Cloud Backup · Audio Manager', '3 enabled'),
    accounts: () =>
      row('👤 Guest User', 'Local account · Administrator') +
      row('Sign-in options', 'Windows Hello PIN · Not set up', '›') +
      row('Email & accounts', 'No accounts added', '›') +
      row('Family', 'Add someone to your family group', '›') +
      row('Windows backup', 'Not signed in', '›'),
    time: () =>
      row('Set time automatically', 'Synchronized with time.windows.com (simulated)', tog(1)) +
      row('Time zone', '(UTC-05:00) Eastern Time (US & Canada) · Cape Canaveral, FL', '›') +
      row('Adjust for daylight saving time automatically', '', tog(1)) +
      row('Language', 'English (United States)', '›') +
      row('Region', 'United States · Regional format: English (United States)', '›') +
      row('Typing', 'Keyboard layout: US · Spell checking on', '›'),
    privacy: () =>
      row('🛡️ Windows Security', 'Your device is protected. No action needed.', 'Open') +
      row('Virus & threat protection', 'No current threats · Last quick scan: today', '›') +
      row('Firewall & network protection', 'Domain, private and public firewalls are on', tog(1)) +
      row('📍 Location', 'Let apps access your location', tog(0)) +
      row('📷 Camera', 'Let apps access your camera', tog(1)) +
      row('🎤 Microphone', 'Let apps access your microphone', tog(1)) +
      row('Find my device', 'Location history is off', tog(0)),
    update: updatePane
  };

  windowManager.openSettingsWindow = function() {
    const n = document.createElement('div');
    n.className = 'settings-app';
    n.innerHTML = '<div class="settings-nav"></div><div class="settings-main"></div>';
    const nav = n.querySelector('.settings-nav'), main = n.querySelector('.settings-main');
    nav.innerHTML = '<div class="nav-user"><span class="avatar">👤</span><div><b>Guest User</b><small>Local account</small></div></div>';

    const show = id => {
      nav.querySelectorAll('.nav-item').forEach(e => e.classList.toggle('sel', e.dataset.id === id));
      main.innerHTML = `<h1>${NAV.find(x => x[0] === id)[1]}</h1>` + PANES[id]();
      const b = main.querySelector('#su-install');
      if (b) b.addEventListener('click', () => { window.startUpdateSimulation(); show('update'); });
      main.querySelectorAll('.tog').forEach(t => t.addEventListener('click', () => t.classList.toggle('on')));
      const sl = main.querySelector('.si-slider');
      if (sl) {
        sl.value = EmuAudio.vol;
        sl.addEventListener('input', () => EmuAudio.set(+sl.value));
        sl.addEventListener('change', () => EmuAudio.ding());
      }
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

    return this.createWindow({ key: 'settings', title: 'Settings', icon: 'gear', node: n, width: 740, height: 500, top: 40, left: 50 });
  };

  // Keep the Sound slider in step when the volume is changed from the tray
  window.addEventListener('emuvolume', () => {
    document.querySelectorAll('.si-slider').forEach(s => { s.value = EmuAudio.vol; });
  });
})();
