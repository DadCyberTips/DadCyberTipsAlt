/**
 * Minesweeper - an original implementation of the classic puzzle.
 * Left click reveals, right click (or long-press on touch) flags,
 * click a revealed number to chord. First click is always safe.
 */
(function() {
  const LEVELS = { beginner: [9, 9, 10], intermediate: [16, 16, 40], expert: [30, 16, 99] };
  const COLORS = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000', '#808080'];
  const CS = 24;
  const sizeFor = (c, r) => [c * CS + 36, r * CS + 144];

  window.openMinesweeper = function() {
    if (windowManager.wins.has('minesweeper')) { windowManager.createWindow({ key: 'minesweeper' }); return; }

    const node = document.createElement('div');
    node.className = 'ms';
    node.innerHTML = `
      <div class="ms-menubar"><span class="ms-game">Game</span><span>Help</span>
        <div class="ms-dd">
          <div data-a="new">New</div>
          <div data-a="beginner">Beginner</div><div data-a="intermediate">Intermediate</div><div data-a="expert">Expert</div>
          <div data-a="exit">Exit</div>
        </div>
      </div>
      <div class="ms-panel">
        <div class="ms-top"><span class="ms-led ms-mines">010</span><button class="ms-face">🙂</button><span class="ms-led ms-time">000</span></div>
        <div class="ms-board"></div>
      </div>`;
    const $ = q => node.querySelector(q);
    const board = $('.ms-board'), face = $('.ms-face'), dd = $('.ms-dd'), game = $('.ms-game');

    let level = 'beginner', c, r, m, cells, els, started, over, flags, opened, time, timer;
    const [w0, h0] = sizeFor(9, 9);
    const win = windowManager.createWindow({ key: 'minesweeper', title: 'Minesweeper', icon: 'mine', node, width: w0, height: h0, left: 200, top: 50 });
    win.style.minWidth = '0'; win.style.minHeight = '0';

    const pad = (v, n) => (v < 0 ? '-' + String(-v).padStart(n - 1, '0') : String(v).padStart(n, '0'));
    const showCounts = () => { $('.ms-mines').textContent = pad(m - flags, 3); $('.ms-time').textContent = pad(time, 3); };
    const nbrs = i => {
      const x = i % c, y = (i / c) | 0, out = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < c && ny < r) out.push(ny * c + nx);
      }
      return out;
    };

    function draw(i) {
      const k = cells[i], e = els[i];
      e.className = 'ms-c' + (k.open ? ' o' : '') + (k.boom ? ' x' : '');
      e.style.color = '';
      e.textContent = '';
      if (k.open) {
        if (k.mine) e.textContent = '💣';
        else if (k.n) { e.textContent = k.n; e.style.color = COLORS[k.n]; }
      } else if (k.flag) e.textContent = over && !k.mine ? '❌' : '🚩';
      else if (over && k.mine) e.textContent = '💣';
    }

    function newGame(lv) {
      if (lv) level = lv;
      clearInterval(timer);
      [c, r, m] = LEVELS[level];
      cells = Array.from({ length: c * r }, () => ({ mine: false, open: false, flag: false, n: 0, boom: false }));
      started = over = false; flags = opened = time = 0;
      face.textContent = '🙂';
      board.style.gridTemplateColumns = `repeat(${c},${CS}px)`;
      board.textContent = '';
      els = cells.map((_, i) => {
        const e = document.createElement('div');
        e.className = 'ms-c'; e.dataset.i = i;
        board.appendChild(e);
        return e;
      });
      showCounts();
      const [W, H] = sizeFor(c, r);
      win.style.width = W + 'px'; win.style.height = H + 'px';
      win.style.left = Math.max(0, Math.min(win.offsetLeft, scr.offsetWidth - W)) + 'px';
      win.style.top = Math.max(0, Math.min(win.offsetTop, scr.offsetHeight - H - 48)) + 'px';
      dd.querySelectorAll('div').forEach(d => d.classList.toggle('chk', d.dataset.a === level));
    }

    function start(safe) {
      const avoid = new Set([safe, ...nbrs(safe)]);
      const pool = cells.map((_, i) => i).filter(i => !avoid.has(i));
      for (let n = 0; n < m; n++) cells[pool.splice((Math.random() * pool.length) | 0, 1)[0]].mine = true;
      cells.forEach((k, i) => { k.n = nbrs(i).filter(j => cells[j].mine).length; });
      started = true;
      timer = setInterval(() => {
        if (!node.isConnected) { clearInterval(timer); return; }
        if (time < 999) { time++; showCounts(); }
      }, 1000);
    }

    function lose(i) {
      over = true; clearInterval(timer);
      cells[i].boom = true; face.textContent = '😵';
      cells.forEach((k, j) => { if (k.mine && !k.flag) k.open = true; draw(j); });
      cells.forEach((_, j) => draw(j));
    }
    function win_() {
      over = true; clearInterval(timer); face.textContent = '😎';
      cells.forEach((k, j) => { if (k.mine) k.flag = true; draw(j); });
      flags = m; showCounts();
    }

    function reveal(i) {
      if (over) return;
      const k = cells[i];
      if (k.open || k.flag) return;
      if (!started) start(i);
      if (k.mine) { lose(i); return; }
      const stack = [i];
      while (stack.length) {
        const j = stack.pop(), q = cells[j];
        if (q.open || q.flag) continue;
        q.open = true; opened++; draw(j);
        if (!q.n) nbrs(j).forEach(x => { if (!cells[x].open) stack.push(x); });
      }
      if (opened === c * r - m) win_();
    }
    function toggleFlag(i) {
      if (over) return;
      const k = cells[i];
      if (k.open) return;
      k.flag = !k.flag; flags += k.flag ? 1 : -1;
      draw(i); showCounts();
    }
    function chord(i) {
      const k = cells[i];
      if (over || !k.open || !k.n) return;
      const ns = nbrs(i);
      if (ns.filter(j => cells[j].flag).length !== k.n) return;
      ns.forEach(j => { if (!cells[j].flag && !over) { if (cells[j].mine) lose(j); else reveal(j); } });
    }

    // Input: mouse acts on press for instant response; touch uses tap = reveal, long-press = flag
    let lp = null, lpFired = false;
    board.addEventListener('pointerdown', e => {
      const t = e.target.closest('.ms-c'); if (!t) return;
      const i = +t.dataset.i;
      if (e.pointerType === 'touch') {
        lpFired = false;
        lp = setTimeout(() => { lpFired = true; toggleFlag(i); }, 420);
        return;
      }
      if (e.button === 0) { cells[i].open ? chord(i) : reveal(i); }
      else if (e.button === 2) toggleFlag(i);
      else if (e.button === 1) { e.preventDefault(); chord(i); }
    });
    board.addEventListener('pointerup', e => {
      if (e.pointerType !== 'touch') return;
      clearTimeout(lp);
      const t = e.target.closest('.ms-c');
      if (t && !lpFired) { const i = +t.dataset.i; cells[i].open ? chord(i) : reveal(i); }
    });
    board.addEventListener('pointercancel', () => clearTimeout(lp));
    board.addEventListener('contextmenu', e => e.preventDefault());

    face.addEventListener('click', () => newGame());

    // Game menu
    game.addEventListener('pointerdown', e => { e.stopPropagation(); dd.classList.toggle('open'); game.classList.toggle('on', dd.classList.contains('open')); });
    dd.addEventListener('click', e => {
      const a = e.target.dataset.a; if (!a) return;
      dd.classList.remove('open'); game.classList.remove('on');
      if (a === 'exit') windowManager.closeWindow('minesweeper');
      else if (a === 'new') newGame();
      else newGame(a);
    });
    document.addEventListener('pointerdown', e => {
      if (!node.isConnected) return;
      if (!dd.contains(e.target) && e.target !== game) { dd.classList.remove('open'); game.classList.remove('on'); }
    }, true);

    newGame('beginner');
  };
})();
