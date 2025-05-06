console.log("[DEBUG] modals.js loaded (very top, 2025-05-04 19:12)");
// ui/modals.js - KISS Modal management (2025 Refactor with Full Logging)
console.log("[DEBUG] public_html/js/ui/modals.js loaded and executing");

import { createPrompt, updatePrompt, deletePrompt } from '../api/prompts.js';
import { renderCommentsResults } from './commentsResults.js';
import { renderPromptsWithScroll } from './promptList.js';

export function initModals() {
  console.log("initModals: called");
  window.__modalsInit = true;
  const promptDetailModal = document.getElementById('prompt-detail-modal');
  const promptDetailBody = document.getElementById('prompt-detail-body');
  const crudModal = document.getElementById('crud-modal');
  const crudModalBody = document.getElementById('crud-modal-body');
  const closeModalBtns = document.querySelectorAll('.close-modal');

  function openModal(modal) {
    console.log("openModal: called", modal);
    if (modal) {
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('active');
      modal.focus();
      document.body.classList.add('modal-open');
    } else {
      console.warn("openModal: modal is null");
    }
  }

  function closeModal(modal) {
    console.log("closeModal: called", modal);
    if (modal) {
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('active');
      document.body.classList.remove('modal-open');
    } else {
      console.warn("closeModal: modal is null");
    }
  }

  function renderCrudForm({ mode = 'add', prompt = {} } = {}) {
    console.log("renderCrudForm: called", mode, prompt);
    if (!crudModalBody) {
      console.warn("renderCrudForm: crudModalBody is null");
      return;
    }
    // [DEBUG] Attach a MutationObserver to log when the form is inserted
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          const form = document.getElementById('prompt-crud-form');
          if (form) {
            console.log("[DEBUG] MutationObserver: prompt-crud-form inserted into DOM:", form);
          }
        }
      }
    });
    observer.observe(crudModalBody, { childList: true, subtree: true });

    crudModalBody.innerHTML = `
      <form id="prompt-crud-form">
        <h2>${mode === 'edit' ? 'Edit' : 'Add'} Prompt</h2>
        <label>
          Title
          <input name="title" type="text" value="${prompt.title || ''}" required data-testid="prompt-title-input" />
        </label>
        <label>
          Content
          <textarea name="content" rows="6" required data-testid="prompt-content-input">${prompt.content || ''}</textarea>
        </label>
        <label>
          Description
          <textarea name="description" rows="3">${prompt.description || ''}</textarea>
        </label>
        <label>
          Category
          <input name="category" type="text" value="${prompt.category || ''}" />
        </label>
        <label>
          Tags (comma separated)
          <input name="tags" type="text" value="${(prompt.tags || []).join(', ')}" />
        </label>
        <div style="margin-top:1em;">
          <button type="submit" data-testid="save-prompt-btn">${mode === 'edit' ? 'Update' : 'Create'}</button>
          ${mode === 'edit' ? '<button type="button" id="delete-prompt-btn" style="margin-left:1em;">Delete</button>' : ''}
        </div>
      </form>
    `;

    const form = document.getElementById('prompt-crud-form');
    console.log("[DEBUG] After renderCrudForm, form element is:", form);
    if (form) {
      console.log("[DEBUG] Attaching onsubmit handler to form:", form);
      form.onsubmit = async (e) => {
        console.log("[DEBUG] form.onsubmit handler called for prompt CRUD");
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        data.tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        let result = undefined;
        try {
          if (mode === 'edit') {
            console.log("CRUD form submit: updatePrompt", prompt.id, data);
            await updatePrompt(prompt.id, data);
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Prompt updated', type: 'success' } }));
          } else {
            console.log("CRUD form submit: createPrompt", data);
            result = await createPrompt(data);
            console.log("[DIAG] Prompt created in backend, result:", result);
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Prompt created', type: 'success' } }));
          }
          closeModal(crudModal);
          // [DEBUG] result value before setTimeout
          console.log("[DEBUG] Before setTimeout, result is:", result);
          // Always re-fetch and re-render prompt list after create, and scroll to new prompt if possible
          setTimeout(() => {
            console.log("[DEBUG] In setTimeout, result is:", result);
            if (result && result.prompt && result.prompt.id) {
              renderPromptsWithScroll(result.prompt.id);
            } else {
              window.dispatchEvent(new CustomEvent('filterPrompts', { detail: {} }));
            }
          }, 100);
        } catch (err) {
          window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Error saving prompt', type: 'error' } }));
          console.error('CRUD Modal: Failed to save prompt', err);
        }
      };
    } else {
      console.warn("renderCrudForm: form not found");
    }

    // Delete button
    const deleteBtn = document.getElementById('delete-prompt-btn');
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        console.log("Delete Prompt button clicked", prompt.id);
        if (confirm('Delete this prompt?')) {
          try {
            await deletePrompt(prompt.id);
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Prompt deleted', type: 'success' } }));
            closeModal(crudModal);
            window.dispatchEvent(new CustomEvent('filterPrompts', { detail: {} }));
          } catch (err) {
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Error deleting prompt', type: 'error' } }));
            console.error('CRUD Modal: Failed to delete prompt', err);
          }
        } else {
          console.log("Delete Prompt cancelled by user");
        }
      };
    }
  }

  // Close modal buttons
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = btn.closest('.modal');
      console.log("Close modal button clicked", modal);
      closeModal(modal);
    });
  });

  // Listen for custom events to open modals
  window.addEventListener('openPromptDetailModal', (e) => {
    console.log("openPromptDetailModal event received", e.detail);
    openModal(promptDetailModal);
    if (e && e.detail && e.detail.promptId && promptDetailBody) {
      renderCommentsResults(e.detail.promptId, promptDetailBody);
    } else if (promptDetailBody) {
      promptDetailBody.innerHTML = '<div>No prompt selected.</div>';
    }
  });

  window.addEventListener('openCrudModal', (e) => {
    window.__crudModalEventReceived = true;
    console.log("openCrudModal event received", e.detail);
    openModal(crudModal);
    renderCrudForm((e && e.detail) || {});
    // Diagnostic: check if input is present after rendering
    setTimeout(() => {
      const input = document.querySelector('[data-testid="prompt-title-input"]');
      if (input) {
        window.__promptTitleInputPresent = true;
        console.log("DIAGNOSTIC: prompt-title-input is present and visible:", !input.hidden, input.offsetParent !== null);
      } else {
        window.__promptTitleInputPresent = false;
        console.error("DIAGNOSTIC: prompt-title-input NOT FOUND in DOM after renderCrudForm");
      }
    }, 100);
  });

  // Accessibility: close on Escape
  [promptDetailModal, crudModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          console.log("Escape key pressed, closing modal", modal);
          closeModal(modal);
        }
      });
    }
  });
}