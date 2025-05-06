/**
 * ui/theme.js - Theme toggling and persistence (2025 Rebuild)
 * Atomic Audit & Debug Overhaul: May 2025
 * - Centralized debug logging, error handling, accessibility, and maintainability improvements.
 */

import { debugLog } from '../util/helpers.js';

/** Supported theme modes. */
const THEMES = ['auto', 'dark', 'light'];

/**
 * Get the next theme in the cycle.
 * @param {string} current - The current theme.
 * @returns {string} The next theme.
 */
function getNextTheme(current) {
  debugLog('getNextTheme: entry', { current });
  const idx = THEMES.indexOf(current);
  const next = THEMES[(idx + 1) % THEMES.length];
  debugLog('getNextTheme: exit', { next });
  return next;
}

/**
 * Apply the given theme to the document and persist it.
 * @param {string} theme - The theme to apply.
 */
function applyTheme(theme) {
  debugLog('applyTheme: entry', { theme });
  try {
    const root = document.documentElement;
    if (!root) {
      debugLog('applyTheme: documentElement not found');
      return;
    }
    root.setAttribute('data-theme', theme);

    try {
      localStorage.setItem('theme', theme);
    } catch (err) {
      debugLog('applyTheme: localStorage.setItem failed', err);
    }

    // Update icon
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) {
      icon.textContent = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🌓';
    } else {
      debugLog('applyTheme: theme-toggle-icon not found');
    }
  } catch (err) {
    debugLog('applyTheme: error', err);
  }
  debugLog('applyTheme: exit');
}

/**
 * Handle theme toggle button click.
 * @param {HTMLElement} toggleBtn - The toggle button element.
 * @param {string} currentTheme - The current theme.
 */
function handleThemeToggleClick(toggleBtn, currentThemeRef) {
  debugLog('handleThemeToggleClick: entry', { currentTheme: currentThemeRef.value });
  currentThemeRef.value = getNextTheme(currentThemeRef.value);
  applyTheme(currentThemeRef.value);
  toggleBtn.setAttribute('aria-pressed', currentThemeRef.value !== 'auto');
  debugLog('handleThemeToggleClick: exit', { newTheme: currentThemeRef.value });
}

/**
 * Handle theme toggle button keydown for accessibility.
 * @param {KeyboardEvent} e
 * @param {HTMLElement} toggleBtn
 * @param {Object} currentThemeRef
 */
function handleThemeToggleKeydown(e, toggleBtn, currentThemeRef) {
  debugLog('handleThemeToggleKeydown: entry', { key: e.key });
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleThemeToggleClick(toggleBtn, currentThemeRef);
  }
  debugLog('handleThemeToggleKeydown: exit');
}

/**
 * Initialize theme toggling UI and logic.
 * Sets up event handlers, applies persisted theme, and ensures accessibility.
 */
export function initTheme() {
  debugLog('initTheme: entry');
  const toggleBtn = document.getElementById('theme-toggle');
  let theme = 'auto';
  try {
    theme = localStorage.getItem('theme') || 'auto';
  } catch (err) {
    debugLog('initTheme: localStorage.getItem failed', err);
  }
  const currentThemeRef = { value: theme };
  applyTheme(currentThemeRef.value);

  if (toggleBtn) {
    // Accessibility: ensure role and aria-label
    toggleBtn.setAttribute('role', 'button');
    toggleBtn.setAttribute('tabindex', '0');
    toggleBtn.setAttribute('aria-label', 'Toggle color theme');
    toggleBtn.setAttribute('aria-pressed', currentThemeRef.value !== 'auto');

    // Remove any previous event listeners (defensive, in case of re-init)
    toggleBtn.replaceWith(toggleBtn.cloneNode(true));
    const newToggleBtn = document.getElementById('theme-toggle');

    if (newToggleBtn) {
      newToggleBtn.setAttribute('role', 'button');
      newToggleBtn.setAttribute('tabindex', '0');
      newToggleBtn.setAttribute('aria-label', 'Toggle color theme');
      newToggleBtn.setAttribute('aria-pressed', currentThemeRef.value !== 'auto');

      newToggleBtn.addEventListener('click', () => handleThemeToggleClick(newToggleBtn, currentThemeRef));
      newToggleBtn.addEventListener('keydown', (e) => handleThemeToggleKeydown(e, newToggleBtn, currentThemeRef));
      debugLog('initTheme: event handlers attached');
    } else {
      debugLog('initTheme: theme-toggle button not found after cloning');
    }
  } else {
    debugLog('initTheme: theme-toggle button not found');
  }
  debugLog('initTheme: exit');
}