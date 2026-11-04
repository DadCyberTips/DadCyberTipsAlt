/**
 * Mail: an inbox with two phishing emails and one genuine one. Hovering a link shows where it
 * really goes (bottom of the window). Both phishing links open a lookalike sign-in page; submitting
 * anything there locks Flag.txt for the rest of the visit and explains the warning signs.
 * Nothing typed into the fake page is kept or sent anywhere: the fields are cleared on submit.
 */
(function() {
  const MAILS = [
    { from: 'SnackSync Security', addr: 'security@snacksync-support.net', time: '9:41 AM', unread: true,
      subj: 'Action required: your password expires today', link: 'http://snacksync-security.verify-login.co/account',
      body: 'Dear User,\n\nYour SnackSync account password expires in 2 hours. To avoid losing access to your synced snacks, verify your account now.\n\n[[Keep my current password]]\n\nIf you do not verify within 2 hours, your account will be permanently suspended.\n\nSnackSync Account Team' },
    { from: 'SnackSpaceCon Prizes', addr: 'winner@snackspacec0n.com', time: 'Yesterday', unread: true,
      subj: 'Congratulations! You won a lifetime snack supply', link: 'http://snackspacec0n-prizes.top/claim',
      body: "Hi Guest,\n\nYou were randomly selected as this year's SnackSpaceCon grand prize winner!\n\nTo claim your LIFETIME SNACK SUPPLY, sign in and confirm your details within 24 hours:\n\n[[Claim my prize]]\n\nUnclaimed prizes go to the next winner.\n\nThe SnackSpaceCon Team" },
    { from: 'SnackSpaceCon Team', addr: 'team@snackspacecon.com', time: 'Mon', unread: false,
      subj: 'Your CTF schedule',
      body: 'Hi Guest,\n\nThanks for signing up for the SnackSpaceCon CTF! Doors open at 9:00 AM, and the snacks are in Hall B.\n\nA reminder: we will never email you a link asking for your password or payment details. If a message pressures you to act fast, go to our site by typing the address yourself.\n\nSee you there,\nThe SnackSpaceCon Team' }
  ];
  const SIGNS = [
    "The sender's address isn't from the real company: snacksync-support.net and snackspacec0n.com (a zero, not an o).",
    'It pressured you with a deadline ("2 hours", "24 hours") or a prize that seemed too good to be true.',
    "The link went somewhere else entirely: hovering showed verify-login.co or snackspacec0n-prizes.top.",
    'The sign-in page used http:// (not secure) on an address that was not the real site.',
    'Real companies never ask for your password by email. When in doubt, type the address yourself.'
  ];

  function phished() {
    windowManager.closeWindow('phish');
    if (!window.flagOpened && window.lockFlag) window.lockFlag('phish');
    const n = document.createElement('div');
    n.className = 'perm';
    n.innerHTML = '<div class="perm-body"><span class="perm-ic">🎣</span><div><h3>You\'ve been phished</h3><p class="perm-txt"></p><ul class="ph-signs"></ul><p class="perm-path">Nothing you typed was stored or sent anywhere.</p></div></div><div class="perm-btns"><button>OK</button></div>';
    n.querySelector('.perm-txt').textContent = window.flagOpened ? 'That sign-in page was fake. The warning signs:' : 'That sign-in page was fake, and the attackers have locked Flag.txt for the rest of this visit (reload the page to start over). The warning signs:';
    const ul = n.querySelector('.ph-signs');
    SIGNS.forEach(s => { const li = document.createElement('li'); li.textContent = s; ul.appendChild(li); });
    const w = windowManager.createWindow({ key: 'phished', title: 'Security alert', icon: 'info', node: n, width: 580, height: 410, top: 100, left: 210, front: true });
    w.style.minWidth = '0'; w.style.minHeight = '0';
    n.querySelector('button').addEventListener('click', () => windowManager.closeWindow('phished'));
  }

  // The lookalike sign-in page, shown in a bare browser window
  function phishPage(m) {
    windowManager.closeWindow('phish');
    const n = document.createElement('div');
    n.className = 'ph';
    n.innerHTML = `<div class="ph-bar"><span class="ph-warn">⚠ Not secure</span><span class="ph-url"></span></div>
      <form class="ph-card" autocomplete="off"><div class="ph-logo">🍿 SnackSync</div><h2>Sign in</h2>
        <input class="ph-user" placeholder="Email or username" spellcheck="false" autocomplete="off">
        <input class="ph-pass" type="password" placeholder="Password" autocomplete="new-password">
        <p class="ph-err"></p><button type="submit">Sign in</button><small>Keep your account secure. Never share your password.</small></form>`;
    n.querySelector('.ph-url').textContent = m.link;
    const w = windowManager.createWindow({ key: 'phish', title: 'Sign in - SnackSync', icon: 'edge', node: n, width: 620, height: 470, left: 200, top: 60, front: true });
    const u = n.querySelector('.ph-user'), p = n.querySelector('.ph-pass'), err = n.querySelector('.ph-err');
    n.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      const any = u.value.trim() || p.value;
      u.value = ''; p.value = '';                                   // never kept
      if (!any) { err.textContent = 'Enter your email or username.'; return; }
      phished();
    });
    u.focus();
    return w;
  }

  window.openMail = function() {
    if (windowManager.wins.has('mail')) { windowManager.createWindow({ key: 'mail' }); return; }
    const n = document.createElement('div');
    n.className = 'ml';
    n.innerHTML = '<div class="ml-side"><b>Inbox</b><span>Sent</span><span>Drafts</span><span>Junk</span></div><div class="ml-list"></div><div class="ml-read"><p class="ml-empty">Select an item to read</p></div><div class="ml-status"></div>';
    windowManager.createWindow({ key: 'mail', title: 'Inbox - Mail', icon: 'mail', node: n, width: 780, height: 470, left: 90, top: 50 });
    const list = n.querySelector('.ml-list'), read = n.querySelector('.ml-read'), status = n.querySelector('.ml-status');
    let sel = -1;
    function drawList() {
      list.textContent = '';
      MAILS.forEach((m, i) => {
        const r = document.createElement('div');
        r.className = 'ml-item' + (m.unread ? ' unread' : '') + (i === sel ? ' sel' : '');
        r.innerHTML = '<div class="ml-top"><b></b><small></small></div><div class="ml-subj"></div>';
        r.querySelector('b').textContent = m.from; r.querySelector('small').textContent = m.time; r.querySelector('.ml-subj').textContent = m.subj;
        r.addEventListener('pointerdown', () => { sel = i; m.unread = false; drawList(); show(m); });
        list.appendChild(r);
      });
    }
    function show(m) {
      read.innerHTML = '<h3></h3><div class="ml-from"><b></b> <span></span></div><div class="ml-body"></div>';
      read.querySelector('h3').textContent = m.subj;
      read.querySelector('.ml-from b').textContent = m.from;
      read.querySelector('.ml-from span').textContent = '<' + m.addr + '>';
      const body = read.querySelector('.ml-body');
      m.body.split(/(\[\[[^\]]+\]\])/).forEach(part => {
        const b = part.match(/^\[\[(.+)\]\]$/);
        if (!b) { body.appendChild(document.createTextNode(part)); return; }
        const a = document.createElement('a');
        a.className = 'ml-btn'; a.textContent = b[1]; a.href = '#';
        a.addEventListener('mouseenter', () => { status.textContent = m.link; });   // hover shows the real destination
        a.addEventListener('mouseleave', () => { status.textContent = ''; });
        a.addEventListener('click', e => { e.preventDefault(); phishPage(m); });
        body.appendChild(a);
      });
    }
    drawList();
  };
})();
