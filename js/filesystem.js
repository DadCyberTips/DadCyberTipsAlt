/**
 * Fake file system for File Explorer. Edit this file to add your own files.
 *
 *   Folder: { type: 'dir',  hidden: true?, label: 'Drive name'?, children: { 'Name': <node>, ... } }
 *   File:   { type: 'file', hidden: true?, content: 'text shown in Notepad', modified: '2026-09-01 14:22'? }
 *
 * - hidden items only show after View > Hidden items is ticked (they can still
 *   be reached by typing their full path in the address bar).
 * - Files with no `content` say they can't be previewed.
 * - Flag.txt on the Desktop uses open: 'doc', so it respects the update/lock logic.
 * - Replace the {CTF}[REPLACE-ME-n] placeholders below with your own keys.
 */
window.FS = {
  'C:': { type: 'dir', label: 'Local Disk', children: {
    'Users': { type: 'dir', children: {
      'Guest': { type: 'dir', children: {
        'Desktop': { type: 'dir', children: {
          'Flag.txt': { type: 'file', open: 'doc', modified: '2026-10-10 09:12' }
        }},
        'Documents': { type: 'dir', children: {
          'shopping_list.txt': { type: 'file', modified: '2026-09-28 18:40', content: 'eggs\nmilk\ncoffee\nsnacks (lots of snacks)\n' },
          'todo.txt': { type: 'file', modified: '2026-10-02 07:55', content: '- update the PC (it keeps nagging me)\n- call mom\n- back up photos\n' }
        }},
        'Downloads': { type: 'dir', children: {
          'setup.exe': { type: 'file', modified: '2026-09-15 11:03' }
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
