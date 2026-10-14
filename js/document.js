/**
 * Document Handler
 * Manages the secret text file and access logic
 */

// The contents of Flag.txt
const documentContent = 'You found the FLAG: {CTF}[I-L0VE-W1NDERS]';

// Drop any text cached in the browser by earlier versions
localStorage.removeItem('documentContent');

function openDocument() {
  const updatesComplete = window.docUnlocked;
  
  if (updatesComplete !== true) {
    // Block access with message
    showBlockedMessage();
    return;
  }
  
  // Open the document in a window
  if (typeof windowManager !== 'undefined') {
    windowManager.openDocumentWindow(documentContent);
  }
}

function showBlockedMessage() {
  if (typeof windowManager === 'undefined') return;
  const busy = window.updateInProgress;
  windowManager.createWindow({
    key: 'blocked',
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
window.documentContent = documentContent;