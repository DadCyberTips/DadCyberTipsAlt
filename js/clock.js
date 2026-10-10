/**
 * System Clock
 * Updates the time and date in the taskbar
 */

function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const clockEl = document.getElementById('clock');
  const dateEl = document.getElementById('date');
  
  if (!clockEl || !dateEl) return;
  
  const now = new Date();
  
  // Format time (12-hour with AM/PM)
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  clockEl.textContent = `${hours}:${minutes} ${ampm}`;
  
  // Format date
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  dateEl.textContent = now.toLocaleDateString('en-US', options);
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { startClock, updateClock };
}