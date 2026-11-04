/**
 * Document Handler
 * Manages the secret text file and access logic
 */

// The contents of Flag.txt
const documentContent = 'You found the FLAG: {CTF}[I-L0VE-W1NDERS]';

// Drop any text cached in the browser by earlier versions (storage can be blocked)
try { localStorage.removeItem('documentContent'); } catch (e) {}
const markFound = () => { window.flagOpened = true; try { localStorage.setItem('flagFound', '1'); } catch (e) {} };

// Command-line reads of Flag.txt follow the same rules as opening it from the desktop
window.readFlagForTerminal = function() {
  if (window.docUnlocked !== true || window.docLocked) return null;
  markFound();
  return documentContent;
};

function openDocument() {
  if (window.docLocked) { showLockedMessage(); return; }
  const updatesComplete = window.docUnlocked;
  
  if (updatesComplete !== true) {
    // Block access with message
    showBlockedMessage();
    return;
  }
  
  // Open the document in a window
  if (typeof windowManager !== 'undefined') {
    markFound();
    windowManager.openDocumentWindow(documentContent);
  }
}

// Lock Flag.txt for the rest of this visit (the ransom note and the phishing page both use this)
window.lockFlag = function(reason) {
  window.docLocked = true; window.docUnlocked = false; window.lockReason = reason;
  const ic = document.getElementById('doc-icon');
  ic.querySelector('use').setAttribute('href', '#i-lock');
  ic.querySelector('span').textContent = 'Flag.txt.locked';
  if (typeof windowManager !== 'undefined') ['doc', 'blocked'].forEach(k => windowManager.closeWindow(k));
};

function showLockedMessage() {
  if (typeof windowManager === 'undefined') return;
  windowManager.createWindow({
    key: 'locked',
    front: true,
    title: 'Flag.txt.locked',
    icon: 'doc',
    content: `
      <div class="dialog">
        <h2 style="color: #c42b1c;">🔒 This file is encrypted</h2>
        <p>Windows can't open Flag.txt.</p>
        <p>${window.lockReason === 'phish' ? 'Someone signed in to your account after you entered your details on a fake page. Reload the page to start over.' : 'The file has been locked. Read the message on your desktop.'}</p>
      </div>`,
    width: 450,
    height: 280,
    top: 200,
    left: 100
  });
}

function showBlockedMessage() {
  if (typeof windowManager === 'undefined') return;
  const busy = window.updateInProgress;
  windowManager.createWindow({
    key: 'blocked',
    front: true,
    title: 'Access Blocked',
    content: `
      <div class="dialog">
        <h2 style="color: #c42b1c;">⚠️ ${busy ? 'Updates in progress' : 'System update required'}</h2>
        <p>You cannot open this file at the moment.</p>
        <p>${busy ? 'Windows is still installing updates. Please wait.' : 'You need to run system updates to open this file.'}</p>
      </div>`,
    width: 450,
    height: 280,
    top: 200,
    left: 100
  });
}

// Export globally
window.openDocument = openDocument;