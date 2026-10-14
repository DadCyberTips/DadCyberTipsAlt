/**
 * Document Handler
 * Manages the secret text file and access logic
 */

// Default secret message (edit this!)
const DEFAULT_SECRET_MESSAGE = `Welcome to the Web Desktop Simulator!

You've successfully completed the system updates.

This is a demonstration project showing how to create
interactive UI simulations in the browser using vanilla
JavaScript, CSS, and HTML.

Feel free to customize this message and the overall
experience to match your needs!

Created for educational purposes.
Not affiliated with Microsoft Corporation.

---
Version: 1.0.0
Date: October 2026
`;

// Load or initialize document content
let documentContent = localStorage.getItem('documentContent');
if (!documentContent) {
  documentContent = DEFAULT_SECRET_MESSAGE;
  localStorage.setItem('documentContent', documentContent);
}

function openDocument() {
  const updatesComplete = localStorage.getItem('updatesComplete');
  
  if (updatesComplete !== 'true') {
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
  windowManager.createWindow({
    key: 'blocked',
    title: 'Access Blocked',
    content: `
      <div class="dialog">
        <h2 style="color: #c42b1c;">⚠️ Action Required</h2>
        <p>You cannot open this document at the moment.</p>
        <p>System updates must be installed before accessing files.</p>
        <button class="btn" onclick="startUpdateSimulation()">Run Updates Now</button>
      </div>`,
    width: 450,
    height: 320,
    top: 160,
    left: 300
  });
}

// Export globally
window.openDocument = openDocument;
window.documentContent = documentContent;