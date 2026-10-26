/**
 * Shell: taskbar pinning, context menus, Start tile drag-to-reorder, calendar flyout.
 */
(function() {
  const $ = id => document.getElementById(id);
  const scr = $('screen'), bar = $('taskbar-apps'), menu = $('start-menu');
  const APPS = {
    explorer: { label: 'File Explorer', icon: 'folder', win: 'explorer' },
    calc: { label: 'Calculator', icon: 'calc', win: 'calc' },
    notepad: { label: 'Notepad', icon: 'notepad', win: 'notepad' },
    taskmgr: { label: 'Task Manager', icon: 'taskmgr', win: 'taskmgr' },
    clock: { label: 'Clock', icon: 'clock', win: 'clock' },
    cmd: { label: 'Command Prompt', icon: 'cmd', win: 'cmd' },
    ps: { label: 'Windows PowerShell', icon: 'ps', win: 'ps' },
    edge: { label: 'Microsoft Edge', icon: 'edge', win: 'edge' },
    doc: { label: 'Flag.txt', icon: 'doc', win: 'doc' },
    settings: { label: 'Settings', icon: 'gear', win: 'settings' },
    mines: { label: 'Minesweeper', icon: 'mine', win: 'minesweeper' },
    pinball: { label: 'Pinball', icon: 'pinball', win: 'pinball' },
    about: { label: 'About', icon: 'info', win: '' }
  };
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const keyOf = id => APPS[id].win || 'app:' + id;

  /* ---------- Context menu ---------- */
  const ctx = document.createElement('div');
  ctx.id = 'ctx';
  scr.appendChild(ctx);
  const hideCtx = () => { ctx.style.display = 'none'; };
  function showCtx(e, items) {
    ctx.innerHTML = '';
    items.forEach(it => {
      const d = document.createElement('div');
      d.textContent = it.label;
      d.addEventListener('click', () => { hideCtx(); it.act(); });
      ctx.appendChild(d);
    });
    ctx.style.display = 'block';
    const r = scr.getBoundingClientRect(), k = r.width / scr.offsetWidth;
    let x = (e.clientX - r.left) / k, y = (e.clientY - r.top) / k;
    if (x + ctx.offsetWidth > scr.offsetWidth - 4) x = scr.offsetWidth - ctx.offsetWidth - 4;
    if (y + ctx.offsetHeight > scr.offsetHeight - 4) y = Math.max(0, y - ctx.offsetHeight);
    ctx.style.left = Math.max(0, x) + 'px';
    ctx.style.top = y + 'px';
  }
  ctx.addEventListener('pointerdown', e => e.stopPropagation());
  document.addEventListener('pointerdown', e => { if (!ctx.contains(e.target)) hideCtx(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideCtx(); });

  /* ---------- Taskbar buttons and pinning ---------- */
  let pins = load('tbPins', ['explorer']).filter(id => APPS[id]);
  const reg = {};

  function activate(b) {
    const wid = b.dataset.win, wm = windowManager;
    if (wid && wm.wins.has(wid)) {
      if (wm.wins.get(wid).min) wm.restore(wid);
      else if (wm.order[wm.order.length - 1] === wid) wm.minimize(wid);
      else wm.focus(wid);
    } else if (b.dataset.app) launchApp(b.dataset.app);
  }
  function ensure(key, meta) {
    let r = reg[key];
    if (!r) {
      const b = document.createElement('button');
      b.className = 'tb-btn taskbar-app';
      b.innerHTML = `<svg><use href="#i-${meta.icon}"/></svg>`;
      b.addEventListener('click', () => activate(b));
      b.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); taskbarMenu(e, key); });
      bar.appendChild(b);
      r = reg[key] = { btn: b };
    }
    r.btn.title = meta.title;
    r.btn.dataset.win = meta.win || '';
    r.btn.dataset.app = meta.app || '';
    return r;
  }
  function order() {
    const p = pins.map(id => reg[keyOf(id)]).filter(Boolean).map(r => r.btn);
    const rest = Object.values(reg).map(r => r.btn).filter(b => !p.includes(b));
    [...p, ...rest].forEach(b => bar.appendChild(b));
  }
  function pin(id) {
    if (!pins.includes(id)) { pins.push(id); save('tbPins', pins); }
    const a = APPS[id];
    ensure(keyOf(id), { title: a.label, icon: a.icon, win: a.win, app: id });
    order();
  }
  function unpin(id) {
    pins = pins.filter(x => x !== id); save('tbPins', pins);
    const a = APPS[id], r = reg[keyOf(id)];
    if (r && !(a.win && windowManager.wins.has(a.win))) { r.btn.remove(); delete reg[keyOf(id)]; }
  }
  window.Taskbar = {
    attach(id, o) {
      const app = Object.keys(APPS).find(a => APPS[a].win === id) || '';
      const r = ensure(id, { title: o.title, icon: o.icon, win: id, app });
      r.btn.classList.add('open');
      order();
      return r.btn;
    },
    detach(id) {
      const r = reg[id]; if (!r) return;
      r.btn.classList.remove('open', 'active');
      if (!(r.btn.dataset.app && pins.includes(r.btn.dataset.app))) { r.btn.remove(); delete reg[id]; }
    }
  };
  pins.forEach(pin);

  function taskbarMenu(e, key) {
    const b = reg[key].btn, wid = b.dataset.win, app = b.dataset.app;
    const open = wid && windowManager.wins.has(wid), items = [];
    if (app && !open) items.push({ label: 'Open', act: () => launchApp(app) });
    if (app) items.push(pins.includes(app) ? { label: 'Unpin from taskbar', act: () => unpin(app) } : { label: 'Pin to taskbar', act: () => pin(app) });
    if (open) items.push({ label: 'Close window', act: () => windowManager.closeWindow(wid) });
    if (items.length) showCtx(e, items);
  }

  /* ---------- Start menu: All apps, search, Recommended files ---------- */
  const ALL = [
    ['About', 'info', 'about'], ['Calculator', 'calc', 'calc'], ['Calendar', '📅', 'stub:Calendar'], ['Camera', '📷', 'stub:Camera'], ['Clock', 'clock', 'clock'], ['Command Prompt', 'cmd', 'cmd'],
    ['File Explorer', 'folder', 'explorer'], ['Mail', '✉️', 'stub:Mail'], ['Microsoft Edge', 'edge', 'edge'], ['Microsoft Store', '🛍️', 'stub:Microsoft Store'],
    ['Minesweeper', 'mine', 'mines'], ['Pinball', 'pinball', 'pinball'], ['Notepad', 'notepad', 'notepad'], ['Paint', '🎨', 'stub:Paint'],
    ['Phone Link', '📱', 'stub:Phone Link'], ['Photos', '🖼️', 'stub:Photos'], ['Settings', 'gear', 'settings'], ['Task Manager', 'taskmgr', 'taskmgr'],
    ['Windows PowerShell', 'ps', 'ps'], ['Windows Security', '🛡️', 'stub:Windows Security']
  ];
  const iconHtml = ic => /^[a-z]+$/.test(ic) ? `<svg><use href="#i-${ic}"/></svg>` : `<span class="emo">${ic}</span>`;
  const sa = menu.querySelector('.start-all');
  let lastLetter = '';
  ALL.slice().sort((a, b) => a[0].localeCompare(b[0])).forEach(([label, ic, app]) => {
    const L = label[0].toUpperCase();
    if (L !== lastLetter) { const h = document.createElement('div'); h.className = 'sa-letter'; h.textContent = L; sa.appendChild(h); lastLetter = L; }
    const r = document.createElement('div');
    r.className = 'sa-row'; r.dataset.app = app;
    r.innerHTML = iconHtml(ic) + '<span></span>';
    r.lastChild.textContent = label;
    sa.appendChild(r);
  });

  const pillAll = menu.querySelector('.pill-all'), titlePin = menu.querySelector('.hd-pin b');
  const input = menu.querySelector('.start-search input'), results = menu.querySelector('.start-results');
  const setMode = m => {
    menu.classList.toggle('mode-all', m === 'all');
    menu.classList.toggle('mode-search', m === 'search');
    titlePin.textContent = m === 'all' ? 'All apps' : 'Pinned';
    pillAll.textContent = m === 'all' ? '‹ Back' : 'All apps ›';
  };
  pillAll.addEventListener('pointerdown', () => { input.value = ''; setMode(menu.classList.contains('mode-all') ? '' : 'all'); });
  menu.querySelector('.pill-more').addEventListener('pointerdown', () => { closeStartMenu(); launchApp('explorer'); });
  new MutationObserver(() => { if (!menu.classList.contains('open')) { setMode(''); input.value = ''; } }).observe(menu, { attributes: true, attributeFilter: ['class'] });

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { setMode(''); return; }
    setMode('search');
    results.textContent = '';
    const sec = t => { const h = document.createElement('div'); h.className = 'sa-letter'; h.textContent = t; results.appendChild(h); };
    const row = (ic, label, attrs, sub) => {
      const r = document.createElement('div');
      r.className = 'sa-row'; Object.assign(r.dataset, attrs);
      r.innerHTML = iconHtml(ic) + '<span></span>' + (sub ? '<small></small>' : '');
      r.children[1].textContent = label;
      if (sub) r.lastChild.textContent = sub;
      results.appendChild(r);
    };
    const apps = ALL.filter(a => a[0].toLowerCase().includes(q)).slice(0, 5);
    const fl = window.fsSearch ? fsSearch(q, 6) : [];
    if (apps.length) { sec('Apps'); apps.forEach(([l, ic, app]) => row(ic, l, { app })); }
    if (fl.length) { sec('Documents and files'); fl.forEach(f => row('doc', f.name, { file: f.path }, f.path)); }
    if (!apps.length && !fl.length) sec('No results found');
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { const f = results.querySelector('.sa-row'); if (f) f.click(); } });
  menu.addEventListener('click', e => {
    const f = e.target.closest('[data-file]');
    if (f) { closeStartMenu(); fsOpen(f.dataset.file); }
  });

  /* ---------- Widgets panel ---------- */
  const wd = $('widgets'), wbtn = $('widgets-btn');
  // Weather for Cape Canaveral, FL: live from Open-Meteo (free, no key); these numbers are used while offline
  const WX = { temp: 82, icon: '⛅', desc: 'Partly cloudy', hi: 86, lo: 74, days: [['⛅', 85], ['🌦️', 84], ['☀️', 87], ['⛅', 86], ['🌦️', 83]] };
  const wxName = c => c === 0 ? ['☀️', 'Clear'] : c === 1 ? ['🌤️', 'Mostly clear'] : c === 2 ? ['⛅', 'Partly cloudy'] : c === 3 ? ['☁️', 'Overcast'] : c <= 48 ? ['🌫️', 'Fog'] :
    c <= 57 ? ['🌦️', 'Drizzle'] : c <= 67 ? ['🌧️', 'Rain'] : c <= 77 ? ['🌨️', 'Snow'] : c <= 82 ? ['🌦️', 'Showers'] : ['⛈️', 'Thunderstorms'];
  function renderWx() {
    wbtn.querySelector('.wd-ic').textContent = WX.icon;
    wbtn.querySelector('.wd-t').textContent = Math.round(WX.temp) + '°F';
    wbtn.querySelector('.wd-d').textContent = WX.desc;
    wd.querySelector('.wd-big').textContent = Math.round(WX.temp) + '°F';
    wd.querySelector('.wd-desc').textContent = WX.desc;
    wd.querySelector('.wd-sub').textContent = `H ${Math.round(WX.hi)}° · L ${Math.round(WX.lo)}° · ${SYS.place}`;
    wd.querySelectorAll('.wd-fc > div').forEach((el, i) => { el.querySelector('.fi').textContent = WX.days[i][0]; el.querySelector('.ft').textContent = Math.round(WX.days[i][1]) + '°'; });
  }
  async function loadWx() {
    try {
      const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=28.3922&longitude=-80.6077&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America%2FNew_York&forecast_days=6');
      const j = await r.json(), cur = wxName(j.current.weather_code);
      Object.assign(WX, { temp: j.current.temperature_2m, icon: cur[0], desc: cur[1], hi: j.daily.temperature_2m_max[0], lo: j.daily.temperature_2m_min[0],
        days: [1, 2, 3, 4, 5].map(i => [wxName(j.daily.weather_code[i])[0], j.daily.temperature_2m_max[i]]) });
      renderWx();
    } catch (e) { /* offline: keep the fallback numbers */ }
  }
  renderWx(); loadWx(); setInterval(loadWx, 600000);
  const wOpen = o => {
    wd.classList.toggle('open', o); wbtn.classList.toggle('active', o);
    if (!o) return;
    const now = new Date(), h = SYS.today().h;
    wd.querySelector('.wd-greet').textContent = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ', Guest';
    wd.querySelector('.wd-date').textContent = now.toLocaleDateString('en-US', { timeZone: SYS.tz, weekday: 'long', month: 'long', day: 'numeric' });
    wd.querySelectorAll('.fd').forEach((el, i) => { el.textContent = new Date(now.getTime() + (i + 1) * 864e5).toLocaleDateString('en-US', { timeZone: SYS.tz, weekday: 'short' }); });
  };
  wbtn.addEventListener('pointerdown', () => { closeStartMenu(); wOpen(!wd.classList.contains('open')); });
  wbtn.addEventListener('click', e => { if (e.detail === 0) wOpen(!wd.classList.contains('open')); });
  document.addEventListener('pointerdown', e => { if (!wd.contains(e.target) && !wbtn.contains(e.target)) wOpen(false); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') wOpen(false); });

  // Right-click on Start tiles, recommended items and desktop icons
  document.querySelectorAll('[data-app]').forEach(el => el.addEventListener('contextmenu', e => {
    e.preventDefault(); e.stopPropagation();
    const id = el.dataset.app;
    showCtx(e, [
      { label: 'Open', act: () => { closeStartMenu(); launchApp(id); } },
      ...(APPS[id] ? [pins.includes(id) ? { label: 'Unpin from taskbar', act: () => unpin(id) } : { label: 'Pin to taskbar', act: () => pin(id) }] : [])
    ]);
  }));
  $('wallpaper').addEventListener('contextmenu', e => {
    e.preventDefault();
    showCtx(e, [{ label: 'Refresh', act() {} }, { label: 'Display settings', act: () => launchApp('settings') }, { label: 'Personalize', act: () => launchApp('settings') }]);
  });

  /* ---------- Start menu: drag pinned tiles to reorder ---------- */
  const grid = menu.querySelector('.start-pinned');
  load('startOrder', []).forEach(id => { const t = grid.querySelector(`[data-app="${id}"]`); if (t) grid.appendChild(t); });
  let dragged = false;
  grid.addEventListener('pointerdown', e => {
    const tile = e.target.closest('.app-tile');
    if (!tile || e.button !== 0) return;
    const rr = scr.getBoundingClientRect(), k = rr.width / scr.offsetWidth;
    const sx = e.clientX, sy = e.clientY, ol = tile.offsetLeft, ot = tile.offsetTop;
    let on = false, cx = sx, cy = sy;
    const place = () => { tile.style.transform = `translate(${(cx - sx) / k + ol - tile.offsetLeft}px,${(cy - sy) / k + ot - tile.offsetTop}px) scale(1.06)`; };
    const move = ev => {
      cx = ev.clientX; cy = ev.clientY;
      if (!on) { if (Math.hypot(cx - sx, cy - sy) < 6) return; on = dragged = true; tile.classList.add('drag'); }
      const over = document.elementFromPoint(cx, cy)?.closest('.app-tile');
      if (over && over !== tile) {
        const kids = [...grid.children];
        grid.insertBefore(tile, kids.indexOf(over) > kids.indexOf(tile) ? over.nextSibling : over);
      }
      place();
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      if (!on) return;
      tile.classList.remove('drag'); tile.style.transform = '';
      save('startOrder', [...grid.children].map(t => t.dataset.app));
      setTimeout(() => { dragged = false; }, 60);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  });
  menu.addEventListener('click', e => { if (dragged) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);

  /* ---------- Clock: calendar flyout ---------- */
  const cal = $('calendar'), cg = cal.querySelector('.cal-grid'), clock = $('tray-clock');
  let view;
  function drawCal() {
    const now = new Date(), T = SYS.today();
    cal.querySelector('.cal-date').textContent = now.toLocaleDateString('en-US', { timeZone: SYS.tz, weekday: 'long', month: 'long', day: 'numeric' });
    cal.querySelector('.cal-title').textContent = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const start = new Date(view.getFullYear(), view.getMonth(), 1);
    start.setDate(1 - start.getDay());
    let h = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => `<span class="dow">${d}</span>`).join('');
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const cls = (d.getMonth() !== view.getMonth() ? 'dim ' : '') + (d.getFullYear() === T.y && d.getMonth() + 1 === T.m && d.getDate() === T.d ? 'today' : '');
      h += `<span class="${cls}">${d.getDate()}</span>`;
    }
    cg.innerHTML = h;
  }
  let calTimer = null;
  const calTime = () => { cal.querySelector('.cal-time').textContent = new Date().toLocaleTimeString('en-US', { timeZone: SYS.tz, hour: 'numeric', minute: '2-digit', second: '2-digit' }); };
  const calOpen = o => {
    cal.classList.toggle('open', o); clock.classList.toggle('active', o);
    clearInterval(calTimer);
    if (o) { const T = SYS.today(); view = new Date(T.y, T.m - 1, 1); drawCal(); calTime(); calTimer = setInterval(calTime, 1000); }
  };
  cal.querySelector('.cal-clock').addEventListener('click', () => { calOpen(false); launchApp('clock'); });
  clock.addEventListener('pointerdown', () => { closeStartMenu(); calOpen(!cal.classList.contains('open')); });
  cal.querySelector('.cal-prev').addEventListener('click', () => { view.setMonth(view.getMonth() - 1); drawCal(); });
  cal.querySelector('.cal-next').addEventListener('click', () => { view.setMonth(view.getMonth() + 1); drawCal(); });
  document.addEventListener('pointerdown', e => { if (!cal.contains(e.target) && !clock.contains(e.target)) calOpen(false); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') calOpen(false); });
})();
