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
 * The shopping list in Documents is a decoy puzzle with NO hints in the file itself.
 * Every line item is a hacker snack followed by {ctf}(...) holding the same words from
 * DECOY_FLAG (the text inside the brackets), each encoded a different way. It is NOT the
 * real flag. Change DECOY_FLAG and every line updates itself (use capital letters).
 *
 * Answer key (top to bottom):
 *   1 Base64   2 ROT13   3 Hex   4 Binary   5 Morse   6 Vigenere (key = first letters of the
 *   snack names = SNACKATTACK)   7 Reversed   8 Base32   9 Decimal ASCII   10 Atbash   11 ROT47
 */
const DECOY_FLAG = '{CTF}[I-L0VE-SN4CKS]';
function shoppingList(flag = DECOY_FLAG) {
  const names = ['Sudo Sandwich Bites', 'Netcat Nachos', 'Assembly Almonds', 'Cache Cookies', 'Keylogger Kettle Corn', 'Admin Applesauce',
    'Trojan Taco Shells', 'Tor Tater Tots', 'Adware Apple Chips', 'Cipher Cola', 'Kernel Krunch Cereal'];
  const KEY = names.map(n => n[0]).join('').toUpperCase();   // SNACKATTACK
  const w = flag.slice(flag.indexOf('[') + 1, flag.lastIndexOf(']'));   // the words to hide
  const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
    N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.', '-': '-....-' };
  const codes = [...w].map(c => c.charCodeAt(0));
  const bits = codes.map(c => c.toString(2).padStart(8, '0'));
  const b32 = (() => {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', b = bits.join('');
    let o = '';
    for (let i = 0; i < b.length; i += 5) o += A[parseInt(b.slice(i, i + 5).padEnd(5, '0'), 2)];
    while (o.length % 8) o += '=';
    return o;
  })();
  let k = 0;
  const enc = [
    btoa(w),                                                                                                  // 1 Base64
    w.replace(/[a-zA-Z]/g, c => String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26)), // 2 ROT13
    codes.map(c => c.toString(16)).join(''),                                                                  // 3 Hex
    bits.join(' '),                                                                                           // 4 Binary
    [...w].map(c => MORSE[c] || '').join(' '),                                                                // 5 Morse
    [...w].map(c => /[A-Z]/.test(c) ? String.fromCharCode((c.charCodeAt(0) - 65 + KEY.charCodeAt(k++ % KEY.length) - 65) % 26 + 65) : c).join(''), // 6 Vigenere
    [...w].reverse().join(''),                                                                                // 7 Reversed
    b32,                                                                                                      // 8 Base32
    codes.join(' '),                                                                                          // 9 Decimal ASCII
    w.replace(/[A-Z]/g, c => String.fromCharCode(155 - c.charCodeAt(0))),                                     // 10 Atbash
    w.replace(/[!-~]/g, c => String.fromCharCode(33 + (c.charCodeAt(0) - 33 + 47) % 94))                      // 11 ROT47
  ];
  return [
    'SNACK RUN - SnackSpaceCon Supermart, Aisle 13',
    '',
    ...names.map((n, i) => `[ ] ${n.padEnd(24)} {ctf}(${enc[i]})`),
    '',
    'Total: $13.37'
  ].join('\n') + '\n';
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
          'todo.txt': { type: 'file', modified: '2026-10-02 07:55', content: '- update the PC (it keeps nagging me)\n- call mom\n- back up photos\n' }
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
