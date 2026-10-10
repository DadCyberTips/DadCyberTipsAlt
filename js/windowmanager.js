/**
 * Window Management System
 * Creates, drags, and manages desktop windows
 */

class WindowManager {
  constructor() {
    this.windows = [];
    this.zIndexCounter = 100;
    this.init();
  }
  
  init() {
    window.addEventListener('desktopReady', () => {
      this.bindGlobalEvents();
    });
  }
  
  bindGlobalEvents() {
    // Right-click context menu
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }
  
  createWindow(options) {
    const id = `window-${Date.now()}`;
    const win = document.createElement('div');
    
    win.className = 'window';
    win.id = id;
    win.innerHTML = `
      <div class="title-bar">
        <span class="title">${options.title || 'Window'}</span>
        <div class="controls">
          <button class="minimize" title="Minimize">─</button>
          <button class="maximize" title="Maximize">□</button>
          <button class="close" title="Close">×</button>
        </div>
      </div>
      <div class="content">${options.content || ''}</div>
    `;
    
    // Position and size
    const top = options.top || Math.random() * 100 + 50;
    const left = options.left || Math.random() * 100 + 50;
    win.style.cssText = `
      position: fixed;
      top: ${top}px;
      left: ${left}px;
      width: ${options.width || 600}px;
      height: ${options.height || 400}px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      z-index: ${++this.zIndexCounter};
      display: flex;
      flex-direction: column;
    `;
    
    // Title bar dragging
    const titleBar = win.querySelector('.title-bar');
    this.makeDraggable(win, titleBar);
    
    // Focus on click
    win.addEventListener('mousedown', () => {
      win.style.zIndex = ++this.zIndexCounter;
    });
    
    // Button handlers
    win.querySelector('.close').addEventListener('click', () => {
      this.closeWindow(id);
    });
    
    win.querySelector('.minimize').addEventListener('click', () => {
      win.style.display = 'none';
      this.addToTaskbar(id, options.title);
    });
    
    win.querySelector('.maximize').addEventListener('click', () => {
      this.toggleMaximize(win);
    });
    
    // Add to DOM and registry
    document.body.appendChild(win);
    this.windows.push({ id, element: win, minimized: false });
    
    // Add to taskbar
    this.addToTaskbar(id, options.title);
    
    return win;
  }
  
  makeDraggable(element, handle) {
    let isDragging = false;
    let startX, startY, initialX, initialY;
    
    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialX = element.offsetLeft;
      initialY = element.offsetTop;
      
      // Prevent text selection
      handle.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      let newLeft = initialX + dx;
      let newTop = initialY + dy;
      
      // Boundary checks
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - element.offsetWidth));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - element.offsetHeight));
      
      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
      handle.style.cursor = 'default';
    });
  }
  
  addToTaskbar(windowId, title) {
    const taskbarApps = document.getElementById('taskbar-apps');
    if (!taskbarApps) return;
    
    const appBtn = document.createElement('button');
    appBtn.className = 'taskbar-app';
    appBtn.textContent = title.substring(0, 15);
    appBtn.style.cssText = `
      padding: 6px 12px;
      background: rgba(255,255,255,0.1);
      border: none;
      border-radius: 4px;
      color: #fff;
      cursor: pointer;
      font-size: 12px;
    `;
    
    appBtn.addEventListener('click', () => {
      const win = document.getElementById(windowId);
      if (win) {
        win.style.display = 'flex';
        win.style.zIndex = ++this.zIndexCounter;
      }
    });
    
    taskbarApps.appendChild(appBtn);
  }
  
  toggleMaximize(win) {
    if (win.dataset.maximized === 'true') {
      win.style.cssText = `
        position: fixed;
        top: 50px;
        left: 50px;
        width: 600px;
        height: 400px;
      `;
      delete win.dataset.maximized;
    } else {
      win.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: calc(100vh - 48px);
      `;
      win.dataset.maximized = 'true';
    }
  }
  
  closeWindow(windowId) {
    const win = document.getElementById(windowId);
    if (win) {
      win.style.opacity = '0';
      win.style.transform = 'scale(0.9)';
      setTimeout(() => {
        win.remove();
        this.windows = this.windows.filter(w => w.id !== windowId);
        this.removeFromTaskbar(windowId);
      }, 200);
    }
  }
  
  removeFromTaskbar(windowId) {
    const taskbarApps = document.getElementById('taskbar-apps');
    if (!taskbarApps) return;
    
    const buttons = taskbarApps.querySelectorAll('button');
    buttons.forEach(btn => {
      // Simple heuristic - remove matching buttons
      if (btn._windowId === windowId) {
        btn.remove();
      }
    });
  }
  
  // Convenience method for document window
  openDocumentWindow(content) {
    return this.createWindow({
      title: 'Documents.txt',
      content: `<div class="doc-content">${content}</div>`,
      width: 700,
      height: 500,
      top: 100,
      left: 150
    });
  }
  
  openSettingsWindow() {
    const content = `
      <div class="settings-content">
        <div class="settings-item">
          <h4>💾 Storage</h4>
          <p>Local storage usage: ${Math.round((localStorage.length / 10) * 100)} KB used</p>
        </div>
        <div class="settings-item">
          <h4>🖼️ Appearance</h4>
          <p>Theme: Dark mode enabled</p>
        </div>
        <div class="settings-item">
          <h4>🔄 Updates</h4>
          <p>Status: ${localStorage.getItem('updatesComplete') === 'true' ? 'Up to date' : 'Updates pending'}</p>
        </div>
        <div class="settings-item">
          <h4>ℹ️ Version</h4>
          <p>Web Desktop Simulator v1.0.0</p>
        </div>
      </div>
    `;
    
    return this.createWindow({
      title: 'Settings',
      content,
      width: 500,
      height: 400,
      top: 150,
      left: 200
    });
  }
}

// Global instance
let windowManager = new WindowManager();

// Export for global access
window.openDocument = function() {
  windowManager.openDocumentWindow(documentContent);
};

window.openSettings = function() {
  windowManager.openSettingsWindow();
};

window.showAbout = function() {
  document.getElementById('about-modal').classList.remove('hidden');
};

window.closeAbout = function() {
  document.getElementById('about-modal').classList.add('hidden');
};

window.fakeShutdown = function() {
  const shutdownScreen = document.createElement('div');
  shutdownScreen.className = 'shutdown-screen';
  shutdownScreen.style.display = 'flex';
  shutdownScreen.innerHTML = '<p>Shutting down...</p>';
  document.body.appendChild(shutdownScreen);
  
  setTimeout(() => {
    location.reload();
  }, 2000);
};