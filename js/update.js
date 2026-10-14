/**
 * Update Simulator
 * Manages the simulated Windows Update process
 */

(function() {
  const modal = document.getElementById('update-modal');
  const notificationToast = document.getElementById('update-notification');
  const messageEl = document.getElementById('update-message');
  const progressEl = document.getElementById('update-progress');
  const percentEl = document.getElementById('update-percent');
  
  let updateInProgress = false;
  
  window.checkUpdatesStatus = function() {
    const updatesComplete = localStorage.getItem('updatesComplete');
    const hideUpdates = localStorage.getItem('hideUpdateNotification');
    
    if (!updatesComplete && !hideUpdates) {
      // Show notification after brief delay
      setTimeout(() => {
        notificationToast.classList.remove('hidden');
        
        // Auto-hide notification after 10 seconds
        setTimeout(() => {
          notificationToast.classList.add('hidden');
        }, 10000);
      }, 3000);
    }
  };
  
  window.startUpdateSimulation = async function() {
    if (updateInProgress) return;
    updateInProgress = true;
    
    notificationToast.classList.add('hidden');
    modal.classList.remove('hidden');
    
    const stages = [
      { message: 'Checking for updates...', progress: 0 },
      { message: 'Checking for updates...', progress: 5 },
      { message: 'Downloading update files...', progress: 25 },
      { message: 'Downloading update files...', progress: 50 },
      { message: 'Downloading update files...', progress: 75 },
      { message: 'Installing updates...', progress: 85 },
      { message: 'Installing updates...', progress: 95 },
      { message: 'Getting things ready...', progress: 100 }
    ];
    
    const times = [800, 600, 700, 800, 900, 700, 800, 1500];
    
    for (let i = 0; i < stages.length; i++) {
      messageEl.textContent = stages[i].message;
      progressEl.style.width = `${stages[i].progress}%`;
      percentEl.textContent = `${stages[i].progress}%`;
      
      // Add slight random variation to timing
      const waitTime = times[i] + Math.random() * 200;
      await delay(waitTime);
    }
    
    // Complete
    localStorage.setItem('updatesComplete', 'true');
    localStorage.removeItem('hideUpdateNotification');
    
    // Final screen
    messageEl.textContent = 'Updates installed successfully!';
    await delay(1500);
    
    modal.classList.add('hidden');
    updateInProgress = false;
    if (typeof windowManager !== 'undefined') windowManager.closeWindow('blocked');
  };
  
  // Hide notification without installing
  notificationToast.addEventListener('click', () => {
    notificationToast.classList.add('hidden');
    localStorage.setItem('hideUpdateNotification', 'true');
  });
  
  
})();