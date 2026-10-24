/**
 * Mock Command Prompt and Windows PowerShell. Nothing here touches a real system or network:
 * it reads the fake file tree (window.FS), the fake process/service data (window.SYS),
 * and everything that would change the machine answers "Access is denied" (standard user).
 * Type  help  inside either shell for the command list.
 */
(function() {
  const SYS = window.SYS, NET = SYS.net;
  const lc = s => s.toLowerCase();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const pad = (s, n) => String(s).padEnd(n), rpad = (s, n) => String(s).padStart(n);
  const commas = n => Number(n).toLocaleString('en-US');
  const rnd = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /* ---------- file system helpers (read-only view of window.FS) ---------- */
  const find = (dir, name) => { const k = Object.keys(dir.children || {}).find(x => lc(x) === lc(name)); return k ? [k, dir.children[k]] : null; };
  function lookup(parts) {
    let n = { type: 'dir', children: window.FS };
    const real = [];
    for (const p of parts) {
      if (n.protected) return { node: n, parts: real, blocked: true };
      const c = n.type === 'dir' && find(n, p);
      if (!c) return null;
      real.push(c[0]); n = c[1];
    }
    return { node: n, parts: real, blocked: !!n.protected };
  }
  const pathStr = p => p.length === 1 ? p[0] + '\\' : p.join('\\');
  function resolvePath(str, cwd) {
    str = str.replace(/\//g, '\\');
    const m = str.match(/^([A-Za-z]:)(.*)$/);
    let parts;
    if (m) { const rest = m[2].split('\\').filter(Boolean); parts = m[2].startsWith('\\') || m[1].toUpperCase() !== cwd[0] ? [m[1].toUpperCase(), ...rest] : [...cwd, ...rest]; }
    else if (str.startsWith('\\')) parts = [cwd[0], ...str.split('\\').filter(Boolean)];
    else parts = [...cwd, ...str.split('\\').filter(Boolean)];
    const out = [];
    for (const p of parts) { if (p === '.') continue; if (p === '..') { if (out.length > 1) out.pop(); continue; } out.push(p); }
    return out;
  }
  const dparts = m => { const [d, t] = (m || '2026-09-01 12:00').split(' '); const [Y, M, D] = d.split('-'); let [hh, mm] = t.split(':'); hh = +hh; return { Y, M, D, mm, h12: hh % 12 || 12, ap: hh >= 12 ? 'PM' : 'AM' }; };
  const fmtDate = m => { const p = dparts(m); return `${p.M}/${p.D}/${p.Y}  ${String(p.h12).padStart(2, '0')}:${p.mm} ${p.ap}`; };
  const fmtPS = m => { const p = dparts(m); return `${rpad(p.M + '/' + p.D + '/' + p.Y, 10)}  ${rpad(p.h12 + ':' + p.mm + ' ' + p.ap, 8)}`; };
  const sizeOf = v => v.type === 'dir' ? 0 : v.content != null ? v.content.length : (v.kb || 0) * 1024;
  const hasWild = s => /[*?]/.test(s);
  const wild = pat => new RegExp('^' + (pat === '*.*' ? '*' : pat).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
  const visible = (v, mode) => mode === 'all' || (mode === 'hidden' ? v.hidden : !v.hidden);
  const byName = (x, y) => (y[1].type === 'dir') - (x[1].type === 'dir') || x[0].localeCompare(y[0]);

  // Read a file as text, honouring protection and the Flag.txt update/lock rules
  function readFile(arg, S) {
    const p = resolvePath(arg, S.cwd), r = lookup(p);
    if (!r) return { err: 'The system cannot find the file specified.' };
    if (r.blocked || r.node.type === 'dir') return { err: 'Access is denied.' };
    if (r.node.open === 'doc') {
      const t = window.readFlagForTerminal && window.readFlagForTerminal();
      return t == null ? { err: 'Access is denied.' } : { text: t, path: pathStr(r.parts), node: r.node };
    }
    if (r.node.content != null) return { text: r.node.content.replace(/\n$/, ''), path: pathStr(r.parts), node: r.node };
    return { text: 'MZ\u0090\u0000\u0003\u0000\u0000\u0000\u0004\u0000\u0000\u0000\u00ff\u00ff\u0000\u0000\u00b8 ... This program cannot be run in DOS mode.', path: pathStr(r.parts), node: r.node, binary: true };
  }
  // Expand file specs (wildcards, optional recursion) into readable files; hidden and protected folders are skipped
  function expandFiles(specs, S, rec) {
    const out = [];
    for (const sp of specs) {
      let parts = resolvePath(sp, S.cwd), pat = null;
      if (hasWild(parts[parts.length - 1])) pat = wild(parts.pop());
      const r = lookup(parts);
      if (!r || r.blocked) continue;
      if (r.node.type === 'file') { out.push({ path: pathStr(r.parts), node: r.node }); continue; }
      const walk = (node, ps) => {
        for (const [k, v] of Object.entries(node.children || {})) {
          if (v.hidden || v.protected) continue;
          const np = [...ps, k];
          if (v.type === 'file') { if (!pat || pat.test(k)) out.push({ path: pathStr(np), node: v }); }
          else if (rec) walk(v, np);
        }
      };
      walk(r.node, r.parts);
    }
    return out;
  }
  async function sha(alg, text) {
    const names = { SHA1: 'SHA-1', SHA256: 'SHA-256', SHA384: 'SHA-384', SHA512: 'SHA-512' }, len = { SHA1: 40, SHA256: 64, SHA384: 96, SHA512: 128 };
    if (!names[alg]) return null;
    const subtle = globalThis.crypto && globalThis.crypto.subtle;
    if (subtle) return [...new Uint8Array(await subtle.digest(names[alg], new TextEncoder().encode(text)))].map(b => b.toString(16).padStart(2, '0')).join('');
    let x = [...text].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7), o = '';
    while (o.length < len[alg]) { x = (x * 1103515245 + 12345) >>> 0; o += x.toString(16).padStart(8, '0'); }
    return o.slice(0, len[alg]);
  }
  const fileBytes = f => f.text != null && !f.binary ? f.text : f.path + ':' + (f.node.kb || 0);

  /* ---------- parsing ---------- */
  const tokenize = s => { const t = []; s.replace(/"([^"]*)"|'([^']*)'|(\S+)/g, (m, a, b, c) => { t.push(a ?? b ?? c); return m; }); return t; };
  function splitUnquoted(s, ch) {
    const out = []; let cur = '', q = null;
    for (const c of s) {
      if (q) { if (c === q) q = null; cur += c; }
      else if (c === '"' || c === "'") { q = c; cur += c; }
      else if (c === ch) { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out;
  }
  const hasRedirect = s => splitUnquoted(s, '>').length > 1;

  /* ---------- network pretend-world ---------- */
  function resolveHost(host) {
    const l = lc(host);
    if (l === 'localhost' || l === '127.0.0.1') return '127.0.0.1';
    if (l === lc(NET.host)) return NET.ip;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host;
    if (l.includes('.')) return '198.51.100.' + (1 + SYS.h(l) % 250);
    return null;
  }
  const dateStr = (d = new Date()) => d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') + '/' + d.getFullYear();
  const SID = [['Everyone', 'Well-known group', 'S-1-1-0'], ['BUILTIN\\Users', 'Alias', 'S-1-5-32-545'], ['NT AUTHORITY\\INTERACTIVE', 'Well-known group', 'S-1-5-4'], ['CONSOLE LOGON', 'Well-known group', 'S-1-2-1'],
    ['NT AUTHORITY\\Authenticated Users', 'Well-known group', 'S-1-5-11'], ['NT AUTHORITY\\This Organization', 'Well-known group', 'S-1-5-15'], ['LOCAL', 'Well-known group', 'S-1-2-0'], ['Mandatory Label\\Medium Mandatory Level', 'Label', 'S-1-16-8192']];
  const UNBUILT = 'mspaint regedit mmc msconfig control eventvwr compmgmt diskmgmt devmgmt mstsc snippingtool wordpad osk charmap perfmon resmon msinfo32 dxdiag winver cleanmgr gpedit secpol lusrmgr';
  const PALETTE = ['#0c0c0c', '#0037da', '#13a10e', '#3a96dd', '#c50f1f', '#881798', '#c19c00', '#cccccc', '#767676', '#3b78ff', '#16c60c', '#61d6d6', '#e74856', '#b4009e', '#f9f1a5', '#f2f2f2'];
  const ENV = { USERNAME: 'Guest', COMPUTERNAME: NET.host, USERDOMAIN: NET.host, USERPROFILE: 'C:\\Users\\Guest', HOMEDRIVE: 'C:', HOMEPATH: '\\Users\\Guest', SYSTEMROOT: 'C:\\Windows',
    SYSTEMDRIVE: 'C:', OS: 'Windows_NT', TEMP: 'C:\\Users\\Guest\\AppData\\Local\\Temp', TMP: 'C:\\Users\\Guest\\AppData\\Local\\Temp', PROCESSOR_ARCHITECTURE: 'AMD64', NUMBER_OF_PROCESSORS: '12',
    PATH: 'C:\\Windows\\system32;C:\\Windows;C:\\Windows\\System32\\Wbem;C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\', PATHEXT: '.COM;.EXE;.BAT;.CMD;.VBS;.JS;.MSC', PROMPT: '$P$G' };

  const HELP = `Commands available in this Command Prompt (type  powershell  for PowerShell):

  Files       dir [/a] [/ah] [/s] [/b]   cd   tree [/f]   type   more   findstr [/i /s /n]   find   attrib   sort   vol
  System      whoami [/priv | /groups]   hostname   systeminfo   ver   set   path   date /t   time /t   runas
  Processes   tasklist [/svc]   taskkill /im <name> | /pid <n>   sc query | qc <svc>   schtasks /query   net start
  Network     ipconfig [/all]   ping [-n]   tracert   nslookup   netstat [-an | -ano]   arp -a   getmac
  Accounts    net user [name]   net localgroup [name]   net share   net use
  Tools       certutil -hashfile <file> [SHA256]   color [xy]   title   cls   exit
  Launch      notepad [file]   calc   taskmgr   explorer [path]   winmine   start <app>   powershell   cmd`;
  const PSHELP = `Cmdlets and aliases available in this PowerShell (native commands like ipconfig, ping, whoami, netstat, tasklist also work):

  Get-ChildItem (ls, dir, gci) [-Force] [-Recurse]     Get-Content (cat, type, gc)     Set-Location (cd)     Get-Location (pwd)
  Select-String (sls) -Pattern <text> -Path <files>     Get-FileHash [-Algorithm SHA256]
  Get-Process (ps)    Stop-Process -Name <n> (kill)     Get-Service (gsv)     Get-Date     Get-LocalUser     Get-LocalGroupMember <group>
  Test-Connection <host>     Resolve-DnsName <host>     Start-Process <app>     Write-Host (echo)     Clear-Host (cls)     exit
  $env:USERNAME   $PSVersionTable`;

  const CMD = {}, PSCMD = {};
  const def = (names, fn, table = CMD) => names.split(' ').forEach(n => { table[n] = fn; });

  /* ---------- core ---------- */
  def('help ?', (a, c) => c.emit(c.S.isPS() ? PSHELP : HELP));
  def('cls clear', (a, c) => c.S.clear());
  def('echo', (a, c) => c.emit(a.join(' ')));
  def('ver', (a, c) => c.emit('', 'Microsoft Windows [Version 10.0.26100.2033]', ''));
  def('vol', (a, c) => c.emit(' Volume in drive C is Local Disk', ' Volume Serial Number is 4A2B-9F1C'));
  def('hostname', (a, c) => c.emit(NET.host));
  def('exit', (a, c) => c.S.exit());
  def('title', (a, c) => c.S.setTitle(a.join(' ')));
  def('color', (a, c) => c.S.setColor(a[0]));
  def('path', (a, c) => c.emit('PATH=' + c.S.env.PATH));
  def('date', (a, c) => c.emit(a.some(x => lc(x) === '/t') ? dateStr() : 'The current date is: ' + dateStr()));
  def('time', (a, c) => { const d = new Date(); c.emit(a.some(x => lc(x) === '/t') ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'The current time is: ' + d.toTimeString().slice(0, 8) + '.00'); });
  def('set', (a, c) => {
    const s = a.join(' '), env = c.S.env;
    if (!s) { Object.keys(env).sort().forEach(k => c.emit(k + '=' + env[k])); return; }
    const m = s.match(/^([^=]+)=(.*)$/);
    if (m) { const k = m[1].trim().toUpperCase(); if (m[2]) env[k] = m[2]; else delete env[k]; }
    else Object.keys(env).filter(k => k.startsWith(s.toUpperCase())).sort().forEach(k => c.emit(k + '=' + env[k]));
  });
  def('whoami', (a, c) => {
    const f = lc(a.join(' '));
    if (f.includes('/priv')) c.emit('', 'PRIVILEGES INFORMATION', '----------------------', '', pad('Privilege Name', 32) + pad('Description', 40) + 'State', '='.repeat(29) + ' ' + '='.repeat(38) + ' ========',
      pad('SeShutdownPrivilege', 32) + pad('Shut down the system', 40) + 'Disabled', pad('SeChangeNotifyPrivilege', 32) + pad('Bypass traverse checking', 40) + 'Enabled',
      pad('SeUndockPrivilege', 32) + pad('Remove computer from docking station', 40) + 'Disabled', pad('SeIncreaseWorkingSetPrivilege', 32) + pad('Increase a process working set', 40) + 'Disabled',
      pad('SeTimeZonePrivilege', 32) + pad('Change the time zone', 40) + 'Disabled');
    else if (f.includes('/groups')) c.emit('', 'GROUP INFORMATION', '-----------------', '', pad('Group Name', 40) + pad('Type', 20) + pad('SID', 14) + 'Attributes', '='.repeat(39) + ' ' + '='.repeat(18) + ' ' + '='.repeat(12) + ' ' + '='.repeat(40),
      ...SID.map(([g, t, s]) => pad(g, 40) + pad(t, 20) + pad(s, 14) + 'Mandatory group, Enabled by default, Enabled group'));
    else c.emit(lc(NET.host) + '\\guest');
  });
  def('systeminfo', (a, c) => c.emit(`Host Name:                 ${NET.host}`, 'OS Name:                   Microsoft Windows 11 Pro', 'OS Version:                10.0.26100 N/A Build 26100', 'OS Manufacturer:           Microsoft Corporation',
    'OS Configuration:          Standalone Workstation', 'Registered Owner:          Guest', 'Original Install Date:     9/1/2026, 12:00:00 PM', 'System Manufacturer:       SnackSpaceCon Systems', 'System Model:              SnackBox 13',
    'System Type:               x64-based PC', 'Processor(s):              1 Processor(s) Installed.', '                           [01]: Intel64 Family 6 Model 165 ~2904 Mhz', 'BIOS Version:              SSC 1.3.37, 8/1/2026',
    'Windows Directory:         C:\\Windows', 'System Directory:          C:\\Windows\\system32', 'Boot Device:              \\Device\\HarddiskVolume1', 'System Locale:            en-us;English (United States)',
    'Time Zone:                 ' + (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'), 'Total Physical Memory:     16,384 MB', 'Available Physical Memory: 9,812 MB', 'Hotfix(s):                 2 Hotfix(s) Installed.',
    '                           [01]: KB5030001', '                           [02]: KB5031002', 'Network Card(s):           1 NIC(s) Installed.', '                           [01]: Intel(R) Ethernet Connection (7) I219-V',
    '                                 Connection Name: Ethernet', '                                 DHCP Enabled:    Yes', `                                 IP address(es)`, `                                 [01]: ${NET.ip}`));

  /* ---------- files ---------- */
  def('cd chdir', (a, c) => {
    const arg = a.filter(x => lc(x) !== '/d').join(' ');
    if (!arg) { c.emit(pathStr(c.S.cwd)); return; }
    const r = lookup(resolvePath(arg, c.S.cwd));
    if (!r) c.emit('The system cannot find the path specified.');
    else if (r.blocked) c.emit('Access is denied.');
    else if (r.node.type !== 'dir') c.emit('The directory name is invalid.');
    else c.S.cwd = r.parts;
  });
  def('dir', (a, c) => {
    let mode = 'normal', rec = false, bare = false, tgt = null;
    for (const x of a) { const l = lc(x); if (/^\/a/.test(l)) mode = /h/.test(l.slice(2)) && !/-h/.test(l) ? 'hidden' : 'all'; else if (l === '/s') rec = true; else if (l === '/b') bare = true; else if (l[0] !== '/') tgt = x; }
    let parts = tgt ? resolvePath(tgt, c.S.cwd) : c.S.cwd, pat = null, r;
    if (tgt && hasWild(parts[parts.length - 1])) pat = wild(parts.pop());
    r = lookup(parts);
    if (r && !r.blocked && r.node.type === 'file') { pat = new RegExp('^' + esc(parts[parts.length - 1]) + '$', 'i'); parts = parts.slice(0, -1); r = lookup(parts); }
    if (!r) { c.emit('File Not Found'); return; }
    if (r.blocked) { c.emit('Access is denied.'); return; }
    const T = { f: 0, b: 0, d: 0 };
    if (!bare) c.emit(` Volume in drive ${parts[0][0]} is ${(window.FS[parts[0]] || {}).label || 'Local Disk'}`, ' Volume Serial Number is 4A2B-9F1C');
    const show = ps => {
      const rr = lookup(ps);
      if (!rr || rr.blocked) return;
      const ents = Object.entries(rr.node.children || {}).filter(([k, v]) => visible(v, mode) && (!pat || pat.test(k))).sort(byName);
      if (!bare) {
        c.emit('', ' Directory of ' + pathStr(ps), '');
        if (ps.length > 1 && !pat && mode !== 'hidden') { const d = fmtDate(rr.node.modified); c.emit(`${d}    <DIR>          .`, `${d}    <DIR>          ..`); }
      }
      let f = 0, b = 0, d = 0;
      for (const [k, v] of ents) {
        if (bare) c.emit(rec ? pathStr([...ps, k]) : k);
        else c.emit(`${fmtDate(v.modified)}    ${v.type === 'dir' ? '<DIR>          ' : rpad(commas(sizeOf(v)), 14) + ' '}${k}`);
        if (v.type === 'dir') d++; else { f++; b += sizeOf(v); }
      }
      T.f += f; T.b += b; T.d += d;
      if (!bare && !rec) c.emit(`${rpad(f, 16)} File(s) ${rpad(commas(b), 14)} bytes`, `${rpad(d + (ps.length > 1 && !pat ? 2 : 0), 16)} Dir(s)  124,812,918,784 bytes free`);
      if (rec) for (const [k, v] of Object.entries(rr.node.children || {}).sort(byName)) if (v.type === 'dir' && !v.protected && visible(v, mode)) show([...ps, k]);
    };
    show(parts);
    if (rec && !bare) c.emit('', '     Total Files Listed:', `${rpad(T.f, 16)} File(s) ${rpad(commas(T.b), 14)} bytes`, `${rpad(T.d, 16)} Dir(s)  124,812,918,784 bytes free`);
    if (!T.f && !T.d && pat && !bare) c.emit('File Not Found');
  });
  def('tree', (a, c) => {
    const files = a.some(x => lc(x) === '/f'), tgt = a.find(x => x[0] !== '/');
    const parts = tgt ? resolvePath(tgt, c.S.cwd) : c.S.cwd, r = lookup(parts);
    if (!r || r.node.type !== 'dir') { c.emit('Invalid path - ' + (tgt || pathStr(parts)), 'No subfolders exist'); return; }
    if (r.blocked) { c.emit('Access is denied.'); return; }
    c.emit('Folder PATH listing for volume Local Disk', 'Volume serial number is 4A2B-9F1C', pathStr(parts));
    const walk = (node, pre) => {
      const ents = Object.entries(node.children || {}).filter(([k, v]) => !v.hidden && (files || v.type === 'dir')).sort(byName);
      ents.forEach(([k, v], i) => {
        const last = i === ents.length - 1;
        c.emit(pre + (last ? '└───' : '├───') + k);
        if (v.type === 'dir' && !v.protected) walk(v, pre + (last ? '    ' : '│   '));
      });
    };
    walk(r.node, '');
  });
  def('type', (a, c) => {
    const fs = a.filter(x => x[0] !== '/');
    if (!fs.length) { c.emit('The syntax of the command is incorrect.'); return; }
    fs.forEach(f => { const r = readFile(f, c.S); c.emit(r.err || r.text); });
  });
  def('more', (a, c) => { if (c.stdin) c.emit(...c.stdin); else CMD.type(a, c); });
  def('sort', (a, c) => {
    const lines = c.stdin ? [...c.stdin] : a.filter(x => x[0] !== '/').flatMap(f => { const r = readFile(f, c.S); return (r.err || r.text).split('\n'); });
    c.emit(...lines.sort((x, y) => x.localeCompare(y)));
  });
  def('attrib', (a, c) => {
    const tgt = a.find(x => x[0] !== '/');
    const row = (v, p) => c.emit(`${v.type === 'dir' ? ' ' : 'A'}    ${v.protected ? 'S' : ' '}${v.hidden ? 'H' : ' '}        ${p}`);
    if (!tgt) { const r = lookup(c.S.cwd); Object.entries(r.node.children || {}).filter(([, v]) => v.type === 'file').forEach(([k, v]) => row(v, pathStr([...c.S.cwd, k]))); return; }
    const p = resolvePath(tgt, c.S.cwd), r = lookup(p);
    if (!r) c.emit('File not found - ' + tgt); else row(r.node, pathStr(r.parts));
  });
  const grep = (c, { test, specs, rec, number, withNames, invert, header }) => {
    const hit = l => !!test(l) !== !!invert;
    if (c.stdin && !specs.length) { c.stdin.forEach((l, i) => { if (hit(l)) c.emit((number ? (i + 1) + ':' : '') + l); }); return; }
    const files = expandFiles(specs, c.S, rec);
    if (!files.length) { c.emit('File not found - ' + specs.join(' ')); return; }
    for (const f of files) {
      if (f.node.content == null) continue;
      if (header) c.emit('', '---------- ' + f.path.toUpperCase());
      f.node.content.replace(/\n$/, '').split('\n').forEach((l, i) => {
        if (hit(l)) c.emit((withNames || files.length > 1 || rec ? f.path + ':' : '') + (number ? (i + 1) + ':' : '') + l);
      });
    }
  };
  def('findstr', (a, c) => {
    const fl = a.filter(x => x[0] === '/').map(lc), rest = a.filter(x => x[0] !== '/');
    if (!rest.length) { c.emit('FINDSTR: Bad command line'); return; }
    const pat = rest[0], ci = fl.includes('/i');
    grep(c, { test: l => ci ? lc(l).includes(lc(pat)) : l.includes(pat), specs: rest.slice(1), rec: fl.includes('/s'), number: fl.includes('/n'), invert: fl.includes('/v') });
  });
  def('find', (a, c) => {
    const fl = a.filter(x => x[0] === '/').map(lc), rest = a.filter(x => x[0] !== '/');
    if (!rest.length) { c.emit('FIND: Parameter format not correct'); return; }
    const pat = rest[0], ci = fl.includes('/i');
    grep(c, { test: l => ci ? lc(l).includes(lc(pat)) : l.includes(pat), specs: rest.slice(1), rec: false, number: fl.includes('/n'), invert: fl.includes('/v'), header: true });
  });
  ['mkdir md rmdir rd del erase copy move ren rename xcopy robocopy mklink'].forEach(n => def(n, (a, c) => c.emit('Access is denied.')));

  /* ---------- network ---------- */
  def('ipconfig', (a, c) => {
    const all = a.some(x => lc(x) === '/all');
    c.emit('', 'Windows IP Configuration', '');
    if (all) c.emit(`   Host Name . . . . . . . . . . . . : ${NET.host}`, '   Primary Dns Suffix  . . . . . . . : ', '   Node Type . . . . . . . . . . . . : Hybrid', '   IP Routing Enabled. . . . . . . . : No', '   WINS Proxy Enabled. . . . . . . . : No', `   DNS Suffix Search List. . . . . . : ${NET.suffix}`, '');
    c.emit('Ethernet adapter Ethernet:', '', `   Connection-specific DNS Suffix  . : ${NET.suffix}`);
    if (all) c.emit('   Description . . . . . . . . . . . : Intel(R) Ethernet Connection (7) I219-V', `   Physical Address. . . . . . . . . : ${NET.mac}`, '   DHCP Enabled. . . . . . . . . . . : Yes', '   Autoconfiguration Enabled . . . . : Yes');
    c.emit('   Link-local IPv6 Address . . . . . : fe80::1a2b:3c4d:5e6f:7a8b%12(Preferred)', `   IPv4 Address. . . . . . . . . . . : ${NET.ip}${all ? '(Preferred)' : ''}`, `   Subnet Mask . . . . . . . . . . . : ${NET.mask}`, `   Default Gateway . . . . . . . . . : ${NET.gw}`);
    if (all) c.emit(`   DHCP Server . . . . . . . . . . . : ${NET.gw}`, `   DNS Servers . . . . . . . . . . . : ${NET.dns}`, '   NetBIOS over Tcpip. . . . . . . . : Enabled');
  });
  def('getmac', (a, c) => c.emit('', 'Physical Address    Transport Name', '=================== ==========================================================', pad(NET.mac, 19) + ' \\Device\\Tcpip_{8A1B2C3D-4E5F-6A7B-8C9D-0E1F2A3B4C5D}'));
  def('arp', (a, c) => c.emit('', `Interface: ${NET.ip} --- 0xc`, '  Internet Address      Physical Address      Type', `  ${pad(NET.gw, 22)}b8-27-eb-12-34-56     dynamic`, '  192.168.1.77          3c-52-82-9a-bc-de     dynamic', '  192.168.1.255         ff-ff-ff-ff-ff-ff     static', '  224.0.0.22            01-00-5e-00-00-16     static', '  239.255.255.250       01-00-5e-7f-ff-fa     static'));
  def('nslookup', (a, c) => {
    const host = a.find(x => x[0] !== '-');
    if (!host) { c.emit(`Default Server:  UnKnown`, `Address:  ${NET.dns}`, ''); return; }
    const ip = resolveHost(host);
    c.emit('Server:  UnKnown', `Address:  ${NET.dns}`, '');
    if (!ip) c.emit(`*** UnKnown can't find ${host}: Non-existent domain`); else c.emit(`Name:    ${host}`, `Address:  ${ip}`, '');
  });
  def('netstat', (a, c) => {
    const f = lc(a.join(' ')), pid = f.includes('o');
    const L = [['TCP', '0.0.0.0:135', '0.0.0.0:0', 'LISTENING', 860], ['TCP', '0.0.0.0:445', '0.0.0.0:0', 'LISTENING', 4], ['TCP', '0.0.0.0:5040', '0.0.0.0:0', 'LISTENING', 3012],
      ['TCP', '0.0.0.0:31337', '0.0.0.0:0', 'LISTENING', 4242], ['TCP', `${NET.ip}:139`, '0.0.0.0:0', 'LISTENING', 4], ['TCP', `${NET.ip}:49701`, '203.0.113.25:443', 'ESTABLISHED', 4620],
      ['TCP', `${NET.ip}:49733`, '203.0.113.80:443', 'ESTABLISHED', 4620], ['TCP', `${NET.ip}:49802`, '203.0.113.7:443', 'TIME_WAIT', 0], ['UDP', '0.0.0.0:5353', '*:*', '', 952], ['UDP', `${NET.ip}:137`, '*:*', '', 4]];
    c.emit('', 'Active Connections', '', pad('  Proto', 9) + pad('Local Address', 24) + pad('Foreign Address', 24) + pad('State', 14) + (pid ? 'PID' : ''));
    L.forEach(([p, l, fa, s, id]) => c.emit('  ' + pad(p, 7) + pad(l, 24) + pad(fa, 24) + pad(s, 14) + (pid ? id : '')));
  });
  const pingReplies = async (c, host, n, fmt) => {
    const ip = resolveHost(host);
    if (!ip) return null;
    const out = [];
    for (let i = 0; i < n; i++) {
      if (c.S.aborted) break;
      await sleep(420);
      const loc = ip === '127.0.0.1', ms = loc ? 0 : ip === NET.gw ? rnd(1, 3) : ip === NET.ip ? 0 : rnd(14, 42);
      out.push(ms); c.emit(fmt(ip, ms, loc || ip === NET.ip ? 128 : ip === NET.gw ? 64 : 117));
    }
    return { ip, out };
  };
  def('ping', async (a, c) => {
    const host = a.find((x, i) => x[0] !== '-' && x[0] !== '/' && lc(a[i - 1] || '') !== '-n' && lc(a[i - 1] || '') !== '-l');
    if (!host) { c.emit('', 'Usage: ping [-n count] target_name'); return; }
    const ni = a.findIndex(x => lc(x) === '-n'), n = Math.min(10, Math.max(1, +a[ni + 1] || 4));
    const ip = resolveHost(host);
    if (!ip) { c.emit(`Ping request could not find host ${host}. Please check the name and try again.`); return; }
    c.emit('', `Pinging ${host}${host === ip ? '' : ' [' + ip + ']'} with 32 bytes of data:`);
    const r = await pingReplies(c, host, n, (ip2, ms, ttl) => `Reply from ${ip2}: bytes=32 time${ms ? '=' + ms : '<1'}ms TTL=${ttl}`);
    const o = r.out, sent = o.length;
    c.emit('', `Ping statistics for ${ip}:`, `    Packets: Sent = ${sent}, Received = ${sent}, Lost = 0 (0% loss),`);
    if (sent) c.emit('Approximate round trip times in milli-seconds:', `    Minimum = ${Math.min(...o)}ms, Maximum = ${Math.max(...o)}ms, Average = ${Math.round(o.reduce((s, x) => s + x, 0) / sent)}ms`);
  });
  def('tracert', async (a, c) => {
    const host = a.find(x => x[0] !== '-' && x[0] !== '/');
    if (!host) { c.emit('', 'Usage: tracert [-d] target_name'); return; }
    const ip = resolveHost(host);
    if (!ip) { c.emit(`Unable to resolve target system name ${host}.`); return; }
    c.emit('', `Tracing route to ${host}${host === ip ? '' : ' [' + ip + ']'}`, 'over a maximum of 30 hops:', '');
    const hops = [NET.gw, '10.20.30.1', '172.16.4.9', '203.0.113.' + (1 + SYS.h(host) % 200), ip];
    for (let i = 0; i < hops.length && !c.S.aborted; i++) {
      await sleep(320);
      const t = () => (i === 0 ? '<1 ms' : rnd(6 + i * 4, 12 + i * 5) + ' ms');
      c.emit(`${rpad(i + 1, 3)}  ${rpad(t(), 7)}  ${rpad(t(), 7)}  ${rpad(t(), 7)}  ${hops[i]}`);
    }
    if (!c.S.aborted) c.emit('', 'Trace complete.');
  });

  /* ---------- accounts ---------- */
  def('net', (a, c) => {
    const sub = lc(a[0] || ''), arg = a[1];
    if (sub === 'user') {
      if (!arg) { c.emit('', `User accounts for \\\\${NET.host}`, '', '-'.repeat(79), pad('Administrator', 25) + pad('DefaultAccount', 25) + 'Guest', 'WDAGUtilityAccount', 'The command completed successfully.', ''); return; }
      if (a.some(x => /^\/(add|delete|active)/i.test(x))) { c.emit('System error 5 has occurred.', '', 'Access is denied.', ''); return; }
      const u = { administrator: ['Administrator', 'No', 'Built-in account for administering the computer/domain', '*Administrators'], guest: ['Guest', 'Yes', 'Account you are signed in with', '*Users'] }[lc(arg)];
      if (!u) { c.emit('The user name could not be found.', '', 'More help is available by typing NET HELPMSG 2221.', ''); return; }
      c.emit(`User name                    ${u[0]}`, 'Full name                    ', `Comment                      ${u[2]}`, 'Account active               ' + u[1], 'Account expires              Never', '', 'Password last set            9/1/2026 12:00:00 PM',
        'Password required            Yes', 'User may change password     Yes', '', 'Workstations allowed         All', 'Logon script                 ', 'User profile                 ', 'Home directory                ', 'Last logon                   ' + (u[1] === 'Yes' ? 'Today' : 'Never'), '',
        'Logon hours allowed          All', '', `Local Group Memberships      ${u[3]}`, 'Global Group memberships     *None', 'The command completed successfully.', '');
    } else if (sub === 'localgroup') {
      if (!arg) { c.emit('', `Aliases for \\\\${NET.host}`, '', '-'.repeat(79), '*Administrators', '*Guests', '*Remote Desktop Users', '*Users', 'The command completed successfully.', ''); return; }
      if (lc(arg) === 'administrators') c.emit('Alias name     Administrators', 'Comment        Administrators have complete and unrestricted access to the computer/domain', '', 'Members', '', '-'.repeat(79), 'Administrator', 'The command completed successfully.', '');
      else if (lc(arg) === 'users') c.emit('Alias name     Users', 'Comment        Users are prevented from making accidental or intentional system-wide changes', '', 'Members', '', '-'.repeat(79), 'Guest', 'NT AUTHORITY\\Authenticated Users', 'NT AUTHORITY\\INTERACTIVE', 'The command completed successfully.', '');
      else c.emit('The specified local group does not exist.', '', 'More help is available by typing NET HELPMSG 2220.', '');
    } else if (sub === 'start' && !arg) c.emit('These Windows services are started:', '', ...SYS.services().filter(s => s.running).map(s => '   ' + s.display), '', 'The command completed successfully.', '');
    else if (sub === 'start' || sub === 'stop') c.emit('System error 5 has occurred.', '', 'Access is denied.', '');
    else if (sub === 'share') c.emit('', 'Share name   Resource                        Remark', '', '-'.repeat(79), 'C$           C:\\                            Default share', 'IPC$                                       Remote IPC', 'ADMIN$       C:\\Windows                     Remote Admin', 'The command completed successfully.', '');
    else if (sub === 'use') c.emit('New connections will be remembered.', '', 'There are no entries in the list.', '');
    else if (sub === 'view') c.emit('System error 6118 has occurred.', '', 'The list of servers for this workgroup is not currently available', '');
    else c.emit('The syntax of this command is:', '', 'NET [ ACCOUNTS | LOCALGROUP | SHARE | START | STOP | USE | USER | VIEW ]');
  });
  def('runas', (a, c) => {
    const u = ((a.find(x => /^\/user:/i.test(x)) || '').slice(6)) || 'Administrator', rest = a.filter(x => !/^\/user:/i.test(x) && x[0] !== '/').join(' ') || 'cmd';
    c.emit(`Enter the password for ${u}:`, `Attempting to start ${rest} as user "${u}" ...`, `RUNAS ERROR: Unable to run - ${rest}`, '1326: The user name or password is incorrect.');
  });

  /* ---------- processes and services ---------- */
  def('tasklist', (a, c) => {
    const svc = a.some(x => lc(x) === '/svc'), fi = a.findIndex(x => lc(x) === '/fi'), m = fi >= 0 && String(a[fi + 1] || '').match(/imagename\s+eq\s+(.+)/i);
    let list = SYS.all();
    if (m) list = list.filter(p => lc(p.img) === lc(m[1].trim()));
    if (!list.length) { c.emit('INFO: No tasks are running which match the specified criteria.'); return; }
    if (svc) {
      c.emit('', pad('Image Name', 26) + rpad('PID', 8) + ' Services', '='.repeat(25) + ' ' + '='.repeat(8) + ' ' + '='.repeat(40));
      list.forEach(p => { const names = SYS.services().filter(s => s.running && s.pid === p.pid && p.pid).map(s => s.name).join(', ') || 'N/A'; c.emit(pad(p.img, 26) + rpad(p.pid, 8) + ' ' + names); });
    } else {
      c.emit('', pad('Image Name', 26) + rpad('PID', 8) + ' ' + pad('Session Name', 16) + rpad('Session#', 11) + rpad('Mem Usage', 13), '='.repeat(25) + ' ' + '='.repeat(8) + ' ' + '='.repeat(16) + ' ' + '='.repeat(11) + ' ' + '='.repeat(12));
      list.forEach(p => c.emit(pad(p.img, 26) + rpad(p.pid, 8) + ' ' + pad(p.ses, 16) + rpad(p.ses === 'Console' ? 1 : 0, 11) + rpad(commas(p.mem) + ' K', 13)));
    }
  });
  const kill = (name, pid, c) => {
    const p = SYS.all().find(x => (name && lc(x.img) === lc(name)) || (pid != null && x.pid === pid));
    if (!p) { c.emit(name ? `ERROR: The process "${name}" not found.` : `ERROR: The process "${pid}" not found.`); return false; }
    if (p.sys) { c.emit(`ERROR: The process "${p.img}" with PID ${p.pid} could not be terminated.`, 'Reason: Access is denied.'); return false; }
    windowManager.closeWindow(SYS.apps().find(x => x.pid === p.pid).key);
    c.emit(`SUCCESS: Sent termination signal to the process "${p.img}" with PID ${p.pid}.`);
    return true;
  };
  def('taskkill', (a, c) => {
    const im = a.findIndex(x => lc(x) === '/im'), pi = a.findIndex(x => lc(x) === '/pid');
    if (im < 0 && pi < 0) { c.emit('ERROR: Invalid syntax. Neither /FI, /PID nor /IM specified.', "Type \"TASKKILL /?\" for usage."); return; }
    kill(im >= 0 ? a[im + 1] : null, pi >= 0 ? +a[pi + 1] : null, c);
  });
  const svcBlock = s => [`SERVICE_NAME: ${s.name}`, `DISPLAY_NAME: ${s.display}`, '        TYPE               : 20  WIN32_SHARE_PROCESS', `        STATE              : ${s.running ? '4  RUNNING' : '1  STOPPED'}`,
    `                                (${s.running ? 'STOPPABLE, NOT_PAUSABLE, ACCEPTS_SHUTDOWN' : 'NOT_STOPPABLE, NOT_PAUSABLE, IGNORES_SHUTDOWN'})`, '        WIN32_EXIT_CODE    : 0  (0x0)', '        SERVICE_EXIT_CODE  : 0  (0x0)', '        CHECKPOINT         : 0x0', '        WAIT_HINT          : 0x0', ''];
  def('sc', (a, c) => {
    const sub = lc(a[0] || ''), svcs = SYS.services();
    if (sub === 'query' || sub === 'queryex') {
      const name = a.slice(1).find(x => !/^(state|type|bufsize|ri|group)=?$/i.test(x) && x !== 'all' && x[0] !== '=' && !/^(state|type)=/i.test(x));
      const all = a.some(x => lc(x) === 'all');
      if (name) { const s = svcs.find(x => lc(x.name) === lc(name)); if (!s) c.emit('[SC] EnumQueryServicesStatus:OpenService FAILED 1060:', '', 'The specified service does not exist as an installed service.', ''); else c.emit('', ...svcBlock(s)); return; }
      svcs.filter(s => all || s.running).forEach(s => c.emit(...svcBlock(s)));
    } else if (sub === 'qc') {
      const s = svcs.find(x => lc(x.name) === lc(a[1] || ''));
      if (!s) { c.emit('[SC] OpenService FAILED 1060:', '', 'The specified service does not exist as an installed service.', ''); return; }
      c.emit('[SC] QueryServiceConfig SUCCESS', '', `SERVICE_NAME: ${s.name}`, '        TYPE               : 20  WIN32_SHARE_PROCESS', `        START_TYPE         : ${s.start === 'AUTO_START' ? '2   AUTO_START' : s.start === 'DISABLED' ? '4   DISABLED' : '3   DEMAND_START'}`,
        '        ERROR_CONTROL      : 1   NORMAL', `        BINARY_PATH_NAME   : ${s.bin}`, '        LOAD_ORDER_GROUP   : ', '        TAG                : 0', `        DISPLAY_NAME       : ${s.display}`, '        DEPENDENCIES       : RPCSS', '        SERVICE_START_NAME : LocalSystem', '');
    } else if (['start', 'stop', 'config', 'delete', 'create', 'pause'].includes(sub)) c.emit('[SC] OpenService FAILED 5:', '', 'Access is denied.', '');
    else c.emit('DESCRIPTION:', '        SC is a command line program used for communicating with the', '        Service Control Manager and services.', 'USAGE:', '        sc <server> [command] [service name] <option1> <option2>...');
  });
  def('schtasks', (a, c) => c.emit('', 'Folder: \\', pad('TaskName', 44) + pad('Next Run Time', 24) + 'Status', '='.repeat(43) + ' ' + '='.repeat(23) + ' ' + '='.repeat(15),
    pad('SnackSync Nightly Sync', 44) + pad('3:00:00 AM', 24) + 'Ready', pad('OneDrive Standalone Update Task', 44) + pad('N/A', 24) + 'Ready', '', 'Folder: \\Microsoft\\Windows\\WindowsUpdate',
    pad('Scheduled Start', 44) + pad('N/A', 24) + 'Ready', '', 'Folder: \\Microsoft\\Windows\\Windows Defender', pad('Windows Defender Scheduled Scan', 44) + pad('N/A', 24) + 'Ready'));
  def('certutil', async (a, c) => {
    const i = a.findIndex(x => lc(x) === '-hashfile');
    if (i < 0) { c.emit('CertUtil: -dump command FAILED: 0x80070005 (WIN32/HTTP: 5 ERROR_ACCESS_DENIED)', 'CertUtil: Access is denied.'); return; }
    const f = readFile(a[i + 1] || '', c.S), alg = (a[i + 2] || 'SHA1').toUpperCase();
    if (f.err) { c.emit(`CertUtil: -hashfile command FAILED: 0x80070002 (WIN32/HTTP: 2 ERROR_FILE_NOT_FOUND)`, 'CertUtil: The system cannot find the file specified.'); return; }
    const hsh = await sha(alg, fileBytes(f));
    if (!hsh) { c.emit('CertUtil: -hashfile command FAILED: 0x80090008 (-2146893816 NTE_BAD_ALGID)', 'CertUtil: Invalid algorithm specified.'); return; }
    c.emit(`${alg} hash of ${f.path}:`, hsh, 'CertUtil: -hashfile command completed successfully.');
  });

  /* ---------- launch the built-in apps ---------- */
  const notepadWith = (arg, c) => {
    if (!arg) { window.openNotepad(); return; }
    const r = readFile(arg, c.S);
    if (r.err) { if (r.err.startsWith('Access')) c.emit('Access is denied.'); else window.openNotepad({ text: '', name: arg.split('\\').pop() }); return; }
    window.openNotepad({ text: r.text, name: r.path.split('\\').pop() });
  };
  def('notepad', (a, c) => notepadWith(a.filter(x => x[0] !== '/').join(' '), c));
  def('calc', () => window.launchApp('calc'));
  def('taskmgr', () => window.launchApp('taskmgr'));
  def('winmine minesweeper', () => window.launchApp('mines'));
  def('explorer', (a, c) => { const p = a.find(x => x[0] !== '/'); if (p && p !== '.') window.explorerGo(pathStr(resolvePath(p, c.S.cwd))); else if (p === '.') window.explorerGo(pathStr(c.S.cwd)); else window.launchApp('explorer'); });
  def('cmd', (a, c) => c.S.enter('cmd'));
  def('powershell pwsh', (a, c) => c.S.enter('ps'));
  def('start saps start-process', async (a, c) => {
    const rest = a.filter(x => x[0] !== '/' && x !== '""' && lc(x) !== '-filepath');
    if (!rest.length) { c.emit('Usage: start <program or document>'); return; }
    const t = rest[0];
    if (/^ms-settings:/i.test(t)) { window.launchApp('settings'); return; }
    if (/^https?:/i.test(t)) { window.showUAC('msedge.exe', 'app'); return; }
    if (t === '.') { window.explorerGo(pathStr(c.S.cwd)); return; }
    await runCmd(rest, c.emit, null, c.S);
  });
  def(UNBUILT, (a, c) => window.showUAC(c.name + '.exe', 'app'));

  /* ---------- PowerShell cmdlets ---------- */
  const modeOf = v => [v.type === 'dir' ? 'd' : '-', v.type === 'dir' ? '-' : 'a', '-', v.hidden ? 'h' : '-', v.protected ? 's' : '-', '-'].join('');
  const psFlags = a => ({ force: a.some(x => /^-(force|hidden)$/i.test(x)), rec: a.some(x => /^-(recurse|r)$/i.test(x)) });
  const VF = new Set(['-path', '-literalpath', '-name', '-pattern', '-algorithm', '-id', '-group', '-computername', '-filepath']);
  const positional = a => a.filter((x, i) => x[0] !== '-' && !VF.has(lc(a[i - 1] || '')));
  const psArg = (a, names) => { const i = a.findIndex(x => names.includes(lc(x))); return i >= 0 ? a[i + 1] : positional(a)[0]; };
  def('get-childitem ls dir gci', (a, c) => {
    const { force, rec } = psFlags(a), tgt = psArg(a, ['-path', '-literalpath']);
    let parts = tgt ? resolvePath(tgt, c.S.cwd) : c.S.cwd, pat = null;
    if (tgt && hasWild(parts[parts.length - 1])) pat = wild(parts.pop());
    const r = lookup(parts);
    if (!r) { c.emit(`Get-ChildItem : Cannot find path '${pathStr(resolvePath(tgt, c.S.cwd))}' because it does not exist.`); return; }
    if (r.blocked) { c.emit(`Get-ChildItem : Access to the path '${pathStr(r.parts)}' is denied.`); return; }
    const mode = force ? 'all' : 'normal';
    const show = ps => {
      const rr = lookup(ps);
      if (!rr || rr.blocked) return;
      const ents = Object.entries(rr.node.children || {}).filter(([k, v]) => visible(v, mode) && (!pat || pat.test(k))).sort(byName);
      if (ents.length) {
        c.emit('', '', `    Directory: ${pathStr(ps)}`, '', '', 'Mode                 LastWriteTime         Length Name', '----                 -------------         ------ ----');
        ents.forEach(([k, v]) => c.emit(`${pad(modeOf(v), 7)}${rpad('', 6)}${fmtPS(v.modified)} ${rpad(v.type === 'dir' ? '' : sizeOf(v), 12)} ${k}`));
      }
      if (rec) for (const [k, v] of Object.entries(rr.node.children || {}).sort(byName)) if (v.type === 'dir' && !v.protected && visible(v, mode)) show([...ps, k]);
    };
    show(r.node.type === 'dir' ? parts : parts.slice(0, -1));
  }, PSCMD);
  def('get-content cat gc type', (a, c) => {
    const fs = positional(a);
    if (!fs.length) { c.emit('Get-Content : Cannot bind argument to parameter \'Path\' because it is null.'); return; }
    fs.forEach(f => { const r = readFile(f, c.S); c.emit(r.err ? (r.err.startsWith('Access') ? `Get-Content : Access to the path '${pathStr(resolvePath(f, c.S.cwd))}' is denied.` : `Get-Content : Cannot find path '${pathStr(resolvePath(f, c.S.cwd))}' because it does not exist.`) : r.text); });
  }, PSCMD);
  def('set-location sl cd chdir', (a, c) => CMD.cd(a.filter(x => lc(x) !== '-path'), c), PSCMD);
  def('get-location pwd gl', (a, c) => c.emit('', 'Path', '----', pathStr(c.S.cwd), ''), PSCMD);
  def('clear-host', (a, c) => c.S.clear(), PSCMD);
  def('write-host write-output echo', (a, c) => c.emit(a.join(' ')), PSCMD);
  def('get-date', (a, c) => c.emit('', new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-US'), ''), PSCMD);
  def('get-process ps gps', (a, c) => {
    const name = psArg(a, ['-name']);
    const list = SYS.all().filter(p => p.pid && (!name || lc(p.img.replace(/\.exe$/, '')) === lc(name.replace(/\.exe$/, ''))));
    if (!list.length) { c.emit(`Get-Process : Cannot find a process with the name "${name}". Verify the process name and call the cmdlet again.`); return; }
    c.emit('', 'Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  SI ProcessName', '-------  ------    -----      -----     ------     --  -- -----------');
    list.forEach(p => c.emit(`${rpad(100 + SYS.h(p.img) % 900, 7)}  ${rpad(5 + SYS.h(p.img + 'n') % 30, 6)}  ${rpad(Math.round(p.mem * 0.6), 7)}  ${rpad(p.mem, 9)}  ${rpad((SYS.h(p.img + 'c') % 900 / 10).toFixed(2), 9)}  ${rpad(p.pid, 5)}  ${rpad(p.ses === 'Console' ? 1 : 0, 2)} ${p.img.replace(/\.exe$/, '')}`));
  }, PSCMD);
  def('stop-process kill', (a, c) => {
    const name = psArg(a, ['-name']), id = a.findIndex(x => lc(x) === '-id');
    const p = SYS.all().find(x => (name && lc(x.img.replace(/\.exe$/, '')) === lc(name)) || (id >= 0 && x.pid === +a[id + 1]));
    if (!p) { c.emit(`Stop-Process : Cannot find a process with the name "${name || a[id + 1]}". Verify the process name and call the cmdlet again.`); return; }
    if (p.sys) { c.emit(`Stop-Process : Cannot stop process "${p.img.replace(/\.exe$/, '')} (${p.pid})" because of the following error: Access is denied`); return; }
    windowManager.closeWindow(SYS.apps().find(x => x.pid === p.pid).key);
  }, PSCMD);
  def('get-service gsv', (a, c) => {
    const name = psArg(a, ['-name']);
    const list = SYS.services().filter(s => !name || lc(s.name) === lc(name) || (name.includes('*') && wild(name).test(s.name)));
    if (!list.length) { c.emit(`Get-Service : Cannot find any service with service name '${name}'.`); return; }
    c.emit('', 'Status   Name               DisplayName', '------   ----               -----------');
    list.forEach(s => c.emit(`${pad(s.running ? 'Running' : 'Stopped', 8)} ${pad(s.name, 18)} ${s.display}`));
  }, PSCMD);
  def('get-localuser', (a, c) => c.emit('', 'Name               Enabled Description', '----               ------- -----------', pad('Administrator', 18) + ' False   Built-in account for administering the computer/domain', pad('DefaultAccount', 18) + ' False   A user account managed by the system.',
    pad('Guest', 18) + ' True    Account you are signed in with', pad('WDAGUtilityAccount', 18) + ' False   A user account managed and used by the system for Windows Defender Application Guard scenarios.'), PSCMD);
  def('get-localgroupmember', (a, c) => {
    const g = lc(psArg(a, ['-group']) || '');
    if (g === 'administrators') c.emit('', 'ObjectClass Name                        PrincipalSource', '----------- ----                        ---------------', `User        ${pad(NET.host + '\\Administrator', 27)} Local`);
    else if (g === 'users') c.emit('', 'ObjectClass Name                              PrincipalSource', '----------- ----                              ---------------', `User        ${pad(NET.host + '\\Guest', 33)} Local`);
    else c.emit(`Get-LocalGroupMember : Group ${psArg(a, ['-group']) || ''} was not found.`);
  }, PSCMD);
  def('select-string sls', (a, c) => {
    const pi = a.findIndex(x => lc(x) === '-pattern'), pat = pi >= 0 ? a[pi + 1] : a.find(x => x[0] !== '-');
    if (!pat) { c.emit('Select-String : Cannot bind argument to parameter \'Pattern\' because it is null.'); return; }
    let re; try { re = new RegExp(pat, 'i'); } catch (e) { re = new RegExp(esc(pat), 'i'); }
    const fi = a.findIndex(x => lc(x) === '-path'), specs = fi >= 0 ? [a[fi + 1]] : positional(a).filter(x => x !== pat);
    grep(c, { test: l => re.test(l), specs, rec: a.some(x => /^-recurse$/i.test(x)), number: true, withNames: true });
  }, PSCMD);
  def('get-filehash', async (a, c) => {
    const ai = a.findIndex(x => lc(x) === '-algorithm'), alg = ai >= 0 ? a[ai + 1].toUpperCase() : 'SHA256';
    const file = psArg(ai >= 0 ? a.filter((x, i) => i !== ai && i !== ai + 1) : a, ['-path']);
    const f = readFile(file || '', c.S);
    if (f.err) { c.emit(`Get-FileHash : Cannot find path '${file}' because it does not exist.`); return; }
    const hsh = await sha(alg, fileBytes(f));
    if (!hsh) { c.emit('Get-FileHash : The algorithm is not supported.'); return; }
    c.emit('', 'Algorithm       Hash                                                                   Path', '---------       ----                                                                   ----', `${pad(alg, 15)} ${pad(hsh.toUpperCase(), 70)} ${f.path}`, '');
  }, PSCMD);
  def('test-connection', async (a, c) => {
    const host = psArg(a, ['-computername']);
    if (!host) { c.emit('Test-Connection : Cannot bind argument to parameter \'ComputerName\' because it is null.'); return; }
    if (!resolveHost(host)) { c.emit(`Test-Connection : Testing connection to computer '${host}' failed: No such host is known.`); return; }
    c.emit('', 'Source          Destination     IPV4Address      IPV6Address   Bytes    Time(ms)', '------          -----------     -----------      -----------   -----    --------');
    await pingReplies(c, host, 4, (ip, ms) => `${pad(NET.host, 15)} ${pad(host, 15)} ${pad(ip, 16)} ${pad('', 13)} 32       ${ms}`);
  }, PSCMD);
  def('resolve-dnsname', (a, c) => {
    const host = psArg(a, ['-name']), ip = host && resolveHost(host);
    if (!ip) { c.emit(`Resolve-DnsName : ${host || ''} : DNS name does not exist`); return; }
    c.emit('', 'Name                           Type   TTL   Section    IPAddress', '----                           ----   ---   -------    ---------', `${pad(host, 30)} A      300   Answer     ${ip}`);
  }, PSCMD);
  def('get-help man help get-command', (a, c) => c.emit(PSHELP), PSCMD);

  /* ---------- pipeline runner ---------- */
  const PS_ERR = (n) => [`${n} : The term '${n}' is not recognized as the name of a cmdlet, function, script file, or operable program. Check`, 'the spelling of the name, or if a path was included, verify that the path is correct and try again.', 'At line:1 char:1', `+ ${n}`, '+ ' + '~'.repeat(n.length), '    + CategoryInfo          : ObjectNotFound: (' + n + ':String) [], CommandNotFoundException', '    + FullyQualifiedErrorId : CommandNotFoundException', ''];
  async function runCmd(toks, emit, stdin, S) {
    if (!toks.length) return;
    let name = lc(toks[0]);
    const args = toks.slice(1), ps = S.isPS();
    if (/^[a-z]:$/.test(name)) { const r = lookup([name.toUpperCase()]); if (!r) emit('The system cannot find the drive specified.'); else S.cwd = [name.toUpperCase()]; return; }
    if (name.startsWith('echo.') && !ps) { emit(toks[0].slice(5) + (args.length ? ' ' + args.join(' ') : '')); return; }
    if (ps && name[0] === '$') {
      const m = toks[0].match(/^\$env:(\w+)$/i);
      if (m) emit(S.env[m[1].toUpperCase()] ?? '');
      else if (name === '$psversiontable') emit('', 'Name                           Value', '----                           -----', 'PSVersion                      5.1.26100.2033', 'PSEdition                      Desktop', 'BuildVersion                   10.0.26100.2033', 'CLRVersion                     4.0.30319.42000', 'WSManStackVersion              3.0', '');
      return;
    }
    name = name.split('\\').pop().replace(/\.exe$/, '');
    if (/\.msc$/.test(name)) { window.showUAC('mmc.exe', 'app'); return; }
    const fn = (ps && PSCMD[name]) || CMD[name];
    if (!fn) {
      if (ps) emit(...PS_ERR(toks[0]));
      else emit(`'${toks[0]}' is not recognized as an internal or external command,`, 'operable program or batch file.');
      return;
    }
    await fn(args, { S, emit, stdin, name });
  }

  /* ---------- the window ---------- */
  window.openTerminal = function(kind) {
    const key = kind === 'ps' ? 'ps' : 'cmd';
    if (windowManager.wins.has(key)) { windowManager.createWindow({ key }); return; }
    const node = document.createElement('div');
    node.className = 't-term'; node.tabIndex = 0;
    node.innerHTML = '<div class="t-out"></div><div class="t-line"><span class="t-prompt"></span><input class="t-in" spellcheck="false" autocomplete="off" autocapitalize="off"></div>';
    const win = windowManager.createWindow({ key, title: key === 'ps' ? 'Windows PowerShell' : 'Command Prompt', icon: key, node, width: 740, height: 420, left: 110, top: 60 });
    const out = node.querySelector('.t-out'), line = node.querySelector('.t-line'), inp = node.querySelector('.t-in'), prm = node.querySelector('.t-prompt');
    const titleEl = win.querySelector('.title');

    const S = {
      shells: [key], cwd: ['C:', 'Users', 'Guest'], env: { ...ENV }, hist: [], hi: 0, aborted: false, busy: false, base: titleEl.textContent,
      isPS() { return this.shells[this.shells.length - 1] === 'ps'; },
      clear() { out.textContent = ''; },
      setTitle(t) { titleEl.textContent = t || this.base; },
      setColor(x) {
        const v = (x || '').trim();
        if (!v) { node.style.removeProperty('--tbg'); node.style.removeProperty('--tfg'); return; }
        const bg = parseInt(v[0], 16), fg = v[1] ? parseInt(v[1], 16) : 7;
        if (isNaN(bg) || isNaN(fg)) return;
        if (bg === fg) { print('', 'Background and foreground colors are the same.'); return; }
        node.style.setProperty('--tbg', PALETTE[bg]); node.style.setProperty('--tfg', PALETTE[fg]);
      },
      enter(k) { this.shells.push(k); if (k === 'ps') print(...PS_BANNER); setPrompt(); },
      exit() { if (this.shells.length > 1) { this.shells.pop(); setPrompt(); } else windowManager.closeWindow(key); }
    };
    const CMD_BANNER = ['Microsoft Windows [Version 10.0.26100.2033]', '(c) Microsoft Corporation. All rights reserved.', ''];
    const PS_BANNER = ['Windows PowerShell', 'Copyright (C) Microsoft Corporation. All rights reserved.', '', 'Install the latest PowerShell for new features and improvements!', ''];
    const promptText = () => (S.isPS() ? 'PS ' : '') + pathStr(S.cwd) + (S.isPS() ? '> ' : '>');
    const setPrompt = () => { prm.textContent = promptText(); };
    function print(...ls) {
      for (const l of ls.join('\n').split('\n')) { const d = document.createElement('div'); d.textContent = l === '' ? '\u00a0' : l; out.appendChild(d); }
      node.scrollTop = node.scrollHeight;
    }

    async function run(raw) {
      let text = raw.trim();
      if (!text) return;
      S.busy = true; S.aborted = false; line.style.display = 'none';
      try {
        if (!S.isPS()) text = text.replace(/%([A-Za-z_]+)%/g, (m, v) => S.env[v.toUpperCase()] ?? m);
        if (hasRedirect(text)) { print('Access is denied.'); return; }
        let stdin = null;
        const stages = splitUnquoted(text, '|');
        for (let i = 0; i < stages.length; i++) {
          const last = i === stages.length - 1, buf = [];
          const emit = last ? print : (...l) => buf.push(...l.join('\n').split('\n'));
          await runCmd(tokenize(stages[i]), emit, stdin, S);
          stdin = buf;
        }
      } catch (e) { print('The command failed unexpectedly.'); }
      finally { S.busy = false; if (win.isConnected) { line.style.display = ''; setPrompt(); inp.focus(); node.scrollTop = node.scrollHeight; } }
    }
    const submit = async l => { print(promptText() + l); S.hist.push(l); S.hi = S.hist.length; await run(l); };

    // tab completion (command names for the first word, file names after that)
    let tabState = null;
    function complete() {
      const v = inp.value, sp = v.lastIndexOf(' '), head = v.slice(0, sp + 1), word = v.slice(sp + 1);
      if (!tabState || tabState.base !== v) {
        let cands;
        if (sp < 0) cands = [...new Set([...Object.keys(CMD), ...(S.isPS() ? Object.keys(PSCMD) : [])])].filter(n => lc(n).startsWith(lc(word))).sort();
        else {
          const bs = word.lastIndexOf('\\'), dirPart = word.slice(0, bs + 1), pre = word.slice(bs + 1);
          const r = lookup(dirPart ? resolvePath(dirPart, S.cwd) : S.cwd);
          cands = r && !r.blocked ? Object.entries(r.node.children || {}).filter(([k, x]) => !x.hidden && lc(k).startsWith(lc(pre))).sort(byName).map(([k]) => dirPart + (/\s/.test(k) ? '"' + k + '"' : k)) : [];
        }
        tabState = { base: v, cands, i: 0 };
      }
      if (!tabState.cands.length) return;
      const pick = tabState.cands[tabState.i++ % tabState.cands.length];
      inp.value = head + pick; tabState.base = inp.value;
    }

    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); const l = inp.value; inp.value = ''; tabState = null; submit(l); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (S.hi > 0) inp.value = S.hist[--S.hi]; }
      else if (e.key === 'ArrowDown') { e.preventDefault(); inp.value = S.hi < S.hist.length - 1 ? S.hist[++S.hi] : (S.hi = S.hist.length, ''); }
      else if (e.key === 'Tab') { e.preventDefault(); complete(); }
      else if (e.key === 'Escape') { inp.value = ''; e.stopPropagation(); }
      else if (e.ctrlKey && lc(e.key) === 'l') { e.preventDefault(); S.clear(); }
      else if (e.ctrlKey && lc(e.key) === 'c') { e.preventDefault(); print(promptText() + inp.value + '^C'); inp.value = ''; }
    });
    node.addEventListener('keydown', e => { if (S.busy && e.ctrlKey && lc(e.key) === 'c') { S.aborted = true; print('^C'); } });
    node.addEventListener('pointerdown', () => { if (!getSelection().toString()) setTimeout(() => (S.busy ? node : inp).focus(), 0); });

    win.__run = submit;            // used by tests
    win.__text = () => out.textContent;
    print(...(key === 'ps' ? PS_BANNER : CMD_BANNER));
    setPrompt();
    inp.focus();
  };
})();
