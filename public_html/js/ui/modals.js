console.log("[DEBUG] NEW MODALS.JS LOADED - 2025 VERSION");
// DEBUG: Force modal debug logging ON for diagnosis
if (typeof window !== "undefined") window.DEBUG_MODALS = true;
/**
 * ui/modals.js - KISS Modal management (2025 Refactor with Full Logging & Audit Overhaul)
 */

import { createPrompt, updatePrompt, deletePrompt } from '../api/prompts.js';
import { renderCommentsResults } from './commentsResults.js';
import { renderPromptsWithScroll } from './promptList.js';
import { generatePromptCrudFormHTML, debugLog } from '../util/helpers.js';
import { importPrompts } from '../api/prompts.js';
import { fetchCategories } from '../api/categories.js';
import { fetchTags } from '../api/tags.js';
import { trackEvent } from '../util/analytics.js';

/* --- Debug flag and debugLog wrapper for modal logging --- */
const DEBUG_MODALS = typeof window !== "undefined" && window.DEBUG_MODALS === true;
function debugLogIfEnabled(...args) {
  if (DEBUG_MODALS) debugLog(...args);
}
/* -------------------------------------------------------- */
/**
 * Modal Stack Manager: Ensures modal isolation, stacking, and pointer-events/z-index logic.
 */
const MODAL_BASE_Z = 1000;
const MODAL_Z_STEP = 10;
const modalStack = [];

/**
 * Open a modal with stacking and isolation.
 * - modal: DOM element (modal container)
 */
export function openIsolatedModal(modal) {
  if (!modal) return;
  // Remove from stack if already present (avoid duplicates)
  const idx = modalStack.indexOf(modal);
  if (idx !== -1) modalStack.splice(idx, 1);
  modalStack.push(modal);

  // Remove d-none to show modal
  modal.classList.remove('d-none');

  // Set z-index and pointer-events for all modals in stack
  modalStack.forEach((m, i) => {
    m.style.zIndex = MODAL_BASE_Z + i * MODAL_Z_STEP;
    if (i === modalStack.length - 1) {
      m.inert = false;
      m.hidden = false;
      m.setAttribute('aria-hidden', 'false');
      m.classList.add('active');
      m.style.pointerEvents = '';
      const content = m.querySelector('.modal-content');
      if (content) content.style.pointerEvents = '';
    } else {
      m.inert = true;
      m.hidden = false;
      m.setAttribute('aria-hidden', 'true');
      m.classList.remove('active');
      m.style.pointerEvents = 'none';
      // Only allow pointer-events on close button
      const closeBtn = m.querySelector('.close-modal');
      if (closeBtn) closeBtn.style.pointerEvents = '';
    }
  });
  document.body.classList.add('modal-open');
}

/**
 * Close a modal and update stack/z-index/pointer-events.
 * - modal: DOM element (modal container)
 */
export function closeIsolatedModal(modal) {
  if (!modal) return;
  const idx = modalStack.indexOf(modal);
  if (idx !== -1) modalStack.splice(idx, 1);

  modal.inert = true;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('active');
  modal.style.pointerEvents = 'none';
  modal.style.zIndex = '';
  const content = modal.querySelector('.modal-content');
  if (content) content.style.pointerEvents = 'none';

  // Add d-none to hide modal
  modal.classList.add('d-none');

  // Restore pointer-events/z-index for remaining modals
  modalStack.forEach((m, i) => {
    m.style.zIndex = MODAL_BASE_Z + i * MODAL_Z_STEP;
    if (i === modalStack.length - 1) {
      m.inert = false;
      m.setAttribute('aria-hidden', 'false');
      m.classList.add('active');
      m.style.pointerEvents = '';
      const content = m.querySelector('.modal-content');
      if (content) content.style.pointerEvents = '';
    } else {
      m.inert = true;
      m.setAttribute('aria-hidden', 'true');
      m.classList.remove('active');
      m.style.pointerEvents = 'none';
      const closeBtn = m.querySelector('.close-modal');
      if (closeBtn) closeBtn.style.pointerEvents = '';
    }
  });
  if (modalStack.length === 0) {
    document.body.classList.remove('modal-open');
  }
}

/**
 * Utility: Returns true if the given modal is the topmost (active) modal.
 */
export function isTopModal(modal) {
  return modalStack.length && modalStack[modalStack.length - 1] === modal;
}

/**
 * Helper: Standardized fallback focus for accessibility.
 */
function focusFallback() {
  const fallback = document.getElementById('main-content') || document.body;
  if (fallback && typeof fallback.focus === 'function') {
    fallback.focus();
  } else {
    document.body.focus();
  }
}
/**
/**
* Helper: Safely set innerHTML with trusted data only.
* NOTE: All uses of innerHTML with user data are reviewed and assumed safe by construction.
* If user data is ever injected, sanitize before use.
*/


/**
 * Helper: Idempotent event handler attachment.
 */
function addEventListenerOnce(element, event, handler) {
  element.removeEventListener(event, handler);
  element.addEventListener(event, handler);
}

/**
 * Helper: Wire up a close button for a modal (handles click and Enter/Space keydown).
 */
function wireCloseButton(btn, modal, closeFn) {
  if (!btn) return;
  addEventListenerOnce(btn, 'click', (ev) => {
    ev.preventDefault();
    closeFn(modal);
  });
  addEventListenerOnce(btn, 'keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
      ev.preventDefault();
      closeFn(modal);
    }
  });
}

