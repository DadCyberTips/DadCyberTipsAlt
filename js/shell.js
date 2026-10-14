/**
 * Shell: taskbar pinning, context menus, Start tile drag-to-reorder, calendar flyout.
 */
(function() {
  const $ = id => document.getElementById(id);
  const scr = $('screen'), bar = $('taskbar-apps'), menu = $('start-menu');
  const APPS = {
    doc: { label: 'Flag.txt', icon: 'doc', win: 'doc' },
    settings: { label: 'Settings', icon: 'gear', win: 'settings' },
    mines: { label: 'Minesweeper', icon: 'mine', win: 'minesweeper' },
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
  let pins = load('tbPins', []).filter(id => APPS[id]);
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

  // Right-click on Start tiles, recommended items and desktop icons
  document.querySelectorAll('[data-app]').forEach(el => el.addEventListener('contextmenu', e => {
    e.preventDefault(); e.stopPropagation();
    const id = el.dataset.app;
    showCtx(e, [
      { label: 'Open', act: () => { closeStartMenu(); launchApp(id); } },
      pins.includes(id) ? { label: 'Unpin from taskbar', act: () => unpin(id) } : { label: 'Pin to taskbar', act: () => pin(id) }
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
    const now = new Date();
    cal.querySelector('.cal-date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    cal.querySelector('.cal-title').textContent = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const start = new Date(view.getFullYear(), view.getMonth(), 1);
    start.setDate(1 - start.getDay());
    let h = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => `<span class="dow">${d}</span>`).join('');
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const cls = (d.getMonth() !== view.getMonth() ? 'dim ' : '') + (d.toDateString() === now.toDateString() ? 'today' : '');
      h += `<span class="${cls}">${d.getDate()}</span>`;
    }
    cg.innerHTML = h;
  }
  const calOpen = o => {
    cal.classList.toggle('open', o); clock.classList.toggle('active', o);
    if (o) { view = new Date(); view.setDate(1); drawCal(); }
  };
  clock.addEventListener('pointerdown', () => { closeStartMenu(); calOpen(!cal.classList.contains('open')); });
  cal.querySelector('.cal-prev').addEventListener('click', () => { view.setMonth(view.getMonth() - 1); drawCal(); });
  cal.querySelector('.cal-next').addEventListener('click', () => { view.setMonth(view.getMonth() + 1); drawCal(); });
  document.addEventListener('pointerdown', e => { if (!cal.contains(e.target) && !clock.contains(e.target)) calOpen(false); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') calOpen(false); });
})();
