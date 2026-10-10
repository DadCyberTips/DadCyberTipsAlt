/**
 * Start Menu Controller
 * Handles opening, closing, and toggling the start menu
 */

(function() {
  const startMenu = document.getElementById('start-menu');
  const startButton = document.getElementById('start-button');
  const desktopIcons = document.querySelectorAll('.desktop-icon');
  
  let isOpen = false;
  
  function toggleStartMenu(e) {
    e.stopPropagation();
    isOpen = !isOpen;
    
    if (isOpen) {
      startMenu.classList.remove('hidden');
      setTimeout(() => startMenu.classList.add('active'), 10);
      
      // Play subtle sound effect (optional)
      playStartupSound();
    } else {
      closeStartMenu();
    }
  }
  
  function closeStartMenu() {
    isOpen = false;
    startMenu.classList.remove('active');
    setTimeout(() => startMenu.classList.add('hidden'), 200);
  }
  
  function handleOutsideClick(e) {
    if (isOpen && 
        !startMenu.contains(e.target) && 
        !startButton.contains(e.target)) {
      closeStartMenu();
    }
  }
  
  function playStartupSound() {
    // Optional: Add subtle audio feedback
    // const audio = new Audio('assets/startup.mp3');
    // audio.volume = 0.3;
    // audio.play().catch(() => {});
  }
  
  // Event listeners
  startButton.addEventListener('click', toggleStartMenu);
  document.addEventListener('click', handleOutsideClick);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) {
      closeStartMenu();
    }
  });
  
})();