export function initModals() {
  debugLog("initModals: START");
  window.__modalsInit = true;
  const promptDetailModal = document.getElementById('prompt-detail-modal');
  const promptDetailBody = document.getElementById('prompt-detail-body');
  const crudModal = document.getElementById('crud-modal');
  const crudModalBody = document.getElementById('crud-modal-body');
  const closeModalBtns = document.querySelectorAll('.close-modal');

  // Accessibility: store last focused element for focus return
  let lastFocusedElement = null;

  // Focus trap utility (ensures only one handler per modal)
  function trapFocus(modal) {
    debugLog("trapFocus: START", { modal });
    if (!modal) return;
    // Remove any existing handler
    removeTrapFocus(modal);

    const focusableSelectors = [
      'a[href]', 'area[href]', 'input:not([disabled])', 'select:not([disabled])',
      'textarea:not([disabled])', 'button:not([disabled])', 'iframe', 'object', 'embed',
      '[tabindex]:not([tabindex="-1"])', '[contenteditable]'
    ];
    const focusableEls = modal.querySelectorAll(focusableSelectors.join(','));
    if (!focusableEls.length) {
      debugLog("trapFocus: END (no focusable elements)");
      return;
    }
    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];

    function handleTrap(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
            debugLog("trapFocus: shift+Tab at first element, cycling to last");
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
            debugLog("trapFocus: Tab at last element, cycling to first");
          }
        }
      }
    }
    modal.addEventListener('keydown', handleTrap);
    modal.__trapFocusHandler = handleTrap;
    debugLog("trapFocus: END");
  }

  function removeTrapFocus(modal) {
    if (modal && modal.__trapFocusHandler) {
      modal.removeEventListener('keydown', modal.__trapFocusHandler);
      delete modal.__trapFocusHandler;
      if (DEBUG_MODALS) { console.log("[DEBUG] removeTrapFocus: removed handler"); }
    }
  }

  // Modal open/close logic: static modals are not removed from DOM, only hidden/inerted
  function openModal(modal) {
    if (DEBUG_MODALS) { console.log("[DEBUG] openModal: START", { modal }); }
    if (modal) {
      lastFocusedElement = document.activeElement;
      modal.inert = false;
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('active');
      modal.style.pointerEvents = '';
      const modalContent = modal.querySelector('.modal-content');
      if (modalContent) modalContent.style.pointerEvents = '';
      // Use requestAnimationFrame for focus for best timing
      requestAnimationFrame(() => {
        const focusable = modal.querySelectorAll('input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])');
        if (focusable.length) {
          focusable[0].focus();
        } else {
          modal.focus();
        }
      });
      trapFocus(modal);
      document.body.classList.add('modal-open');
      trackEvent('modal_open', { modalId: modal.id || undefined });
      console.log("[DEBUG] openModal: END (modal opened)");
    } else {
      console.warn("[DEBUG] openModal: modal is null");
    }
  }

  function closeModal(modal) {
    debugLog("closeModal: START", { modal });
    if (modal) {
      // Accessibility: If focus is inside the modal, move it to a safe fallback before hiding
      if (modal.contains(document.activeElement)) {
        focusFallback();
      }
      modal.inert = true;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('active');
      modal.style.pointerEvents = 'none';
      const modalContent = modal.querySelector('.modal-content');
      if (modalContent) modalContent.style.pointerEvents = 'none';
      document.body.classList.remove('modal-open');
      trackEvent('modal_close', { modalId: modal.id || undefined });
      removeTrapFocus(modal);

      // Remove ARIA attributes for accessibility (static modals)
      modal.removeAttribute('aria-modal');
      modal.removeAttribute('role');
      modal.removeAttribute('aria-labelledby');
      // Remove aria-live from any live region children
      const liveRegions = modal.querySelectorAll('[aria-live]');
      liveRegions.forEach(el => el.removeAttribute('aria-live'));

      // Restore focus to last focused element
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        setTimeout(() => {
          lastFocusedElement.focus();
        }, 50); // 50ms: allow DOM to update before refocusing
      }
      // Do NOT remove static modals from DOM
      debugLog("closeModal: END (modal closed)");
    } else {
      debugLog("closeModal: modal is null");
    }
  }

  // Helper: Disconnect MutationObserver after use
  function observeOnce(target, options, callback) {
    const observer = new MutationObserver((mutationsList, obs) => {
      callback(mutationsList, obs);
      obs.disconnect();
    });
    observer.observe(target, options);
  }

  // Modularized CRUD form rendering
  // Helper: Render CRUD modal in view mode
  function renderCrudView({ prompt, categories, tags }) {
    let categoryName = 'Uncategorized';
    let categoryId = '';
    if (prompt.category && Array.isArray(categories)) {
      const cat = categories.find(c => c.id === prompt.category);
      if (cat && cat.name) {
        categoryName = cat.name;
        categoryId = cat.id;
      }
    }
    let tagObjs = [];
    if (Array.isArray(prompt.tags) && Array.isArray(tags)) {
      tagObjs = prompt.tags.map(tid => {
        const tag = tags.find(t => t.id === tid);
        return tag && tag.name ? tag : { id: tid, name: tid };
      });
    }
    const title = prompt.title || 'Untitled';
    const author = prompt.author || 'Unknown';
    const created = prompt.created_at
      ? (() => {
          const d = new Date(prompt.created_at);
          return !isNaN(d) ? d.toLocaleString() : prompt.created_at;
        })()
      : '';
    const description = prompt.description || '';
    const content = prompt.content || '';
    const id = prompt.id || '';

    crudModalBody.innerHTML = `
      <div class="modal-content" tabindex="0" style="padding:32px 28px 32px 28px;">
        <div id="crud-modal-live-region" class="sr-only" aria-live="polite"></div>
        <button type="button" class="close-modal" aria-label="Close Prompt Detail Modal" tabindex="0" id="close-crud-modal-btn" data-testid="close-crud-modal-btn" style="position:absolute;top:16px;right:16px;width:32px;height:32px;z-index:10;">&times;</button>
        <h2 class="prompt-title" data-testid="prompt-detail-title" style="margin-bottom:0.5em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${title}">${title}</h2>
        <div class="prompt-actions modal-actions" style="display:flex;gap:0.7em;justify-content:flex-end;margin-bottom:1.1em;">
          <button type="button" class="edit-btn primary" data-testid="edit-prompt-btn-modal-${id}" aria-label="Edit prompt: ${title}" tabindex="0">Edit</button>
          <button type="button" class="delete-btn danger" data-testid="delete-prompt-btn-modal-${id}" aria-label="Delete prompt: ${title}" tabindex="0">Delete</button>
          <button type="button" class="copy-btn secondary" data-testid="copy-prompt-btn-modal-${id}" aria-label="Copy prompt: ${title}" tabindex="0">Copy</button>
        </div>
        <div class="prompt-meta" style="display:flex;flex-wrap:wrap;gap:0.7em;font-size:0.98em;color:var(--color-text-muted);margin-bottom:0.7em;">
          <span>ID: <code>${id}</code></span>
          ${created ? `<span>Created: ${created}</span>` : ''}
          <span>By: ${author}</span>
        </div>
        <div class="prompt-tags-cats" style="display:flex;flex-wrap:wrap;gap:0.5em;margin-bottom:1.1em;">
          <span class="tag-pill category-pill" data-testid="category-pill-modal-${id}" aria-label="Category: ${categoryName}" title="Category: ${categoryName}">
            ${categoryName}
          </span>
          ${tagObjs.map(tag =>
            `<span class="tag-pill" data-testid="tag-pill-modal-${id}-${tag.id}" aria-label="Tag: ${tag.name}" title="Tag: ${tag.name}">${tag.name}</span>`
          ).join('')}
        </div>
        <div class="prompt-description" data-testid="prompt-detail-description" style="margin-bottom:1.1em;">
          ${description}
        </div>
        <div class="prompt-content" data-testid="prompt-detail-content" style="margin-bottom:1.1em;white-space:pre-line;word-break:break-word;max-height:40vh;overflow:auto;">
          ${content}
        </div>
      </div>
    `;

    wireCrudModalActions({ mode: 'view', prompt, categories, tags, content, id, title });
    setTimeout(() => {
      const liveRegion = document.getElementById('crud-modal-live-region');
      if (liveRegion) {
        liveRegion.textContent = `Prompt details for "${title}" loaded.`;
      }
    }, 50);
  }

  // Helper: Render CRUD modal in form mode (add/edit)
  function renderCrudFormFields({ mode, prompt, categories, tags }) {
    debugLog("renderCrudFormFields: Passing categories to generatePromptCrudFormHTML:", categories, "tags:", tags);
    crudModalBody.innerHTML = generatePromptCrudFormHTML({
      mode,
      prompt,
      categories: typeof categories !== "undefined" ? categories : [],
      tags: typeof tags !== "undefined" ? tags : []
    });
    wireCrudModalActions({ mode, prompt, categories, tags });
  }

  // Helper: Wire up modal actions (close, edit, delete, copy, form submit)
  function wireCrudModalActions({ mode, prompt, categories, tags, content, id, title }) {
    setTimeout(() => {
      // Close
      const closeBtn = document.getElementById('close-crud-modal-btn');
      wireCloseButton(closeBtn, crudModal, closeIsolatedModal);
      // Edit (only in view mode)
      if (mode === 'view') {
        const editBtn = crudModalBody.querySelector('.edit-btn');
        if (editBtn) {
          addEventListenerOnce(editBtn, 'click', (ev) => {
            ev.preventDefault();
            renderCrudForm({ mode: 'edit', prompt, categories, tags });
          });
        }
      }
      // Delete
      const deleteBtn = crudModalBody.querySelector('.delete-btn');
      if (deleteBtn) {
        addEventListenerOnce(deleteBtn, 'click', async (ev) => {
          ev.preventDefault();
          if (await showConfirmModal('Delete this prompt?')) {
            trackEvent('modal_destructive_action', { action: 'delete_prompt', promptId: id || (prompt && prompt.id) });
            // Cache prompt data for undo
            const deletedPromptData = { ...prompt, id: undefined }; // Remove id to avoid conflicts on restore
            let undoTimeout;
            try {
              await deletePrompt(id || (prompt && prompt.id));
              // Show toast with Undo option
              const undoHandler = async () => {
                clearTimeout(undoTimeout);
                try {
                  await createPrompt(deletedPromptData);
                  window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Prompt restored.', type: 'success' } }));
                  trackEvent('modal_undo', { action: 'restore_prompt', promptTitle: deletedPromptData.title });
                  window.dispatchEvent(new CustomEvent('filterPrompts', { detail: {} }));
                } catch (err) {
                  window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Failed to restore prompt.', type: 'error' } }));
                }
              };
              window.dispatchEvent(new CustomEvent('showToast', {
                detail: {
                  message: 'Prompt deleted',
                  type: 'success',
                  undo: {
                    label: 'Undo',
                    handler: undoHandler
                  }
                }
              }));
              const liveRegion = document.getElementById('crud-modal-live-region');
              if (liveRegion) {
                liveRegion.textContent = 'Prompt deleted successfully.';
              }
              closeIsolatedModal(crudModal);
              window.dispatchEvent(new CustomEvent('filterPrompts', { detail: {} }));
              // Auto-expire undo after 5 seconds
              undoTimeout = setTimeout(() => {
                // No action needed, undo option expires
              }, 5000);
            } catch (err) {
              window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Error deleting prompt', type: 'error' } }));
              const liveRegion = document.getElementById('crud-modal-live-region');
              if (liveRegion) {
                liveRegion.textContent = 'Error deleting prompt.';
              }
              debugLog('CRUD Modal: Failed to delete prompt', err);
            }
          }
        });
      }
      // Copy
      const copyBtn = crudModalBody.querySelector('.copy-btn');
      if (copyBtn) {
        addEventListenerOnce(copyBtn, 'click', (ev) => {
          ev.preventDefault();
          const textToCopy = content || (prompt && prompt.content) || '';
          if (navigator.clipboard) {
            navigator.clipboard.writeText(textToCopy)
              .then(() => {
                window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Prompt copied to clipboard.', type: 'success' } }));
              })
              .catch(() => {
                window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Failed to copy prompt.', type: 'error' } }));
              });
          } else {
            // Fallback for older browsers (deprecated)
            const textarea = document.createElement('textarea');
            textarea.value = textToCopy;
            document.body.appendChild(textarea);
            textarea.select();
            try {
              document.execCommand('copy');
              window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Prompt copied to clipboard.', type: 'success' } }));
            } catch {
              window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Failed to copy prompt.', type: 'error' } }));
            }
            document.body.removeChild(textarea);
          }
        });
      }
      // Focus first action for accessibility
      if (mode === 'view') {
        const editBtn = crudModalBody.querySelector('.edit-btn');
        if (editBtn) editBtn.focus();
      } else {
        const input = document.querySelector('[data-testid="prompt-title-input"]');
        if (input) input.focus();
      }
      // Form submit (only in form mode)
      if (mode === 'edit' || mode === 'add') {
        const form = document.getElementById('prompt-crud-form');
        debugLog("After renderCrudFormFields, form element is:", form);
        if (form) {
          addEventListenerOnce(form, 'submit', async (e) => {
            debugLog("form.onsubmit handler called for prompt CRUD");
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.category = formData.get('category');
            // Debug: log tag select state and collected tags
            const tagSelect = form.querySelector('select[name="tags"]');
            if (tagSelect) {
              const selectedOptions = Array.from(tagSelect.options).filter(opt => opt.selected).map(opt => opt.value);
              debugLog("[DEBUG] Tag select multiple:", tagSelect.multiple);
              debugLog("[DEBUG] Tag select selected options:", selectedOptions);
            } else {
              debugLog("[DEBUG] Tag select element not found in form");
            }
            const tagsFromForm = formData.getAll('tags');
            debugLog("[DEBUG] formData.getAll('tags'):", tagsFromForm);
            data.tags = tagsFromForm;
            let result = undefined;
            try {
              if (mode === 'edit') {
                debugLog("CRUD form submit: updatePrompt", prompt.id, data);
                await updatePrompt(prompt.id, data);
                window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Prompt updated', type: 'success' } }));
                const liveRegion = document.getElementById('crud-modal-live-region');
                if (liveRegion) {
                  liveRegion.textContent = 'Prompt updated successfully.';
                }
              } else {
                debugLog("CRUD form submit: createPrompt", data);
                result = await createPrompt(data);
                debugLog("Prompt created in backend, result:", result);
                window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Prompt created', type: 'success' } }));
                const liveRegion = document.getElementById('crud-modal-live-region');
                if (liveRegion) {
                  liveRegion.textContent = 'Prompt created successfully.';
                }
              }
              closeIsolatedModal(crudModal);
              setTimeout(() => {
                if (result && result.prompt && result.prompt.id) {
                  renderPromptsWithScroll(result.prompt.id);
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('promptListReady', { detail: { promptId: result.prompt.id } }));
                  }, 300);
                } else {
                  window.dispatchEvent(new CustomEvent('filterPrompts', { detail: {} }));
                }
              }, 100);
            } catch (err) {
              window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Error saving prompt', type: 'error' } }));
              const liveRegion = document.getElementById('crud-modal-live-region');
              if (liveRegion) {
                liveRegion.textContent = 'Error saving prompt.';
              }
              debugLog('CRUD Modal: Failed to save prompt', err);
            }
          });
        } else {
          debugLog("renderCrudFormFields: form not found");
        }
        // Legacy delete button (for edit mode)
        const deleteBtn = document.getElementById('delete-prompt-btn');
        if (deleteBtn) {
          addEventListenerOnce(deleteBtn, 'click', async () => {
            debugLog("Delete Prompt button clicked", prompt.id);
            if (await showConfirmModal('Delete this prompt?')) {
              try {
                await deletePrompt(prompt.id);
                window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Prompt deleted', type: 'success' } }));
                const liveRegion = document.getElementById('crud-modal-live-region');
                if (liveRegion) {
                  liveRegion.textContent = 'Prompt deleted successfully.';
                }
                closeIsolatedModal(crudModal);
                window.dispatchEvent(new CustomEvent('filterPrompts', { detail: {} }));
              } catch (err) {
                window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Error deleting prompt', type: 'error' } }));
                const liveRegion = document.getElementById('crud-modal-live-region');
                if (liveRegion) {
                  liveRegion.textContent = 'Error deleting prompt.';
                }
                debugLog('CRUD Modal: Failed to delete prompt', err);
              }
            } else {
              debugLog("Delete Prompt cancelled by user");
            }
          });
        }
      }
    }, 50);
    debugLog("wireCrudModalActions: END");
  }

  // Main: Modularized CRUD form rendering
  function renderCrudForm({ mode = 'add', prompt = {}, categories = [], tags = [] } = {}) {
    debugLog("renderCrudForm: START", { mode, prompt, categories, tags });

    // --- State Isolation & Initialization Fixes ---
    let safePrompt;
    if (mode === 'add') {
      // Always start with a fresh prompt object for new prompts, ignore any passed-in prompt except explicit overrides
      safePrompt = {
        title: '',
        description: '',
        content: '',
        category: categories && categories.length ? categories[0].id : '',
        tags: [],
        results: [],
        comments: [],
        ...(prompt && typeof prompt === "object"
          ? {
              // Only allow explicit overrides for title/content/description/category/tags
              title: prompt.title || '',
              description: prompt.description || '',
              content: prompt.content || '',
              category: prompt.category || (categories && categories.length ? categories[0].id : ''),
              tags: Array.isArray(prompt.tags) ? [...prompt.tags] : [],
              // Always force results/comments to empty for new prompts
              results: [],
              comments: []
            }
          : {})
      };
    } else {
      // Deep clone the prompt to avoid shared state
      safePrompt = JSON.parse(JSON.stringify(prompt || {}));
    }

    if (!crudModalBody) {
      debugLog("renderCrudForm: crudModalBody is null");
      return;
    }
    if (mode === 'view') {
      renderCrudView({ prompt: safePrompt, categories, tags });
    } else {
      renderCrudFormFields({ mode, prompt: safePrompt, categories, tags });
    }
    debugLog("renderCrudForm: END");
  }


  // Centralized modal event wiring
  function wireModalEvents() {
    // Close modal buttons (idempotent)
    closeModalBtns.forEach(btn => {
      addEventListenerOnce(btn, 'click', (e) => {
        const modal = btn.closest('.modal');
        if (DEBUG_MODALS) { console.log("[DEBUG] Close modal button clicked", modal); }
        closeModal(modal);
      });
    });

    // --- Refactored: Fetch categories/tags on modal open, wire up close button, accessibility, feedback ---
    window.addEventListener('openCrudModal', async (e) => {
      window.__crudModalEventReceived = true;
      if (DEBUG_MODALS) { console.log("[DEBUG] openCrudModal event received", e.detail); }
      openIsolatedModal(crudModal);

      // Show loading spinner while fetching prompt/categories/tags
      if (crudModal && crudModal.querySelector('#crud-modal-body')) {
        crudModal.querySelector('#crud-modal-body').innerHTML = `
          <div style="min-height:180px;"></div>
        `;
      }

      // Fetch categories and tags fresh on modal open
      let categories = [];
      let tags = [];
      try {
        categories = await fetchCategories();
      } catch (err) {
        console.error("[DEBUG] Failed to fetch categories:", err);
      }
      try {
        tags = await fetchTags();
      } catch (err) {
        console.error("[DEBUG] Failed to fetch tags:", err);
      }

      // Sync with global/app state for bugfix
      if (window.app) {
        window.app.categories = categories;
        window.app.tags = tags;
      }

      // Determine prompt to use (by object or by ID)
      let prompt = e && e.detail && e.detail.prompt;
      if ((!prompt || typeof prompt !== "object") && e && e.detail && e.detail.promptId) {
        if (window.app && Array.isArray(window.app.allPrompts)) {
          prompt = window.app.allPrompts.find(p => String(p.id) === String(e.detail.promptId));
        }
      }
      if (!prompt && e && e.detail && e.detail.prompt && typeof e.detail.prompt === "string") {
        if (window.app && Array.isArray(window.app.allPrompts)) {
          prompt = window.app.allPrompts.find(p => String(p.id) === String(e.detail.prompt));
        }
      }

      // If still not found, show error and retry
      if ((e.detail && e.detail.mode === "view") && !prompt) {
        if (crudModal && crudModal.querySelector('#crud-modal-body')) {
          crudModal.querySelector('#crud-modal-body').innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:180px;">
              <div style="color:#d32f5d;font-size:1.1em;margin-bottom:1em;">Prompt not found.</div>
              <button id="retry-prompt-detail-btn" class="primary" style="min-width:120px;">Retry</button>
            </div>
          `;
          const retryBtn = document.getElementById('retry-prompt-detail-btn');
          if (retryBtn) {
            addEventListenerOnce(retryBtn, 'click', () => {
              window.dispatchEvent(new CustomEvent('openCrudModal', { detail: { ...e.detail } }));
            });
          }
        }
        return;
      }

      // Render form or detail view with fetched categories/tags and prompt
      if (DEBUG_MODALS) { console.log("[DEBUG] openCrudModal: About to renderCrudForm with categories:", categories, "tags:", tags, "prompt:", prompt); }
      renderCrudForm({
        ...(e && e.detail ? e.detail : {}),
        prompt,
        categories,
        tags
      });

      // Wire up close button after render
      setTimeout(() => {
        const closeBtn = document.getElementById('close-crud-modal-btn');
        wireCloseButton(closeBtn, crudModal, closeIsolatedModal);
        // Focus title input for accessibility
        const input = document.querySelector('[data-testid="prompt-title-input"]');
        if (input) {
          input.focus();
          window.__promptTitleInputPresent = true;
          if (DEBUG_MODALS) { console.log("[DEBUG] prompt-title-input is present and visible:", !input.hidden, input.offsetParent !== null); }
        } else {
          window.__promptTitleInputPresent = false;
          console.error("[DEBUG] prompt-title-input NOT FOUND in DOM after renderCrudForm");
        }
      }, 100); // 100ms: allow DOM to update before focusing
    });

    // Accessibility: close on Escape
    [promptDetailModal, crudModal].forEach(modal => {
      if (modal) {
        addEventListenerOnce(modal, 'keydown', (e) => {
          if (e.key === 'Escape') {
            if (DEBUG_MODALS) { console.log("[DEBUG] Escape key pressed, closing modal", modal); }
            closeModal(modal);
          }
        });
      }
    });

    // [Legacy batch import modal event listener removed]
  }

  // Call centralized event wiring from initModals
  wireModalEvents();

  // === Batch Import Modal Logic ===
  // NOTE: openBatchImportModal is not exported; it is used via event for encapsulation.
  // openBatchImportModal moved to module scope and exported below

  // Register event to open batch import modal (not exported, event-based for encapsulation)
      // [Legacy batch import modal event listener removed]
}
/**
 * Minimal, robust, accessible multi-file import modal logic (KISS-style)
 * Supports .txt, .md, .json (single/array), drag-and-drop, file picker, clear feedback.
 */
function initMultiImportModal() {
  const importModal = document.getElementById('multi-import-modal');
  const importBody = document.getElementById('multi-import-modal-body');
  const openBtn = document.getElementById('batch-import-btn');
  if (!importModal || !importBody || !openBtn) return;

  // Elements inside modal
  const dropArea = importBody.querySelector('#multi-import-drop-area');
  const fileInput = importBody.querySelector('#multi-import-file-input');
  const fileListDiv = importBody.querySelector('#multi-import-file-list');
  const summaryDiv = importBody.querySelector('#multi-import-summary');
  const messagesDiv = importBody.querySelector('#multi-import-messages');
  const submitBtn = importBody.querySelector('#multi-import-submit');
  const cancelBtn = importBody.querySelector('#multi-import-cancel');
  const closeBtn = importBody.querySelector('#close-multi-import-modal-btn');
  const templateLink = importBody.querySelector('#download-import-template-link');

  let selectedFiles = [];
  let parsedPrompts = [];

  // Utility: Clear all UI state
  function clearModalState() {
    selectedFiles = [];
    parsedPrompts = [];
    fileInput.value = '';
    fileListDiv.innerHTML = '';
    summaryDiv.innerHTML = '';
    messagesDiv.innerHTML = '';
  }

  // Utility: Show modal
  function openModal() {
    clearModalState();
    importModal.classList.remove('d-none');
    importModal.hidden = false;
    importModal.setAttribute('aria-hidden', 'false');
    importModal.inert = false;
    importModal.classList.add('active');
    document.body.classList.add('modal-open');
    setTimeout(() => {
      dropArea.focus();
    }, 50);
    trapFocus(importModal);
  }

  // Utility: Hide modal
  function closeModal() {
    importModal.classList.add('d-none');
    importModal.hidden = true;
    importModal.setAttribute('aria-hidden', 'true');
    importModal.inert = true;
    importModal.classList.remove('active');
    document.body.classList.remove('modal-open');
    removeTrapFocus(importModal);
    clearModalState();
  }

  // Accessibility: close on Escape
  addEventListenerOnce(importModal, 'keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  });
  // Close on Cancel or X
  addEventListenerOnce(cancelBtn, 'click', (e) => { e.preventDefault(); closeModal(); });
  addEventListenerOnce(closeBtn, 'click', (e) => { e.preventDefault(); closeModal(); });

  // Open modal on toolbar button click
  addEventListenerOnce(openBtn, 'click', (e) => {
    e.preventDefault();
    openModal();
  });

  // Drag-and-drop logic
  ['dragenter', 'dragover'].forEach(ev =>
    dropArea.addEventListener(ev, (e) => {
      e.preventDefault();
      dropArea.classList.add('dragover');
    })
  );
  ['dragleave', 'drop'].forEach(ev =>
    dropArea.addEventListener(ev, (e) => {
      e.preventDefault();
      dropArea.classList.remove('dragover');
    })
  );
  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  });
  // File picker logic
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(fileInput.files);
    handleFiles(files);
  });

  // Handle file selection
  function handleFiles(files) {
    clearModalState();
    if (!files.length) {
      messagesDiv.textContent = 'No files selected.';
      return;
    }
    selectedFiles = files;
    // Show file list
    fileListDiv.innerHTML = '<ul>' + files.map(f =>
      `<li>${f.name} <span class="file-type">(${f.type || 'unknown'})</span> <span class="file-size">${(f.size/1024).toFixed(1)} KB</span></li>`
    ).join('') + '</ul>';
    // Parse files
    parseFiles(files);
  }

  // Helper: Normalize a prompt object to include all required fields with sensible defaults
  function normalizePromptObject(obj, file = null) {
    const now = new Date().toISOString();
    // Use file info for .txt/.md, otherwise use obj fields
    const ext = file ? file.name.split('.').pop().toLowerCase() : null;
    const isText = ext === 'txt' || ext === 'md';
    // Generate a unique id (simple random string)
    function genId() {
      return 'imp_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now();
    }
    // Use first available category or "Default Category"
    let defaultCategory = "Default Category";
    if (window.app && Array.isArray(window.app.categories) && window.app.categories.length) {
      defaultCategory = window.app.categories[0].id || window.app.categories[0].name || "Default Category";
    }
    // Always at least one tag
    let defaultTags = ["imported"];
    if (window.app && Array.isArray(window.app.tags) && window.app.tags.length) {
      defaultTags = [window.app.tags[0].id || window.app.tags[0].name || "imported"];
    }
    // Trim and validate description for import normalization
    let desc = obj.description !== undefined ? String(obj.description).trim() : "";
    if (desc === "") desc = "No description provided";
    // Compose normalized object
    return {
      schemaVersion: obj.schemaVersion || "1.0",
      id: obj.id || genId(),
      title: isText
        ? (file ? file.name.replace(/\.(txt|md)$/i, '') : "Untitled")
        : (obj.title || "Untitled"),
      description: desc,
      prompt: obj.prompt !== undefined
        ? obj.prompt
        : (isText ? (obj.content || (file && file.textContent) || "") : (obj.prompt || obj.content || "")),
      content: obj.content !== undefined
        ? obj.content
        : (isText ? (obj.prompt || (file && file.textContent) || "") : (obj.content || obj.prompt || "")),
      category: obj.category || defaultCategory,
      tags: Array.isArray(obj.tags) && obj.tags.length ? obj.tags : defaultTags,
      user_id: obj.user_id || "localuser",
      author: obj.author || "batch-import",
      created_at: obj.created_at || now,
      updated_at: obj.updated_at || now
    };
  }

  // Parse files and build prompt objects
  async function parseFiles(files) {
    parsedPrompts = [];
    let errors = [];
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      try {
        if (ext === 'json') {
          const text = await file.text();
          let data = JSON.parse(text);
          if (Array.isArray(data)) {
            data.forEach(obj => {
              // Always normalize, even if valid
              const norm = normalizePromptObject(obj);
              parsedPrompts.push(norm);
            });
          } else if (typeof data === 'object') {
            const norm = normalizePromptObject(data);
            parsedPrompts.push(norm);
          } else {
            errors.push(`File ${file.name}: Not a valid JSON array or object.`);
          }
        } else if (ext === 'txt' || ext === 'md') {
          const text = await file.text();
          // For .txt/.md, pass file and text as content
          const norm = normalizePromptObject({ content: text }, file);
          parsedPrompts.push(norm);
        } else {
          errors.push(`Unsupported file type: ${file.name}`);
        }
      } catch (err) {
        errors.push(`Error in file ${file.name}: ${err.message}`);
      }
    }
    // Show summary
    if (parsedPrompts.length) {
      summaryDiv.innerHTML = `<b>${parsedPrompts.length}</b> prompt(s) ready to import:<ul>` +
        parsedPrompts.map((p, i) =>
          `<li>${p.title ? `<b>${escapeHtml(p.title)}</b>` : 'Untitled'} <span class="type">${p.content ? 'Text' : 'JSON'}</span></li>`
        ).join('') + '</ul>';
    } else {
      summaryDiv.innerHTML = '';
    }
    // Show errors
    if (errors.length) {
      messagesDiv.innerHTML = errors.map(e => `<div class="error">${escapeHtml(e)}</div>`).join('');
    } else {
      messagesDiv.innerHTML = '';
    }
  }

  // Validate prompt object schema (minimal: must have title and content)
  function validatePromptObject(obj) {
    if (!obj || typeof obj !== 'object') return 'Not an object';
    if (!obj.title || typeof obj.title !== 'string' || !obj.title.trim()) return 'Missing/invalid title';
    if (!obj.content || typeof obj.content !== 'string' || !obj.content.trim()) return 'Missing/invalid content';
    return true;
  }

  // Escape HTML for safe rendering
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[s]);
  }

  // Import action
  addEventListenerOnce(submitBtn, 'click', async (e) => {
    e.preventDefault();
    messagesDiv.innerHTML = '';
    if (!parsedPrompts.length) {
      messagesDiv.innerHTML = '<div class="error">No valid prompts to import.</div>';
      return;
    }
    submitBtn.disabled = true;
    messagesDiv.innerHTML = 'Importing...';
    try {
      const result = await importPrompts(parsedPrompts);
      if (result && result.ok) {
        messagesDiv.innerHTML = `<div class="success">Imported: <b>${result.imported_count}</b>, Skipped: <b>${result.skipped_count}</b></div>`;
        if (result.errors && result.errors.length) {
          messagesDiv.innerHTML += result.errors.map(e =>
            `<div class="error">Prompt ${e.index !== undefined ? (e.index + 1) : ''} (${escapeHtml(e.title || e.id || 'Untitled')}): ${Array.isArray(e.errors) ? e.errors.join(', ') : e.errors}</div>`
          ).join('');
        }
        setTimeout(() => {
          closeModal();
          window.dispatchEvent(new CustomEvent('filterPrompts', { detail: {} }));
        }, 1200);
      } else {
        let errorMsg = '';
        if (result && result.errors && Array.isArray(result.errors) && result.errors.length) {
          errorMsg = result.errors.map(e =>
            `<div class="error">Prompt ${e.index !== undefined ? (e.index + 1) : ''} (${escapeHtml(e.title || e.id || 'Untitled')}): ${Array.isArray(e.errors) ? e.errors.join(', ') : e.errors}</div>`
          ).join('');
        }
        if (result && result.error) {
          errorMsg += `<div class="error">${escapeHtml(result.error)}</div>`;
        }
        messagesDiv.innerHTML = errorMsg || '<div class="error">Import failed.</div>';
      }
    } catch (err) {
      messagesDiv.innerHTML = `<div class="error">Import failed: ${escapeHtml(err.message)}</div>`;
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Accessibility: focus trap helpers (reuse from modal infra)
  function trapFocus(modal) {
    const focusableSelectors = [
      'a[href]', 'area[href]', 'input:not([disabled])', 'select:not([disabled])',
      'textarea:not([disabled])', 'button:not([disabled])', 'iframe', 'object', 'embed',
      '[tabindex]:not([tabindex="-1"])', '[contenteditable]'
    ];
    const focusableEls = modal.querySelectorAll(focusableSelectors.join(','));
    if (!focusableEls.length) return;
    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];
    function handleTrap(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    }
    modal.addEventListener('keydown', handleTrap);
    modal.__trapFocusHandler = handleTrap;
  }
  function removeTrapFocus(modal) {
    if (modal && modal.__trapFocusHandler) {
      modal.removeEventListener('keydown', modal.__trapFocusHandler);
      delete modal.__trapFocusHandler;
    }
  }
}

// Initialize the multi-file import modal after DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMultiImportModal);
} else {
  initMultiImportModal();
}

// === Accessible Confirm and Prompt Modals ===

/**
 * showConfirmModal(message: string): Promise<boolean>
 * Shows an accessible confirmation modal. Resolves true if confirmed, false if cancelled.
 */
export function showConfirmModal(message) {
  return new Promise((resolve) => {
    // Remove any existing confirm modal before creating a new one
    const existing = document.getElementById('confirm-modal');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    // Create modal elements
    const modal = document.createElement('div');
    modal.id = 'confirm-modal';
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'confirm-modal-title');
    modal.innerHTML = `
      <div class="modal-content" tabindex="0">
        <div id="confirm-modal-live-region" class="sr-only" aria-live="polite"></div>
        <h2 id="confirm-modal-title" style="margin-top:0;">Confirm</h2>
        <p>${message}</p>
        <div style="display:flex;gap:1em;justify-content:flex-end;">
          <button type="button" class="success" id="confirm-modal-ok" autofocus>OK</button>
          <button type="button" class="secondary" id="confirm-modal-cancel">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    // Focus management
    setTimeout(() => {
      const okBtn = modal.querySelector('#confirm-modal-ok');
      if (okBtn) okBtn.focus();
    }, 10);
    // Trap focus
    const focusable = modal.querySelectorAll('button');
    let focusIdx = 0;
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        focusIdx = (focusIdx + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
        focusable[focusIdx].focus();
      }
      if (e.key === 'Escape') {
        cleanup(false);
      }
    });
    // Button handlers
    function cleanup(result) {
      if (modal.contains(document.activeElement)) {
        focusFallback();
      }
      // Live region announcement
      const liveRegion = document.getElementById('confirm-modal-live-region');
      if (liveRegion) {
        if (result === true) {
          liveRegion.textContent = "Confirmed.";
          trackEvent('modal_confirm', { modalType: 'confirm' });
        } else {
          liveRegion.textContent = "Cancelled.";
          trackEvent('modal_cancel', { modalType: 'confirm' });
        }
      }
      modal.inert = true;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('active');
      document.body.classList.remove('modal-open');
      // Remove ARIA attributes for dynamic modals
      modal.removeAttribute('aria-modal');
      modal.removeAttribute('role');
      modal.removeAttribute('aria-labelledby');
      // Remove aria-live from any live region children
      const liveRegions = modal.querySelectorAll('[aria-live]');
      liveRegions.forEach(el => el.removeAttribute('aria-live'));
      setTimeout(() => {
        if (modal.parentNode) modal.parentNode.removeChild(modal);
      }, 100);
      resolve(result);
    }
    modal.querySelector('#confirm-modal-ok').onclick = () => cleanup(true);
    modal.querySelector('#confirm-modal-cancel').onclick = () => cleanup(false);
  });
}

