/**
 * Fake file system for File Explorer. Edit this file to add your own files.
 *
 *   Folder: { type: 'dir',  hidden: true?, label: 'Drive name'?, children: { 'Name': <node>, ... } }
 *   File:   { type: 'file', hidden: true?, content: 'text shown in Notepad', modified: '2026-09-01 14:22'? }
 *
 * - hidden items only show after View > Hidden items is ticked (they can still
 *   be reached by typing their full path in the address bar).
 * - Files with no `content` say they can't be previewed.
 * - scare: true on a file runs the jump scare when it is opened (see scare.js).
 * - Flag.txt on the Desktop uses open: 'doc', so it respects the update/lock logic.
 * - Replace the {CTF}[REPLACE-ME-n] placeholders below with your own keys.
 */
/**
 * The shopping list in Documents is a short decoy puzzle with NO hints in the file itself:
 * six hacker snacks, each followed by {ctf}(...) holding the words from DECOY_FLAG (the text
 * inside the brackets) encoded a different way. It is NOT the real flag. Change DECOY_FLAG
 * and every line updates itself (use capital letters).
 *
 * Answer key (top to bottom): 1 Base64, 2 ROT13, 3 Hex, 4 Binary, 5 Morse, 6 Reversed
 */
const DECOY_FLAG = '{CTF}[I-L0VE-SN4CKS]';
function shoppingList(flag = DECOY_FLAG) {
  const names = ['Sudo Sandwich Bites', 'Netcat Nachos', 'Assembly Almonds', 'Cache Cookies', 'Keylogger Kettle Corn', 'Trojan Taco Shells'];
  const w = flag.slice(flag.indexOf('[') + 1, flag.lastIndexOf(']'));   // the words to hide
  const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
    N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.', '-': '-....-' };
  const codes = [...w].map(c => c.charCodeAt(0));
  const enc = [
    btoa(w),                                                                                                            // 1 Base64
    w.replace(/[a-zA-Z]/g, c => String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26)), // 2 ROT13
    codes.map(c => c.toString(16)).join(''),                                                                            // 3 Hex
    codes.map(c => c.toString(2).padStart(8, '0')).join(' '),                                                           // 4 Binary
    [...w].map(c => MORSE[c] || '').join(' '),                                                                          // 5 Morse
    [...w].reverse().join('')                                                                                           // 6 Reversed
  ];
  return ['SNACK RUN', '', ...names.map((n, i) => `[ ] ${n.padEnd(24)} {ctf}(${enc[i]})`)].join('\n') + '\n';
}

/**
 * todo.txt hides a message as an acrostic: the FIRST CHARACTER of each item, read top to
 * bottom (blank lines separate the words), spells  5N4CK 4774CK H4CK 7H3 PL4N37 1337.
 * Items keep their meaning, but each is worded to start with the right character.
 */
function todoList() {
  const words = [
    [['5 minutes with the firewall off ("just for five minutes")'], ['Never reuse the same password on everything'],
     ['4 weeks of photos to back up to the external drive'], ['Call mom back', 1], ['Keyboard needs charging before the con', 1]],
    [['4 PM: pick up the dry cleaning'], ['7 AM: figure out why the PC freezes sometimes'], ['7 plants to water (again)'],
     ["4 years of junk: clear out Temp, it's getting huge"], ['Change password from password123 (finally)'],
     ["Kinda curious what's in the old backup drive"]],
    [["Hunt down the thing I saved in a folder I can't see"], ['4 days left to install that Windows update before it nags again'],
     ['Clean out AppData (hidden folder, ugh)'], ["Keep feeding the rooster (he's been staring at the monitor)"]],
    [['7 PM: ask Dave why the printer says "Not Responding"'], ['Have a look at the hosts file, something looked odd'],
     ['3 AM logins: figure out who keeps logging in at that hour']],
    [["Please don't open setup.exe from Downloads again"], ['Library book is 2 weeks overdue, return it'],
     ['4 weeks until the car registration expires, renew it'], ['Nag Dad to stop clicking on ads'],
     ['3 virus scans skipped: update antivirus (it expired in 2019)'], ['7 nights running: unplug the router before bed']],
    [['1 more night of whispering from the speakers, ignore it'], ['3 times now: why is the webcam light on?'],
     ['3 messages from the SnackSpaceCon Syndicate: do NOT reply'], ['7 minutes to delete .hidden_note.txt before anyone finds it']]
  ];
  return 'TO DO\n\n' + words.map(g => g.map(([t, done]) => `[${done ? 'x' : ' '}] ${t}`).join('\n')).join('\n\n') + '\n';
}

