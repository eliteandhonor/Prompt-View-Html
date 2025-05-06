// ui/sidebar.js - Sidebar initialization and logic (2025 Rebuild, Audited/Refactored)

import { fetchCategories } from '../api/categories.js';
import { fetchTags } from '../api/tags.js';
import { debugLog } from '../util/helpers.js';
import { trackEvent } from '../util/analytics.js';

/**
 * Utility to render a list (categories/tags) and attach event handlers.
 * @param {HTMLElement} listEl
 * @param {Array} items
 * @param {string} type - 'category' or 'tag'
 * @param {Function} onClick
 */
function renderListWithHandlers(listEl, items, type, onClick) {
  debugLog(`[Sidebar] renderListWithHandlers called for ${type}`, items);
  if (!listEl) return;
  if (!Array.isArray(items) || items.length === 0) {
    listEl.innerHTML = `<li class="empty-state" aria-live="polite">No ${type}s found. <span class="hint">Add a ${type} to get started.</span></li>`;
    debugLog(`[Sidebar] No ${type}s found (empty state rendered)`);
    return;
  }
  listEl.innerHTML = items
    .map(
      item =>
        `<li tabindex="0" role="button" aria-label="${type.charAt(0).toUpperCase() + type.slice(1)}: ${item.name}" data-id="${item.id}">${item.name}</li>`
    )
    .join('');
  debugLog(`[Sidebar] Rendered ${type}s`, items.map(i => i.name));
  // Remove previous event listeners by cloning nodes (idempotency)
  listEl.querySelectorAll('li[tabindex="0"]').forEach(li => {
    const newLi = li.cloneNode(true);
    newLi.addEventListener('click', () => {
      const id = newLi.getAttribute('data-id');
      debugLog(`[Sidebar] ${type.charAt(0).toUpperCase() + type.slice(1)} clicked`, { name: newLi.textContent, id });
      onClick(id, newLi.textContent);
    });
    // Keyboard accessibility: Enter/Space triggers click
    newLi.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        newLi.click();
      }
    });
    li.replaceWith(newLi);
  });
}

/**
 * Focus the first interactive element in the sidebar for accessibility.
 */
function focusSidebarFirstElement() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const first = sidebar.querySelector('button, [tabindex="0"], a, input, select, textarea');
  if (first) first.focus();
}

/**
 * Ensure a visually hidden live region exists for ARIA announcements.
 * Returns the live region element.
 */
function ensureSidebarLiveRegion() {
  let region = document.getElementById('sidebar-live-region');
  if (!region) {
    region = document.createElement('div');
    region.id = 'sidebar-live-region';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.style.position = 'absolute';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';
    region.style.clip = 'rect(1px, 1px, 1px, 1px)';
    region.style.whiteSpace = 'nowrap';
    region.style.border = '0';
    region.style.padding = '0';
    region.style.margin = '-1px';
    document.body.appendChild(region);
  }
  return region;
}

/**
 * Show/hide a loading overlay on the sidebar.
 */
function setSidebarLoading(isLoading) {
  let overlay = document.getElementById('sidebar-loading-overlay');
  const sidebar = document.getElementById('sidebar');
  if (isLoading) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sidebar-loading-overlay';
      overlay.className = 'sidebar-loading-overlay';
      overlay.innerHTML = '<div class="sidebar-spinner" aria-label="Loading sidebar"></div>';
      overlay.style.position = 'absolute';
      overlay.style.top = 0;
      overlay.style.left = 0;
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.background = 'rgba(255,255,255,0.7)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = 1000;
      if (sidebar) sidebar.appendChild(overlay);
    }
  } else if (overlay) {
    overlay.remove();
  }
}

/**
 * Debounce utility for rapid toggling.
 */
