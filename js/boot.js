/**
 * Boot Sequence Controller
 * Handles the startup animation and transition to desktop
 */

async function bootSequence() {
  const bootScreen = document.getElementById('boot-screen');
  const loader = bootScreen.querySelector('.spinning-loader');
  const logo = bootScreen.querySelector('.boot-logo');
  
  // Stage 1: Logo visible (2.5 seconds)
  await delay(2500);
  
  // Stage 2: Loader appears (1.5 seconds)
  loader.style.display = 'block';
  await delay(1500);
  
  // Stage 3: Logo fades out
  logo.style.opacity = '0';
  await delay(500);
  
  // Stage 4: Transition to desktop
  bootScreen.classList.add('fade-out');
  await delay(1000);
  
  // Show desktop
  bootScreen.style.display = 'none';
  document.getElementById('desktop').style.display = 'block';
  
  // Dispatch event for other modules
  window.dispatchEvent(new Event('desktopReady'));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { bootSequence, delay };
}