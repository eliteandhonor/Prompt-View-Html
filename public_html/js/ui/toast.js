// ui/toast.js - Toast/feedback notifications (2025 Rebuild)

export function showToast(message, { type = 'info', duration = 2500 } = {}) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, duration);
}

// Listen for custom events to show toast from anywhere
window.addEventListener('showToast', (e) => {
  const { message, type, duration } = e.detail || {};
  showToast(message, { type, duration });
});