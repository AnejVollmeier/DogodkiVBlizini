// Tema (dark mode) logic
document.addEventListener('DOMContentLoaded', function () {
  const darkModeToggle = document.getElementById('darkModeToggle');
  
  function setDarkMode(on) {
    if (on) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', '1');
      // Only update toggle if it exists (only on index page)
      if (darkModeToggle) {
        darkModeToggle.checked = true;
      }
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', '0');
      // Only update toggle if it exists (only on index page)
      if (darkModeToggle) {
        darkModeToggle.checked = false;
      }
    }
  }
  
  // On load, set mode from localStorage or system preference
  (() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === '1' || (saved === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
    } else {
      setDarkMode(false);
    }
  })();
  
  // Only add listener if toggle exists (only on index page)
  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', e => setDarkMode(e.target.checked));
  }
});
