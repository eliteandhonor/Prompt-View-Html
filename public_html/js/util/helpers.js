/**
 * Utility functions for minimal JSON-backed CRUD app.
 * These are imported by main.js and other modules.
 */

/**
 * Get selected values from a multi-select <select> element.
 * @param {HTMLSelectElement} select
 * @returns {string[]} Array of selected option values
 */
export function getSelectedOptions(select) {
  return Array.from(select.selectedOptions).map(opt => opt.value);
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string} Escaped string
 */
export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    switch (c) {
      case '&': return '&';
      case '<': return '<';
      case '>': return '>';
      case '"': return '"';
      case "'": return '&#39;';
      default: return c;
    }
  });
}

/**
 * Minimal markdown renderer: supports **bold**, *italic*, `code`, and escapes HTML.
 * @param {string} md
 * @returns {string} HTML string
 */
export function renderMarkdownToHTML(md) {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>');
  html = html
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^\*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
  return html;
}