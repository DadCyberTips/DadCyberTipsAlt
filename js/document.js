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
  const win = typeof windowManager !== 'undefined' 
    ? windowManager.createWindow({
        title: 'Access Blocked',
        content: `
          <div style="padding: 40px; text-align: center;">
            <h2 style="color: #e81123; margin-bottom: 20px;">⚠️ Action Required</h2>
            <p style="margin-bottom: 30px;">
              You cannot open this document at the moment.
            </p>
            <p style="color: #666; margin-bottom: 20px;">
              System updates must be installed before accessing files.
            </p>
            <button 
              onclick="startUpdateSimulation()"
              style="background: #6d4aff; color: #fff; border: none; padding: 12px 30px; border-radius: 5px; cursor: pointer;"
            >
              Run Updates Now
            </button>
          </div>
        `,
        width: 450,
        height: 350,
        top: 200,
        left: 300
      })
    : null;
}

// Export globally
window.openDocument = openDocument;
window.documentContent = documentContent;