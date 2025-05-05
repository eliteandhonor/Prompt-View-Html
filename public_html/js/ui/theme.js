// ui/theme.js - Theme toggling and persistence (2025 Rebuild)

const THEMES = ['auto', 'dark', 'light'];

function getNextTheme(current) {
  const idx = THEMES.indexOf(current);
  return THEMES[(idx + 1) % THEMES.length];
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  // Update icon
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌓';
  }
}

export function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle');
  let theme = localStorage.getItem('theme') || 'auto';
  applyTheme(theme);

  if (toggleBtn) {
    toggleBtn.setAttribute('aria-pressed', theme !== 'auto');
    toggleBtn.addEventListener('click', () => {
      theme = getNextTheme(theme);
      applyTheme(theme);
      toggleBtn.setAttribute('aria-pressed', theme !== 'auto');
    });
    // Keyboard accessibility
    toggleBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleBtn.click();
      }
    });
  }
}