/**
 * The big fake Windows tree. Builders keep it short:
 *   D(children, opts)        a folder          F(opts)               a file
 *   files('a.dll b.exe')     many files        dirs('One|Two words') many empty folders
 * Options: hidden (only with View > Hidden items), protected (opening it shows the
 * "you don't have permission" pop-up), label (drive name), content (text), open, kb, modified.
 * Add your own files anywhere below; the placeholder keys are {CTF}[REPLACE-ME-n].
 */
window.FS = (() => {
  const _h = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const _date = n => `2026-0${1 + _h(n) % 9}-${String(1 + _h(n + 'd') % 28).padStart(2, '0')} ${String(8 + _h(n + 't') % 12).padStart(2, '0')}:${String(_h(n + 'm') % 60).padStart(2, '0')}`;
  const D = (children = {}, o = {}) => ({ type: 'dir', children, ...o });
  const F = (o = {}) => ({ type: 'file', ...o });
  const files = (names, o = {}) => Object.fromEntries(names.split(' ').map(n => [n, F({ kb: 4 + _h(n) % 2400, modified: _date(n), ...o })]));
  const dirs = (names, o = {}) => Object.fromEntries(names.split('|').map(n => [n, D({}, { modified: _date(n), ...o })]));
  const LOCKED = { protected: true };
  const HIDDEN_LOCKED = { hidden: true, protected: true };

  const SYS32 = files('advapi32.dll bcrypt.dll calc.exe cmd.exe combase.dll comctl32.dll comdlg32.dll cscript.exe d3d11.dll dwm.exe dxgi.dll gdi32.dll imm32.dll kernel32.dll kernelbase.dll lsass.exe msvcrt.dll net.exe netsh.exe notepad.exe ntdll.dll ntoskrnl.exe ole32.dll powershell.exe reg.exe rpcrt4.dll services.exe shell32.dll shutdown.exe smss.exe svchost.exe taskkill.exe tasklist.exe taskmgr.exe user32.dll wininit.exe winlogon.exe wuauclt.exe wuaueng.dll ws2_32.dll xcopy.exe');
  SYS32['notepad.exe'].open = 'notepad'; SYS32['taskmgr.exe'].open = 'taskmgr'; SYS32['calc.exe'].open = 'calc';
  Object.assign(SYS32, dirs('en-US|spool|wbem|Tasks|LogFiles|winevt|WindowsPowerShell|catroot'), {
    config: D({}, { ...LOCKED, modified: _date('config') }),
    catroot2: D({}, LOCKED),
    DriverStore: D({}, LOCKED),
    drivers: D({
      etc: D({ hosts: F({ kb: 1, modified: '2026-08-12 10:00', content: '127.0.0.1   localhost\n# {CTF}[REPLACE-ME-2]\n' }), ...files('lmhosts.sam networks protocol services') }),
      ...files('disk.sys ndis.sys tcpip.sys volmgr.sys')
    })
  });

  const WINDOWS = D({
    ...dirs('addins|appcompat|apppatch|assembly|Boot|Branding|Cursors|debug|diagnostics|DigitalLocker|en-US|Globalization|Help|IME|INF|InputMethod|L2Schemas|Logs|Media|Microsoft.NET|Offline Web Pages|Panther|Performance|PLA|PolicyDefinitions|Prefetch|PrintDialog|Provisioning|Registration|Resources|schemas|security|ServiceProfiles|servicing|Setup|ShellComponents|ShellExperiences|SKB|Speech|System|SystemApps|SystemResources|SysWOW64|TAPI|Tasks|tracing|Vss|WaaS|Web|WinSxS'),
    CSC: D({}, LOCKED),
    Fonts: D(files('arial.ttf calibri.ttf consola.ttf segoeui.ttf tahoma.ttf times.ttf verdana.ttf')),
    Temp: D(files('MpCmdRun.log wct4A21.tmp')),
    System32: D(SYS32),
    ...files('bfsvc.exe explorer.exe HelpPane.exe hh.exe regedit.exe splwow64.exe system.ini win.ini WindowsUpdate.log write.exe')
  });
  WINDOWS.children['explorer.exe'].open = 'explorer';

  const GUEST = D({
    Desktop: D({ 'Flag.txt': F({ open: 'doc', kb: 1, modified: '2026-10-10 09:12' }) }),
    Documents: D({
      'shopping_list.txt': F({ kb: 1, modified: '2026-09-28 18:40', content: shoppingList() }),
      'todo.txt': F({ kb: 1, modified: '2026-10-02 07:55', content: todoList() })
    }),
    Downloads: D({ 'setup.exe': F({ scare: true, kb: 48210, modified: '2026-09-15 11:03' }) }),
    ...dirs('Pictures|Music|Videos|Contacts|Favorites|Links|Searches|3D Objects|OneDrive|Saved Games'),
    AppData: D({
      Local: D({
        Temp: D({ '~cache_0042.tmp': F({ kb: 1, modified: '2026-10-01 03:14', content: 'session=0x4F2A\nKEY: {CTF}[REPLACE-ME-1]\n' }) }),
        ...dirs('Microsoft|Packages|Programs|ConnectedDevices|D3DSCache')
      }),
      LocalLow: D(),
      Roaming: D(dirs('Microsoft'))
    }, { hidden: true }),
    'ntuser.ini': F({ kb: 1, hidden: true, modified: '2026-09-01 12:00' }),
    'NTUSER.DAT': F({ kb: 1536, ...HIDDEN_LOCKED })
  });

  const C = D({
    Users: D({
      Guest: GUEST,
      Public: D(dirs('Desktop|Documents|Downloads|Music|Pictures|Videos')),
      Administrator: D({}, LOCKED),
      Default: D(dirs('AppData|Desktop|Documents|Downloads|Music|Pictures|Videos'), { hidden: true })
    }),
    Windows: WINDOWS,
    'Program Files': D({
      ...dirs('Common Files|Internet Explorer|Microsoft Update Health Tools|Uninstall Information|Windows Defender|Windows Mail|Windows Media Player|Windows NT|Windows Photo Viewer|WindowsPowerShell'),
      WindowsApps: D({}, HIDDEN_LOCKED)
    }),
    'Program Files (x86)': D(dirs('Common Files|Internet Explorer|Microsoft|Windows Defender|Windows Mail|Windows Media Player|Windows NT|WindowsPowerShell')),
    ProgramData: D({
      SnackSync: D({ 'config.ini': F({ kb: 1, modified: '2026-09-20 16:30', content: '[sync]\nserver=snack.local\napikey={CTF}[REPLACE-ME-3]\n' }) }),
      Microsoft: D({ ...dirs('Windows|Windows Defender|Network|User Account Pictures'), Crypto: D({}, LOCKED) }),
      'Package Cache': D()
    }, { hidden: true }),
    PerfLogs: D(),
    Temp: D({ '.hidden_note.txt': F({ hidden: true, kb: 1, modified: '2026-10-05 23:59', content: '{CTF}[REPLACE-ME-4]\n' }) }),
    '$Recycle.Bin': D({}, HIDDEN_LOCKED),
    'System Volume Information': D({}, HIDDEN_LOCKED),
    Recovery: D({}, HIDDEN_LOCKED),
    'Documents and Settings': D({}, HIDDEN_LOCKED),
    'pagefile.sys': F({ kb: 4194304, ...HIDDEN_LOCKED }),
    'hiberfil.sys': F({ kb: 6553600, ...HIDDEN_LOCKED }),
    'swapfile.sys': F({ kb: 16384, ...HIDDEN_LOCKED }),
    'DumpStack.log.tmp': F({ kb: 8, ...HIDDEN_LOCKED })
  }, { label: 'Local Disk' });

  const E = D({
    Old: D({ 'notes_2025.txt': F({ kb: 1, modified: '2025-12-31 22:10', content: 'nothing to see here...\n{CTF}[REPLACE-ME-5]\n' }) }),
    'System Volume Information': D({}, HIDDEN_LOCKED)
  }, { label: 'Backup' });

  return { 'C:': C, 'D:': E };
})();
