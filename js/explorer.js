/**
 * File Explorer: folder tree, address bar (type a path), search, back/forward/up,
 * View > Hidden items, and a Notepad-style viewer. Data lives in filesystem.js.
 */
(function() {
  const TYPES = { txt: 'Text Document', log: 'Text Document', ini: 'Configuration settings', cfg: 'Configuration settings',
    tmp: 'TMP File', dat: 'DAT File', png: 'PNG File', jpg: 'JPG File', dll: 'Application extension', exe: 'Application',
    sys: 'System file', key: 'KEY File', bak: 'BAK File', md: 'Markdown File', json: 'JSON File', csv: 'CSV File' };
  const lc = s => s.toLowerCase();
  const root = () => ({ type: 'dir', children: window.FS });
  const find = (dir, name) => { const k = Object.keys(dir.children || {}).find(x => lc(x) === lc(name)); return k ? [k, dir.children[k]] : null; };
  function resolve(parts) {
    let n = root();
    const real = [];
    for (const p of parts) {
      const c = n.type === 'dir' && find(n, p);
      if (!c) return null;
      real.push(c[0]); n = c[1];
    }
    return { node: n, parts: real };
  }
  const toStr = p => !p.length ? 'This PC' : p.length === 1 ? p[0] + '\\' : p.join('\\');
  const parse = s => { s = s.trim().replace(/\//g, '\\').replace(/\\+$/, ''); return !s || lc(s) === 'this pc' ? [] : s.split('\\').filter(Boolean); };
  const label = (n, v) => v.label ? `${v.label} (${n})` : n;
  const typeOf = (n, v) => v.type === 'dir' ? 'File folder' : TYPES[lc(n.split('.').pop())] || (n.includes('.') ? n.split('.').pop().toUpperCase() + ' File' : 'File');
  const sizeOf = v => Math.max(1, Math.ceil((v.size ?? new Blob([v.content || '']).size) / 1024)) + ' KB';
  const key = p => lc(p.join('\\'));

  function openFile(path, name, node) {
    if (node.scare) { if (window.runJumpScare) window.runJumpScare(); return; }
    if (node.open === 'doc') { window.openDocument(); return; }
    const el = document.createElement('div');
    el.innerHTML = '<div class="menubar"><span>File</span><span>Edit</span><span>View</span></div><div class="doc-content"></div>';
    el.querySelector('.doc-content').textContent = node.content ?? "This file can't be previewed in this simulation.";
    windowManager.createWindow({ key: 'view:' + lc(path), title: name + ' - Notepad', icon: 'doc', node: el, width: 560, height: 380 });
  }

  window.openExplorer = function() {
    if (windowManager.wins.has('explorer')) { windowManager.createWindow({ key: 'explorer' }); return; }

    const node = document.createElement('div');
    node.className = 'ex';
    node.innerHTML = `
      <div class="ex-tools">
        <button class="ex-btn ex-back" title="Back">←</button><button class="ex-btn ex-fwd" title="Forward">→</button><button class="ex-btn ex-up" title="Up">↑</button>
        <input class="ex-addr" spellcheck="false"><input class="ex-search" placeholder="Search" spellcheck="false">
      </div>
      <div class="ex-cmd"><span class="ex-view">View ▾</span><div class="ex-dd"><div class="ex-hid">Hidden items</div></div></div>
      <div class="ex-body"><div class="ex-tree"></div><div class="ex-main" tabindex="0"></div></div>
      <div class="ex-status"><span class="ex-count"></span><span class="ex-selinfo"></span></div>`;
    const $ = q => node.querySelector(q);
    const addr = $('.ex-addr'), search = $('.ex-search'), tree = $('.ex-tree'), main = $('.ex-main'), dd = $('.ex-dd');
    const back = $('.ex-back'), fwd = $('.ex-fwd'), up = $('.ex-up');
    const win = windowManager.createWindow({ key: 'explorer', title: 'File Explorer', icon: 'folder', node, width: 820, height: 500, left: 90, top: 60 });

    let cur = [], hist = [], hi = -1, showHidden = false, filter = '', selName = null, lastN = null, lastT = 0;
    const expanded = new Set();

    function go(parts, push = true) {
      const r = resolve(parts);
      if (!r || r.node.type !== 'dir') return false;
      cur = r.parts;
      if (push) { hist = hist.slice(0, hi + 1); hist.push(cur); hi = hist.length - 1; }
      for (let i = 1; i <= cur.length; i++) expanded.add(key(cur.slice(0, i)));
      selName = null; filter = ''; search.value = '';
      render();
      return true;
    }
    const nav = d => { const n = hi + d; if (n >= 0 && n < hist.length) { hi = n; go(hist[hi], false); } };

    function openEntry(n, v) {
      if (v.type === 'dir') go([...cur, n]);
      else openFile(toStr([...cur, n]), n, v);
    }

    function renderTree() {
      tree.innerHTML = '';
      const add = (parts, nd, name, depth) => {
        const kids = Object.entries(nd.children || {}).filter(([, v]) => v.type === 'dir' && (showHidden || !v.hidden)).sort((a, b) => a[0].localeCompare(b[0]));
        const open = !parts.length || expanded.has(key(parts));
        const row = document.createElement('div');
        row.className = 'tr' + (key(parts) === key(cur) ? ' sel' : '');
        row.style.paddingLeft = (4 + depth * 14) + 'px';
        row.innerHTML = `<span class="chev">${kids.length && parts.length ? (open ? '▾' : '›') : ''}</span>${parts.length ? '<svg><use href="#i-folder"/></svg>' : '<span class="ico">🖥️</span>'}<span></span>`;
        row.lastChild.textContent = name;
        row.querySelector('.chev').addEventListener('pointerdown', e => {
          e.stopPropagation();
          if (!kids.length || !parts.length) return;
          expanded.has(key(parts)) ? expanded.delete(key(parts)) : expanded.add(key(parts));
          renderTree();
        });
        row.addEventListener('pointerdown', () => go(parts));
        tree.appendChild(row);
        if (open) kids.forEach(([n, v]) => add([...parts, n], v, label(n, v), depth + 1));
      };
      add([], root(), 'This PC', 0);
    }

    function status() {
      $('.ex-selinfo').textContent = selName ? '1 item selected' : '';
    }

    function renderList() {
      const dir = resolve(cur).node;
      const ents = Object.entries(dir.children || {})
        .filter(([n, v]) => (showHidden || !v.hidden) && lc(n).includes(lc(filter)))
        .sort((a, b) => (b[1].type === 'dir') - (a[1].type === 'dir') || a[0].localeCompare(b[0]));
      main.innerHTML = '<div class="ex-head"><span>Name</span><span>Date modified</span><span>Type</span><span>Size</span></div>';
      ents.forEach(([n, v]) => {
        const r = document.createElement('div');
        r.className = 'ex-row' + (v.hidden ? ' hid' : '') + (n === selName ? ' sel' : '');
        r.innerHTML = `<span class="ex-name"><svg><use href="${v.type === 'dir' ? '#i-folder' : '#i-doc'}"/></svg><span></span></span><span>${v.modified || '2026-09-01 12:00'}</span><span>${typeOf(n, v)}</span><span>${v.type === 'dir' ? '' : sizeOf(v)}</span>`;
        r.querySelector('.ex-name span').textContent = label(n, v);
        r.addEventListener('pointerdown', () => {
          const t = performance.now();
          if (lastN === n && t - lastT < 450) { lastN = null; openEntry(n, v); return; }
          lastN = n; lastT = t; selName = n;
          main.querySelectorAll('.ex-row').forEach(x => x.classList.toggle('sel', x === r));
          status();
        });
        main.appendChild(r);
      });
      $('.ex-count').textContent = `${ents.length} item${ents.length === 1 ? '' : 's'}`;
      status();
    }

    function render() {
      addr.value = toStr(cur); addr.classList.remove('bad');
      back.disabled = hi <= 0; fwd.disabled = hi >= hist.length - 1; up.disabled = !cur.length;
      win.querySelector('.title').textContent = (cur.length ? cur[cur.length - 1] : 'This PC') + ' - File Explorer';
      renderTree(); renderList();
    }

    back.addEventListener('click', () => nav(-1));
    fwd.addEventListener('click', () => nav(1));
    up.addEventListener('click', () => { if (cur.length) go(cur.slice(0, -1)); });
    search.addEventListener('input', () => { filter = search.value; renderList(); });
    addr.addEventListener('input', () => addr.classList.remove('bad'));
    addr.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const r = resolve(parse(addr.value));
      if (!r) { addr.classList.add('bad'); return; }
      if (r.node.type === 'dir') go(r.parts);
      else { openFile(toStr(r.parts), r.parts[r.parts.length - 1], r.node); addr.value = toStr(cur); }
    });
    main.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || !selName) return;
      const dir = resolve(cur).node, v = dir.children[selName];
      if (v) openEntry(selName, v);
    });

    $('.ex-view').addEventListener('pointerdown', e => { e.stopPropagation(); dd.classList.toggle('open'); });
    $('.ex-hid').addEventListener('click', e => {
      showHidden = !showHidden;
      e.currentTarget.classList.toggle('on', showHidden);
      dd.classList.remove('open');
      render();
    });
    document.addEventListener('pointerdown', e => {
      if (node.isConnected && !dd.contains(e.target) && !e.target.classList.contains('ex-view')) dd.classList.remove('open');
    }, true);

    go(['C:', 'Users', 'Guest']);
  };
})();