function debounce(fn, delay = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function initSidebar() {
  debugLog('[Sidebar] initSidebar called');
  const liveRegion = ensureSidebarLiveRegion();

  // Sidebar toggle
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');
  if (sidebar && toggleBtn) {
    debugLog('[Sidebar] Sidebar and toggleBtn found');
    // Remove previous listeners for idempotency
    toggleBtn.replaceWith(toggleBtn.cloneNode(true));
    const newToggleBtn = document.getElementById('sidebar-toggle');

    // DRY event handler for click/keyboard
    function handleSidebarToggle() {
      setSidebarLoading(true);
      setTimeout(() => {
        const expanded = sidebar.getAttribute('aria-expanded') === 'true';
        sidebar.setAttribute('aria-expanded', String(!expanded));
        sidebar.classList.toggle('open');
        newToggleBtn.setAttribute('aria-pressed', String(!expanded));
        debugLog('[Sidebar] Sidebar toggled', { expanded: !expanded });
        setSidebarLoading(false);
        if (!expanded) {
          setTimeout(focusSidebarFirstElement, 80);
          liveRegion.textContent = 'Sidebar opened';
          trackEvent('sidebar_open', {});
        } else {
          liveRegion.textContent = 'Sidebar closed';
          trackEvent('sidebar_close', {});
        }
      }, 300); // Simulate loading for UX
    }

    newToggleBtn.addEventListener('click', debounce(handleSidebarToggle, 120));
    newToggleBtn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSidebarToggle();
      }
    });
  } else {
    debugLog('[Sidebar] Sidebar or toggleBtn not found', { sidebar, toggleBtn });
  }

  // Categories
  const categoryList = document.getElementById('category-list');
  function loadCategories() {
    if (!categoryList) {
      debugLog('[Sidebar] categoryList not found');
      return;
    }
    categoryList.innerHTML = '<li>Loading categories...</li>';
    liveRegion.textContent = 'Loading categories...';
    fetchCategories()
      .then(categories => {
        debugLog('[Sidebar] fetchCategories resolved', categories);
        renderListWithHandlers(categoryList, categories, 'category', (catId, name) => {
          window.dispatchEvent(new CustomEvent('filterPrompts', { detail: { category: catId } }));
          liveRegion.textContent = `Filtered by category: ${name}`;
          trackEvent('sidebar_filter_category', { categoryId: catId, name });
        });
        if (!categories || categories.length === 0) {
          liveRegion.textContent = 'No categories found.';
        } else {
          liveRegion.textContent = 'Categories loaded.';
        }
      })
      .catch(err => {
        categoryList.innerHTML = '<li>Error loading categories.</li>';
        liveRegion.textContent = 'Error loading categories.';
        debugLog('[Sidebar] Failed to load categories', err);
        setSidebarLoading(false);
      });
  }
  loadCategories();
  window.removeEventListener('categoriesUpdated', loadCategories); // Prevent duplicate
  window.addEventListener('categoriesUpdated', loadCategories);

  // Tags
  const tagList = document.getElementById('tag-list');
  function loadTags() {
    if (!tagList) {
      debugLog('[Sidebar] tagList not found');
      return;
    }
    tagList.innerHTML = '<li>Loading tags...</li>';
    liveRegion.textContent = 'Loading tags...';
    fetchTags()
      .then(tags => {
        debugLog('[Sidebar] fetchTags resolved', tags);
        renderListWithHandlers(tagList, tags, 'tag', (tagId, name) => {
          window.dispatchEvent(new CustomEvent('filterPrompts', { detail: { tag: tagId } }));
          liveRegion.textContent = `Filtered by tag: ${name}`;
          trackEvent('sidebar_filter_tag', { tagId, name });
        });
        if (!tags || tags.length === 0) {
          liveRegion.textContent = 'No tags found.';
        } else {
          liveRegion.textContent = 'Tags loaded.';
        }
      })
      .catch(err => {
        tagList.innerHTML = '<li>Error loading tags.</li>';
        liveRegion.textContent = 'Error loading tags.';
        debugLog('[Sidebar] Failed to load tags', err);
        setSidebarLoading(false);
      });
  }
  loadTags();
  window.removeEventListener('tagsUpdated', loadTags); // Prevent duplicate
  window.addEventListener('tagsUpdated', loadTags);

  // "My Prompts" toggle
  const myPromptsBtn = document.getElementById('show-my-prompts');
  if (myPromptsBtn) {
    debugLog('[Sidebar] myPromptsBtn found');
    // Remove previous listeners for idempotency
    myPromptsBtn.replaceWith(myPromptsBtn.cloneNode(true));
    const newMyPromptsBtn = document.getElementById('show-my-prompts');
    function handleMyPromptsToggle() {
      newMyPromptsBtn.classList.toggle('active');
      const showMine = newMyPromptsBtn.classList.contains('active');
      debugLog('[Sidebar] My Prompts toggled', { showMine });
      window.dispatchEvent(new CustomEvent('filterPrompts', { detail: { myPrompts: showMine } }));
      liveRegion.textContent = showMine ? 'Showing only my prompts.' : 'Showing all prompts.';
      trackEvent('sidebar_toggle_my_prompts', { showMine });
    }
    newMyPromptsBtn.addEventListener('click', handleMyPromptsToggle);
    newMyPromptsBtn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleMyPromptsToggle();
      }
    });
  } else {
    debugLog('[Sidebar] myPromptsBtn not found');
  }
}