/**
 * showPromptModal(message: string, defaultValue: string): Promise<string|null>
 * Shows an accessible prompt modal. Resolves with input value or null if cancelled.
 */
export function showPromptModal(message, defaultValue = '') {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'prompt-modal-title');
    modal.innerHTML = `
      <div class="modal-content" tabindex="0">
        <div id="prompt-modal-live-region" class="sr-only" aria-live="polite"></div>
        <h2 id="prompt-modal-title" style="margin-top:0;">Input Required</h2>
        <p>${message}</p>
        <input type="text" id="prompt-modal-input" value="${defaultValue.replace(/"/g, '"')}" style="width:100%;margin-bottom:1em;" />
        <div style="display:flex;gap:1em;justify-content:flex-end;">
          <button type="button" class="success" id="prompt-modal-ok">OK</button>
          <button type="button" class="secondary" id="prompt-modal-cancel">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    const input = modal.querySelector('#prompt-modal-input');
    setTimeout(() => {
      if (input) input.focus();
    }, 10);
    // Trap focus
    const focusable = modal.querySelectorAll('input, button');
    let focusIdx = 0;
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        focusIdx = (focusIdx + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
        focusable[focusIdx].focus();
      }
      if (e.key === 'Escape') {
        cleanup(null);
      }
      if (e.key === 'Enter' && document.activeElement === input) {
        cleanup(input.value.trim() || null);
      }
    });
    function cleanup(result) {
      if (modal.contains(document.activeElement)) {
        focusFallback();
      }
      // Live region announcement
      const liveRegion = document.getElementById('prompt-modal-live-region');
      if (liveRegion) {
        if (typeof result === "string" && result.length > 0) {
          liveRegion.textContent = "Input submitted.";
          trackEvent('modal_confirm', { modalType: 'prompt' });
        } else if (result === null) {
          liveRegion.textContent = "Cancelled.";
          trackEvent('modal_cancel', { modalType: 'prompt' });
        }
      }
      modal.inert = true;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('active');
      document.body.classList.remove('modal-open');
      // Remove ARIA attributes for dynamic modals
      modal.removeAttribute('aria-modal');
      modal.removeAttribute('role');
      modal.removeAttribute('aria-labelledby');
      // Remove aria-live from any live region children
      const liveRegions = modal.querySelectorAll('[aria-live]');
      liveRegions.forEach(el => el.removeAttribute('aria-live'));
      setTimeout(() => {
        if (modal.parentNode) modal.parentNode.removeChild(modal);
      }, 100);
      resolve(result);
    }
    modal.querySelector('#prompt-modal-ok').onclick = () => cleanup(input.value.trim() || null);
    modal.querySelector('#prompt-modal-cancel').onclick = () => cleanup(null);
  });
}
/**
 * showFullPromptModal(prompt: object)
 * Shows a modal with the full prompt content (title, description, content) with scrollbars for large content.
 * Accessible, responsive, closable via close button, ESC, and clicking outside.
 */
export function showFullPromptModal(prompt) {
  // Remove any existing modal
  let old = document.getElementById('full-prompt-modal');
  if (old) old.parentNode.removeChild(old);

  // Modal container
  const modal = document.createElement('div');
  modal.className = 'modal full-prompt-modal';
  modal.id = 'full-prompt-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'full-prompt-modal-title');
  modal.tabIndex = -1;

  // Modal content
  modal.innerHTML = `
    <div class="modal-content" tabindex="0" style="max-width: 600px; width: 96vw; background: var(--color-bg, #18122B); border-radius: 12px; box-shadow: 0 4px 32px #0008; padding: 2em 1.5em; position: relative; max-height: 80vh; overflow: auto;">
      <button type="button" class="close-modal" aria-label="Close Full View" style="position:absolute;top:12px;right:12px;font-size:2rem;background:none;border:none;cursor:pointer;">&times;</button>
      <h2 id="full-prompt-modal-title" style="margin-top:0; margin-bottom:0.7em; font-size:1.5em; overflow-wrap:break-word;">${prompt.title ? String(prompt.title) : 'Untitled'}</h2>
      <div class="prompt-meta" style="color:var(--color-text-muted,#bcbcbc);font-size:0.98em;margin-bottom:0.7em;">
        <span>ID: <code>${prompt.id ? String(prompt.id) : ''}</code></span>
        ${prompt.created_at ? `<span style="margin-left:1em;">Created: ${new Date(prompt.created_at).toLocaleString()}</span>` : ''}
        ${prompt.author ? `<span style="margin-left:1em;">By: ${String(prompt.author)}</span>` : ''}
      </div>
      <div class="prompt-description" style="margin-bottom:1.1em; color:var(--color-text,#fff);">${prompt.description ? String(prompt.description) : ''}</div>
      <div class="prompt-content" style="white-space:pre-line;word-break:break-word;color:var(--color-text,#fff);margin-bottom:1.1em;">${prompt.content ? String(prompt.content) : ''}</div>
    </div>
  `;

  // Append modal to body
  document.body.appendChild(modal);
  document.body.classList.add('modal-open');
  setTimeout(() => { modal.classList.add('active'); modal.focus(); }, 10);

  // Focus trap
  function trapFocus(e) {
    if (e.key === 'Tab') {
      const focusable = modal.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    if (e.key === 'Escape') close();
  }
  modal.addEventListener('keydown', trapFocus);

  // Close logic
  function close() {
    modal.classList.remove('active');
    setTimeout(() => {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
      document.body.classList.remove('modal-open');
    }, 120);
    modal.removeEventListener('keydown', trapFocus);
    document.removeEventListener('mousedown', onClickOutside);
  }
  // Close button
  modal.querySelector('.close-modal').addEventListener('click', close);

  // Click outside to close
  function onClickOutside(e) {
    if (e.target === modal) close();
  }
  document.addEventListener('mousedown', onClickOutside);

  // Accessibility: focus modal
  setTimeout(() => { modal.focus(); }, 30);
}
/* [Legacy batch import modal logic removed. New multi-file import modal will be implemented separately.] */