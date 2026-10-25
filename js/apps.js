/**
 * Small apps: Calculator, Notepad, Task Manager, placeholder apps (Edge, Mail, ...),
 * and the Windows-style "access denied" dialogs used by File Explorer.
 */
(function() {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shrink = w => { w.style.minWidth = '0'; w.style.minHeight = '0'; return w; };
  const already = key => windowManager.wins.has(key) && (windowManager.createWindow({ key }), true);
  const hash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- "You don't have permission" dialogs ---------- */
  window.showAccessDenied = function(path, kind, headline) {
    windowManager.closeWindow('denied');
    const proc = kind === 'process', file = kind === 'file', what = file ? 'file' : 'folder';
    const n = document.createElement('div');
    n.className = 'perm';
    n.innerHTML = '<div class="perm-body"><span class="perm-ic">⛔</span><div><h3></h3><p class="perm-path"></p><p class="perm-txt"></p></div></div><div class="perm-btns"></div>';
    const h = n.querySelector('h3'), pth = n.querySelector('.perm-path'), tx = n.querySelector('.perm-txt'), bt = n.querySelector('.perm-btns');
    const win = windowManager.createWindow({ key: 'denied', title: proc ? 'Task Manager' : file ? 'File Access Denied' : 'Folder Access Denied',
      icon: proc ? 'taskmgr' : 'folder', node: n, width: 470, height: 235, top: 210, left: 280, front: true });
    shrink(win);
    const close = () => windowManager.closeWindow('denied');
    const btn = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.addEventListener('click', f); bt.appendChild(b); };
    pth.textContent = path;
    if (proc) { h.textContent = headline || 'Unable to end process'; tx.textContent = 'Access is denied.'; pth.style.display = 'none'; btn('OK', close); return; }
    h.textContent = `You don't currently have permission to ${file ? 'open this file' : 'access this folder'}.`;
    tx.textContent = `Click Continue to try to get access to this ${what}.`;
    btn('Continue', () => { close(); window.showUAC(path.split('\\').pop() || path, file ? 'file' : 'folder', path); });
    btn('Cancel', close);
  };

  /* ---------- Apps that are not built out ---------- */
  window.openStub = function(name) { window.showUAC(name, 'app'); };


  /* ---------- UAC prompt: always ends in "no permission" ---------- */
  window.showUAC = function(name, kind, path) {
    const old = document.getElementById('uac'); if (old) old.remove();
    const scr = document.getElementById('screen');
    const app = kind === 'app', what = app ? 'run this app' : kind === 'file' ? 'open this file' : 'open this folder';
    const ov = document.createElement('div');
    ov.id = 'uac';
    ov.innerHTML = `<div class="uac-box">
      <div class="uac-bar${app ? ' warn' : ''}"><span>🛡️</span><b>User Account Control</b></div>
      <div class="uac-body">
        <h2>You don't have permission to ${what}</h2>
        <div class="uac-app"><span class="uac-ico">${app ? '❓' : kind === 'file' ? '📄' : '📁'}</span><div><b class="uac-name"></b><small class="uac-pub"></small></div></div>
        <p class="uac-msg">Guest User doesn't have permission to do this. To continue, type an administrator user name and password.</p>
        <div class="uac-cred"><input class="uac-un" placeholder="User name" spellcheck="false" autocomplete="off"><input class="uac-pw" type="password" placeholder="Password" autocomplete="off"><p class="uac-err"></p></div>
      </div>
      <div class="uac-btns"><button class="uac-yes">Yes</button><button class="uac-no">No</button></div></div>`;
    ov.querySelector('.uac-name').textContent = name;
    ov.querySelector('.uac-pub').textContent = app ? 'Publisher: Unknown' : (path || 'Windows Explorer') + '  ·  Verified publisher: Microsoft Windows';
    scr.appendChild(ov);
    const box = ov.querySelector('.uac-box'), un = ov.querySelector('.uac-un'), pw = ov.querySelector('.uac-pw'), err = ov.querySelector('.uac-err');
    const close = () => { ov.remove(); document.removeEventListener('keydown', onKey, true); };
    const yes = () => {
      err.textContent = !un.value.trim() || !pw.value ? 'Enter an administrator user name and password.' : 'The user name or password is incorrect.';
      pw.value = ''; box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
    };
    const onKey = e => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      else if (e.key === 'Enter') { e.preventDefault(); yes(); }
    };
    document.addEventListener('keydown', onKey, true);
    ov.querySelector('.uac-yes').addEventListener('click', yes);
    ov.querySelector('.uac-no').addEventListener('click', close);
    un.focus();
  };

  /* ---------- Calculator ---------- */
  window.openCalculator = function() {
    if (already('calc')) return;
    const keys = ['%', 'CE', 'C', '⌫', '1/x', 'x²', '√x', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '±', '0', '.', '='];
    const n = document.createElement('div');
    n.className = 'calc';
    n.innerHTML = '<div class="calc-d"><div class="calc-e"></div><div class="calc-r">0</div></div><div class="calc-g"></div>';
    const g = n.querySelector('.calc-g');
    keys.forEach(k => {
      const b = document.createElement('button');
      b.textContent = k; b.dataset.k = k;
      b.className = 'cb' + (/[0-9]/.test(k) ? ' n' : '') + (k === '=' ? ' eq' : '');
      g.appendChild(b);
    });
    shrink(windowManager.createWindow({ key: 'calc', title: 'Calculator', icon: 'calc', node: n, width: 320, height: 480, left: 300, top: 40 }));

    let cur = '0', acc = null, op = null, fresh = true, expr = '';
    const fmt = v => isFinite(v) ? String(+v.toPrecision(12)) : 'Cannot divide by zero';
    const show = () => { n.querySelector('.calc-e').textContent = expr; n.querySelector('.calc-r').textContent = cur; };
    const calc = (a, b, o) => o === '+' ? a + b : o === '−' ? a - b : o === '×' ? a * b : o === '÷' ? a / b : b;
    function press(k) {
      if (isNaN(+cur) && k !== 'C' && k !== 'CE') return;
      if (/[0-9]/.test(k)) { cur = fresh || cur === '0' ? k : cur + k; fresh = false; }
      else if (k === '.') { if (fresh) { cur = '0.'; fresh = false; } else if (!cur.includes('.')) cur += '.'; }
      else if ('+−×÷'.includes(k)) {
        if (op && !fresh) { acc = calc(acc, +cur, op); cur = fmt(acc); } else acc = +cur;
        if (isNaN(+cur)) { acc = op = null; expr = ''; fresh = true; show(); return; }
        op = k; expr = fmt(acc) + ' ' + k; fresh = true;
      }
      else if (k === '=') { if (op) { const r = calc(acc, +cur, op); expr = `${fmt(acc)} ${op} ${fmt(+cur)} =`; cur = fmt(r); op = acc = null; fresh = true; } }
      else if (k === 'C') { cur = '0'; acc = op = null; expr = ''; fresh = true; }
      else if (k === 'CE') { cur = '0'; fresh = true; }
      else if (k === '⌫') { cur = fresh || cur.length <= 1 || (cur.length === 2 && cur[0] === '-') ? '0' : cur.slice(0, -1); }
      else if (k === '±') { if (cur !== '0') cur = cur[0] === '-' ? cur.slice(1) : '-' + cur; }
      else if (k === '%') { cur = fmt(+cur / 100); fresh = true; }
      else if (k === '1/x') { cur = fmt(1 / +cur); fresh = true; }
      else if (k === 'x²') { cur = fmt(+cur * +cur); fresh = true; }
      else if (k === '√x') { cur = +cur < 0 ? 'Invalid input' : fmt(Math.sqrt(+cur)); fresh = true; }
      show();
    }
    g.addEventListener('pointerdown', e => { const b = e.target.closest('.cb'); if (b) press(b.dataset.k); });
    g.addEventListener('click', e => { const b = e.target.closest('.cb'); if (b && e.detail === 0) press(b.dataset.k); });
    const map = { '*': '×', '/': '÷', '-': '−', Enter: '=', Backspace: '⌫', Escape: 'C', Delete: 'CE' };
    document.addEventListener('keydown', e => {
      if (!n.isConnected || (e.target.closest && e.target.closest('input,textarea'))) return;
      const wm = windowManager;
      if (wm.order[wm.order.length - 1] !== 'calc' || wm.wins.get('calc').min) return;
      const k = map[e.key] ?? e.key;
      if (keys.includes(k)) { e.preventDefault(); press(k); }
    });
  };

  /* ---------- Notepad (your text is kept in this browser) ---------- */
  function openPrompt(onOpen) {
    windowManager.closeWindow('np-open');
    const d = document.createElement('div');
    d.className = 'perm';
    d.innerHTML = '<div class="perm-body" style="flex-direction:column;gap:8px"><label>File name (full path):</label><input class="np-in" spellcheck="false" value="C:\\Users\\Guest\\Documents\\todo.txt"><p class="np-err"></p></div><div class="perm-btns"></div>';
    const inp = d.querySelector('.np-in'), err = d.querySelector('.np-err'), bt = d.querySelector('.perm-btns');
    shrink(windowManager.createWindow({ key: 'np-open', title: 'Open', icon: 'notepad', node: d, width: 480, height: 190, top: 200, left: 240, front: true }));
    const close = () => windowManager.closeWindow('np-open');
    const go = () => {
      const r = window.fsRead(inp.value);
      if (!r) { close(); return; }
      if (r.error) { err.textContent = r.error; return; }
      onOpen(r.content, inp.value.split('\\').pop()); close();
    };
    [['Open', go], ['Cancel', close]].forEach(([t, f]) => { const b = document.createElement('button'); b.textContent = t; b.addEventListener('click', f); bt.appendChild(b); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    setTimeout(() => inp.select(), 0);
  }
  window.openNotepad = function(init) {
    if (already('notepad')) { if (init) windowManager.wins.get('notepad').el.__np(init.text, init.name); return; }
    const n = document.createElement('div');
    n.className = 'np';
    n.innerHTML = `<div class="np-menu"><span class="np-file">File</span><span>Edit</span><span>View</span>
      <div class="ex-dd"><div data-a="new">New</div><div data-a="open">Open...</div><div data-a="save">Save</div><div data-a="exit">Exit</div></div></div>
      <textarea spellcheck="false"></textarea><div class="np-st"></div>`;
    const ta = n.querySelector('textarea'), st = n.querySelector('.np-st'), dd = n.querySelector('.ex-dd'), fm = n.querySelector('.np-file');
    const win = windowManager.createWindow({ key: 'notepad', title: 'Untitled - Notepad', icon: 'notepad', node: n, width: 560, height: 380, left: 160, top: 60 });
    ta.value = localStorage.getItem('notepad.text') || '';
    const title = t => { win.querySelector('.title').textContent = t + ' - Notepad'; };
    const upd = () => {
      const p = ta.selectionStart, last = ta.value.lastIndexOf('\n', p - 1);
      st.textContent = `Ln ${ta.value.slice(0, p).split('\n').length}, Col ${p - last}      ${ta.value.length} characters`;
    };
    ta.addEventListener('input', () => { localStorage.setItem('notepad.text', ta.value); upd(); });
    ['keyup', 'click'].forEach(ev => ta.addEventListener(ev, upd));
    upd();
    win.__np = (text, name) => { ta.value = text; localStorage.setItem('notepad.text', text); title(name); upd(); };
    if (init) win.__np(init.text, init.name);
    fm.addEventListener('pointerdown', e => { e.stopPropagation(); dd.classList.toggle('open'); });
    dd.addEventListener('click', e => {
      const a = e.target.dataset.a; if (!a) return;
      dd.classList.remove('open');
      if (a === 'new') { ta.value = ''; localStorage.setItem('notepad.text', ''); title('Untitled'); upd(); }
      else if (a === 'open') openPrompt((text, name) => { ta.value = text; localStorage.setItem('notepad.text', text); title(name); upd(); windowManager.focus('notepad'); });
      else if (a === 'save') { localStorage.setItem('notepad.text', ta.value); st.textContent = 'Saved'; setTimeout(upd, 1200); }
      else windowManager.closeWindow('notepad');
    });
    document.addEventListener('pointerdown', e => { if (n.isConnected && !dd.contains(e.target) && e.target !== fm) dd.classList.remove('open'); }, true);
  };

  /* ---------- Task Manager (opens on Services; has a Processes tab too) ---------- */
  const BG = [['System', 0.6, 0.1, 0.2, 0], ['Registry', 0, 5, 0, 0], ['Service Host: Local System', 0.4, 42, 0.1, 0], ['Windows Explorer', 0.7, 96, 0.1, 0],
    ['Antimalware Service Executable', 1.2, 118, 0.3, 0], ['Desktop Window Manager', 1.1, 64, 0, 0], ['Windows Audio Device Graph Isolation', 0.2, 8, 0, 0],
    ['Runtime Broker', 0, 12, 0, 0], ['Search Indexer', 0.1, 26, 0.1, 0], ['Service Host: Network Service', 0.1, 9, 0, 0.1],
    ['Windows Security Health Service', 0, 6, 0, 0], ['Client Server Runtime Process', 0.2, 2, 0, 0]];
  window.openTaskManager = function() {
    if (already('taskmgr')) return;
    const n = document.createElement('div');
    n.className = 'tm'; n.dataset.tab = 'svc';
    n.innerHTML = `<div class="tm-sum"><div>CPU<b class="t-cpu">0%</b></div><div>Memory<b class="t-mem">0%</b></div><div>Disk<b class="t-disk">0%</b></div><div>Network<b class="t-net">0 Mbps</b></div></div>
      <div class="tm-tabs"><span data-t="proc">Processes</span><span data-t="svc" class="on">Services</span></div>
      <div class="tm-tools"><span class="tm-pb"><button class="tm-end" disabled>End task</button></span><span class="tm-sb"><button data-s="Start" disabled>Start</button><button data-s="Stop" disabled>Stop</button><button data-s="Restart" disabled>Restart</button></span></div>
      <div class="tm-body"></div><div class="tm-svc"></div>`;
    windowManager.createWindow({ key: 'taskmgr', title: 'Task Manager', icon: 'taskmgr', node: n, width: 700, height: 460, left: 110, top: 60 });
    const $ = q => n.querySelector(q), body = $('.tm-body'), svcBody = $('.tm-svc'), end = $('.tm-end'), sbtn = n.querySelectorAll('.tm-sb button');
    let tab = 'svc', sel = null, selSvc = null, iv = null;
    function tick() {
      if (!n.isConnected) { clearInterval(iv); return; }
      const apps = [...windowManager.wins].map(([id, w]) => ({ id, name: w.el.querySelector('.title').textContent,
        cpu: id === 'taskmgr' ? rnd(1, 3) : rnd(0, 1.2), mem: 20 + hash(id) % 90, disk: 0, net: 0 }));
      const bg = BG.map(([name, c, m, d, nt]) => ({ id: 'bg:' + name, name, cpu: c * rnd(0.7, 1.3), mem: m * rnd(0.98, 1.02), disk: d * rnd(0.5, 1.5), net: nt * rnd(0.5, 1.5) }));
      if (window.updateInProgress) bg.unshift({ id: 'bg:Windows Modules Installer Worker', name: 'Windows Modules Installer Worker', cpu: rnd(8, 24), mem: 142, disk: rnd(1, 6), net: rnd(0.5, 3) });
      const all = apps.concat(bg), tot = k => all.reduce((s, r) => s + r[k], 0);
      $('.t-cpu').textContent = Math.min(99, Math.round(tot('cpu') + 2)) + '%';
      $('.t-mem').textContent = Math.round(36 + tot('mem') / 120) + '%';
      $('.t-disk').textContent = Math.min(99, Math.round(tot('disk'))) + '%';
      $('.t-net').textContent = tot('net').toFixed(1) + ' Mbps';
      if (tab === 'proc') {
        const heat = v => `style="background:rgba(255,196,0,${Math.min(0.55, v / 40).toFixed(2)})"`;
        const row = r => `<div class="tm-row${r.id === sel ? ' sel' : ''}" data-id="${esc(r.id)}"><span>${esc(r.name)}</span><span ${heat(r.cpu)}>${r.cpu.toFixed(1)}%</span><span ${heat(r.mem / 8)}>${r.mem.toFixed(1)} MB</span><span>${r.disk.toFixed(1)} MB/s</span><span>${r.net.toFixed(1)} Mbps</span></div>`;
        body.innerHTML = '<div class="tm-row h"><span>Name</span><span>CPU</span><span>Memory</span><span>Disk</span><span>Network</span></div>' +
          `<div class="tm-row g"><span>Apps (${apps.length})</span></div>` + apps.map(row).join('') +
          `<div class="tm-row g"><span>Background processes (${bg.length})</span></div>` + bg.map(row).join('');
        end.disabled = !sel;
      } else {
        const sv = SYS.services().sort((a, b) => b.running - a.running || a.name.localeCompare(b.name));
        svcBody.innerHTML = '<div class="tm-srow h"><span>Name</span><span>PID</span><span>Description</span><span>Status</span><span>Startup</span></div>' +
          sv.map(s => `<div class="tm-srow${s.name === selSvc ? ' sel' : ''}" data-s="${esc(s.name)}"><span>${esc(s.name)}</span><span>${s.running && s.pid ? s.pid : ''}</span><span>${esc(s.display)}</span><span class="${s.running ? 'run' : ''}">${s.running ? 'Running' : 'Stopped'}</span><span>${s.start.replace('_START', '').toLowerCase()}</span></div>`).join('');
        sbtn.forEach(b => { b.disabled = !selSvc; });
      }
    }
    n.querySelectorAll('.tm-tabs span').forEach(t => t.addEventListener('pointerdown', () => {
      tab = t.dataset.t; n.dataset.tab = tab;
      n.querySelectorAll('.tm-tabs span').forEach(x => x.classList.toggle('on', x === t));
      tick();
    }));
    body.addEventListener('pointerdown', e => {
      const r = e.target.closest('.tm-row[data-id]'); if (!r) return;
      sel = r.dataset.id; end.disabled = false;
      body.querySelectorAll('.tm-row').forEach(x => x.classList.toggle('sel', x === r));
    });
    svcBody.addEventListener('pointerdown', e => {
      const r = e.target.closest('.tm-srow[data-s]'); if (!r) return;
      selSvc = r.dataset.s; sbtn.forEach(b => { b.disabled = false; });
      svcBody.querySelectorAll('.tm-srow').forEach(x => x.classList.toggle('sel', x === r));
    });
    sbtn.forEach(b => b.addEventListener('click', () => { if (selSvc) window.showAccessDenied(selSvc, 'process', `Unable to ${b.dataset.s.toLowerCase()} service`); }));
    end.addEventListener('click', () => {
      if (!sel) return;
      if (sel.startsWith('bg:')) window.showAccessDenied(sel.slice(3), 'process'); else windowManager.closeWindow(sel);
      sel = null; end.disabled = true; tick();
    });
    iv = setInterval(tick, 1500);
    tick();
  };

  /* ---------- Clock: world clock, timer, stopwatch ---------- */
  window.openClock = function() {
    if (already('clock')) return;
    const n = document.createElement('div');
    n.className = 'clk';
    n.innerHTML = '<div class="clk-tabs"><span data-t="w" class="on">World clock</span><span data-t="t">Timer</span><span data-t="s">Stopwatch</span></div><div class="clk-pane"></div>';
    windowManager.createWindow({ key: 'clock', title: 'Clock', icon: 'clock', node: n, width: 480, height: 430, left: 260, top: 60 });
    const pane = n.querySelector('.clk-pane');
    const CITIES = [['Cape Canaveral, FL', 'America/New_York'], ['Chicago', 'America/Chicago'], ['Los Angeles', 'America/Los_Angeles'], ['London', 'Europe/London'], ['Tokyo', 'Asia/Tokyo'], ['Sydney', 'Australia/Sydney']];
    const T = { run: false, left: 5 * 60000, end: 0, done: false }, W = { run: false, start: 0, el: 0, laps: [] };
    let tab = 'w', iv = null;
    const p2 = v => String(v).padStart(2, '0');
    const fmt = (ms, cs) => { const t = Math.max(0, Math.floor(ms / 10)); return p2(Math.floor(t / 6000)) + ':' + p2(Math.floor(t / 100) % 60) + (cs ? '.' + p2(t % 100) : ''); };
    const btn = (id, t, cls) => `<button class="clk-b ${cls || ''}" data-a="${id}">${t}</button>`;
    function draw() {
      if (tab === 'w') {
        pane.innerHTML = CITIES.map(([c, tz], i) => `<div class="clk-city"><div><b>${esc(c)}</b><small class="cd${i}"></small></div><span class="ct${i}"></span></div>`).join('');
      } else if (tab === 't') {
        pane.innerHTML = `<div class="clk-big t-d"></div><div class="clk-set"><input type="number" min="0" max="99" value="${p2(Math.floor(T.left / 60000))}" class="t-m"> min <input type="number" min="0" max="59" value="${p2(Math.floor(T.left / 1000) % 60)}" class="t-s"> sec</div>
          <div class="clk-btns">${btn('tstart', T.run ? 'Pause' : 'Start', 'pri')}${btn('treset', 'Reset')}</div>`;
      } else {
        pane.innerHTML = `<div class="clk-big s-d"></div><div class="clk-btns">${btn('sstart', W.run ? 'Stop' : 'Start', 'pri')}${btn('slap', 'Lap')}${btn('sreset', 'Reset')}</div><div class="clk-laps">${W.laps.map((l, i) => `<div><span>Lap ${W.laps.length - i}</span><span>${fmt(l, true)}</span></div>`).join('')}</div>`;
      }
      tick();
    }
    function tick() {
      if (!n.isConnected) { clearInterval(iv); return; }
      const now = new Date();
      if (tab === 'w') CITIES.forEach(([c, tz], i) => {
        const o = tz ? { timeZone: tz } : {};
        const t = n.querySelector('.ct' + i), d = n.querySelector('.cd' + i);
        if (t) { t.textContent = now.toLocaleTimeString('en-US', { ...o, hour: 'numeric', minute: '2-digit', second: '2-digit' }); d.textContent = now.toLocaleDateString('en-US', { ...o, weekday: 'long', month: 'short', day: 'numeric' }); }
      });
      if (T.run) { T.left = T.end - Date.now(); if (T.left <= 0) { T.left = 0; T.run = false; T.done = true; [0, 450, 900].forEach(ms => setTimeout(() => window.EmuAudio && EmuAudio.ding(), ms)); if (tab === 't') draw(); } }
      if (W.run) W.el = Date.now() - W.start;
      const td = n.querySelector('.t-d'); if (td) td.textContent = T.done && !T.run ? "Time's up!" : fmt(T.left, false);
      const sd = n.querySelector('.s-d'); if (sd) sd.textContent = fmt(W.el, true);
    }
    pane.addEventListener('click', e => {
      const a = e.target.dataset.a; if (!a) return;
      if (a === 'tstart') {
        if (T.run) { T.run = false; } else {
          if (T.done || !T.left) T.left = 0;
          const m = +n.querySelector('.t-m').value || 0, s = +n.querySelector('.t-s').value || 0;
          if (!T.run && (T.done || T.left === 0 || true)) T.left = (m * 60 + s) * 1000 || T.left;
          if (T.left > 0) { T.done = false; T.end = Date.now() + T.left; T.run = true; }
        }
      } else if (a === 'treset') { T.run = false; T.done = false; T.left = 5 * 60000; }
      else if (a === 'sstart') { if (W.run) W.run = false; else { W.start = Date.now() - W.el; W.run = true; } }
      else if (a === 'slap') { if (W.run) W.laps.unshift(W.el); }
      else if (a === 'sreset') { W.run = false; W.el = 0; W.laps = []; }
      draw();
    });
    n.querySelectorAll('.clk-tabs span').forEach(t => t.addEventListener('pointerdown', () => {
      tab = t.dataset.t; n.querySelectorAll('.clk-tabs span').forEach(x => x.classList.toggle('on', x === t)); draw();
    }));
    iv = setInterval(tick, 100);
    draw();
  };

  /* ---------- Microsoft Edge: loads the page, then crashes on the first interaction ---------- */
  const EDGE_HOME = 'https://snackspace.com/';   // the page Edge loads (set window.EDGE_HOME to override)
  function appCrashDialog(appName, key, onClose) {
    windowManager.closeWindow(key + '-crash');
    const d = document.createElement('div');
    d.className = 'perm';
    d.innerHTML = '<div class="perm-body"><span class="perm-ic">⚠️</span><div><h3></h3><p class="perm-txt">A problem caused the program to stop working correctly. Please close the program.</p></div></div><div class="perm-btns"><button>Close the program</button></div>';
    d.querySelector('h3').textContent = appName + ' has stopped working';
    shrink(windowManager.createWindow({ key: key + '-crash', title: appName, icon: key, node: d, width: 470, height: 215, top: 210, left: 260, front: true }));
    if (window.EmuAudio) EmuAudio.ding();
    d.querySelector('button').addEventListener('click', () => { windowManager.closeWindow(key + '-crash'); onClose(); });
  }
  window.openEdge = function() {
    if (already('edge')) return;
    const home = window.EDGE_HOME || EDGE_HOME, host = (home.match(/^https?:\/\/([^/]+)/i) || [0, 'about:blank'])[1].replace(/^www\./, '');
    const n = document.createElement('div');
    n.className = 'eg'; n.tabIndex = 0;
    n.innerHTML = `<div class="eg-tabs"><div class="eg-tab"><span class="eg-fav">🍿</span><span class="eg-tt">Loading…</span><span class="eg-x">✕</span></div><span class="eg-plus">+</span></div>
      <div class="eg-bar"><button>←</button><button>→</button><button class="eg-rl">✕</button><div class="eg-addr"><span>🔒</span><span class="eg-url"></span></div><button>☆</button><button>⋯</button></div>
      <div class="eg-load"></div>
      <div class="eg-view"><iframe class="eg-frame" title="page" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms"></iframe><div class="eg-shield"></div></div>`;
    const win = windowManager.createWindow({ key: 'edge', title: 'New tab - Microsoft Edge', icon: 'edge', node: n, width: 900, height: 600, left: 60, top: 30 });
    const frame = n.querySelector('.eg-frame'), tt = n.querySelector('.eg-tt'), rl = n.querySelector('.eg-rl'), title = win.querySelector('.title');
    n.querySelector('.eg-url').textContent = host;
    let loaded = false, crashed = false;
    const finish = () => {
      if (loaded) return;
      loaded = true; n.classList.add('done'); rl.textContent = '⟳';
      tt.textContent = 'SnackSpace'; title.textContent = 'SnackSpace - Microsoft Edge';
    };
    frame.addEventListener('load', finish);
    setTimeout(finish, 6000);            // in case the page never reports that it loaded
    frame.src = home;

    // Once the page has loaded, ANY interaction with Edge crashes it
    const hit = () => {
      if (!loaded || crashed) return;
      crashed = true;
      win.classList.add('nr'); n.classList.add('hung');
      title.textContent += ' (Not Responding)';
      setTimeout(() => { if (windowManager.wins.has('edge')) appCrashDialog('Microsoft Edge', 'edge', () => windowManager.closeWindow('edge')); }, rnd(1200, 2600));
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach(t => n.addEventListener(t, hit, true));
    n.addEventListener('wheel', hit, { capture: true, passive: true });
    win.__edge = () => ({ loaded, crashed });   // used by tests
    n.focus();
  };
})();
