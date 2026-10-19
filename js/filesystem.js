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

window.FS = {
  'C:': { type: 'dir', label: 'Local Disk', children: {
    'Users': { type: 'dir', children: {
      'Guest': { type: 'dir', children: {
        'Desktop': { type: 'dir', children: {
          'Flag.txt': { type: 'file', open: 'doc', modified: '2026-10-10 09:12' }
        }},
        'Documents': { type: 'dir', children: {
          'shopping_list.txt': { type: 'file', modified: '2026-09-28 18:40', content: shoppingList() },
          'todo.txt': { type: 'file', modified: '2026-10-02 07:55', content: todoList() }
        }},
        'Downloads': { type: 'dir', children: {
          'setup.exe': { type: 'file', scare: true, modified: '2026-09-15 11:03' }
        }},
        'Pictures': { type: 'dir', children: {} },
        'Music': { type: 'dir', children: {} },
        'Videos': { type: 'dir', children: {} },
        'AppData': { type: 'dir', hidden: true, children: {
          'Local': { type: 'dir', children: {
            'Temp': { type: 'dir', children: {
              '~cache_0042.tmp': { type: 'file', modified: '2026-10-01 03:14', content: 'session=0x4F2A\nKEY: {CTF}[REPLACE-ME-1]\n' }
            }}
          }},
          'Roaming': { type: 'dir', children: {} }
        }}
      }},
      'Public': { type: 'dir', children: {} }
    }},
    'Windows': { type: 'dir', children: {
      'System32': { type: 'dir', children: {
        'drivers': { type: 'dir', children: {
          'etc': { type: 'dir', children: {
            'hosts': { type: 'file', modified: '2026-08-12 10:00', content: '127.0.0.1   localhost\n# {CTF}[REPLACE-ME-2]\n' }
          }}
        }}
      }}
    }},
    'Program Files': { type: 'dir', children: {} },
    'ProgramData': { type: 'dir', hidden: true, children: {
      'SnackSync': { type: 'dir', children: {
        'config.ini': { type: 'file', modified: '2026-09-20 16:30', content: '[sync]\nserver=snack.local\napikey={CTF}[REPLACE-ME-3]\n' }
      }}
    }},
    'Temp': { type: 'dir', children: {
      '.hidden_note.txt': { type: 'file', hidden: true, modified: '2026-10-05 23:59', content: '{CTF}[REPLACE-ME-4]\n' }
    }}
  }},
  'D:': { type: 'dir', label: 'Backup', children: {
    'Old': { type: 'dir', children: {
      'notes_2025.txt': { type: 'file', modified: '2025-12-31 22:10', content: 'nothing to see here...\n{CTF}[REPLACE-ME-5]\n' }
    }}
  }}
};
