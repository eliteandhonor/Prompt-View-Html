// TEST INJECTION - promptList.js
// ui/promptList.js - KISS Prompt List UI (2025 Refactor with Full Logging)

import { fetchPrompts, createPrompt, deletePrompt } from '../api/prompts.js';
import { renderPromptBlock } from './renderPromptBlock.js';
import { renderCommentsResults } from './commentsResults.js';
import { showConfirmModal } from './modals.js';

export function initPromptList(params = {}) {
  // Debug mode flag for logging
  const DEBUG_MODE = window.DEBUG_MODE || false;
  function debugLog(...args) {
    if (DEBUG_MODE) console.debug('[PromptList]', ...args);
  }
  debugLog("initPromptList: START", { params });
  let currentParams = { ...params };

  // --- Global Prompt Card Action Listeners (Best Practice Architectural Fix) ---
  // Handles prompt:edit and prompt:delete globally for accessible, robust CRUD

  // Prevent duplicate listeners in hot reload/dev
  if (!window.__promptCrudListenersAdded) {
    window.addEventListener('prompt:edit', (e) => {
      console.log('[promptList.js] [LOG] prompt:edit event fired', e);
      debugLog('[LOG] prompt:edit event fired', e);
      const prompt = e?.detail?.prompt;
      console.log('[promptList.js] [LOG] prompt:edit received prompt:', prompt);
      debugLog('[LOG] prompt:edit received prompt:', prompt);
      if (!prompt) {
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Prompt data missing for edit.', type: 'error' } }));
        return;
      }
      // Open CRUD modal in edit mode with prompt data
      console.log('[promptList.js] [LOG] Dispatching openCrudModal for edit', prompt);
      debugLog('[LOG] Dispatching openCrudModal for edit', prompt);
      window.dispatchEvent(new CustomEvent('openCrudModal', { detail: { mode: 'edit', prompt } }));
    });

    window.addEventListener('prompt:delete', async (e) => {
      console.log('[promptList.js] [LOG] prompt:delete event fired', e);
      debugLog('[LOG] prompt:delete event fired', e);
      const promptId = e?.detail?.promptId;
      const prompt = e?.detail?.prompt;
      console.log('[promptList.js] [LOG] prompt:delete received promptId:', promptId, 'prompt:', prompt);
      debugLog('[LOG] prompt:delete received promptId:', promptId, 'prompt:', prompt);
      if (!promptId) {
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Prompt ID missing for delete.', type: 'error' } }));
        return;
      }
      // Accessible confirmation modal
      console.log('[promptList.js] [LOG] Showing confirm modal for delete', promptId, prompt);
      debugLog('[LOG] Showing confirm modal for delete', promptId, prompt);
      const confirmed = await showConfirmModal(
        `Are you sure you want to delete the prompt "${prompt?.title || promptId}"? This action cannot be undone.`
      );
      console.log('[promptList.js] [LOG] Delete confirmation result:', confirmed);
      debugLog('[LOG] Delete confirmation result:', confirmed);
      if (!confirmed) {
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Prompt deletion cancelled.', type: 'info' } }));
        return;
      }
      try {
        console.log('[promptList.js] [LOG] Calling deletePrompt API for', promptId);
        debugLog('[LOG] Calling deletePrompt API for', promptId);
        await deletePrompt(promptId);
        console.log('[promptList.js] [LOG] Prompt deleted, dispatching UI update');
        debugLog('[LOG] Prompt deleted, dispatching UI update');
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Prompt deleted.', type: 'success' } }));
        // Refresh prompt list
        window.dispatchEvent(new CustomEvent('filterPrompts', { detail: {} }));
        // Accessibility: focus main content after deletion
        setTimeout(() => {
          const main = document.getElementById('main-content') || document.body;
          if (main && typeof main.focus === 'function') main.focus();
          console.log('[promptList.js] [LOG] Focused main content after delete');
          debugLog('[LOG] Focused main content after delete');
        }, 150);
      } catch (err) {
        console.log('[promptList.js] [LOG] Error deleting prompt:', err);
        debugLog('[LOG] Error deleting prompt:', err);
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Error deleting prompt.', type: 'error' } }));
      }
    });
    window.__promptCrudListenersAdded = true;
  }
  // --- End Global Prompt Card Action Listeners ---

  // --- Global Result Delete Listener (KISS, pure safety) ---
  if (!window.__resultDeleteListenerAdded) {
    window.addEventListener('result:delete', async (e) => {
      const { promptId, resultId, result, prompt } = e.detail || {};
      debugLog('[LOG] result:delete event fired', e.detail);
      if (!promptId || typeof resultId === 'undefined') {
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Missing prompt or result ID for delete.', type: 'error' } }));
        return;
      }
      try {
        // Call backend to delete result (if API exists)
        if (window.deleteResult) {
          await window.deleteResult(resultId);
        }
        // Remove result from prompt.results (pure safety: deep clone)
        if (prompt && Array.isArray(prompt.results)) {
          const idx = prompt.results.findIndex(r => (r.id || r) === resultId);
          if (idx !== -1) {
            prompt.results = [
              ...prompt.results.slice(0, idx),
              ...prompt.results.slice(idx + 1)
            ];
            debugLog('[LOG] Result removed from prompt.results', { promptId, resultId, idx });
          }
        }
        // Re-render prompt list to reflect change
        window.dispatchEvent(new CustomEvent('filterPrompts', { detail: {} }));
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Result deleted.', type: 'success' } }));
      } catch (err) {
        debugLog('[LOG] Error deleting result', err);
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Error deleting result.', type: 'error' } }));
      }
    });
    window.__resultDeleteListenerAdded = true;
  }

  function showModal(modalEl) {
    debugLog("showModal: START", { modalEl });
    if (!modalEl) {
      debugLog("showModal: modalEl is null");
      debugLog("showModal: END (modalEl null)");
      return;
    }
    modalEl.hidden = false;
    modalEl.setAttribute('aria-hidden', 'false');
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.classList.add('active');
    modalEl.focus();
    document.body.classList.add('modal-open');
    debugLog("showModal: END", { modalEl });
  }

  function hideModal(modalEl) {
    debugLog("hideModal: START", { modalEl });
    if (!modalEl) {
      debugLog("hideModal: modalEl is null");
      debugLog("hideModal: END (modalEl null)");
      return;
    }
    modalEl.hidden = true;
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.classList.remove('active');
    document.body.classList.remove('modal-open');
    debugLog("hideModal: END", { modalEl });
  }

  // Modularized control listeners for maintainability
  function attachViewToggleListeners() {
    debugLog("attachViewToggleListeners: START");

    // --- Sticky Toolbar: Best Practice Check ---
    // (No code change needed if #prompt-toolbar is at root and no parent has overflow: auto/hidden)

    // --- Prompt List View Mode: Robust Initialization ---
    const promptList = document.getElementById('prompt-list');
    const promptListActions = document.getElementById('prompt-list-actions');
    // Ensure toggle buttons exist
    let listViewBtn = document.getElementById('list-view-btn');
    let gridViewBtn = document.getElementById('grid-view-btn');
    if (promptListActions && !listViewBtn && !gridViewBtn) {
      const viewToggleContainer = document.createElement('div');
      viewToggleContainer.style.display = 'flex';
      viewToggleContainer.style.gap = '8px';
      viewToggleContainer.style.justifyContent = 'center';
      viewToggleContainer.style.marginBottom = '12px';
      viewToggleContainer.innerHTML = `
        <button id="list-view-btn" data-testid="list-view-btn" type="button" class="utility" aria-label="List View" tabindex="0" role="button">List View</button>
        <button id="grid-view-btn" data-testid="grid-view-btn" type="button" class="utility" aria-label="Grid View" tabindex="0" role="button">Grid View</button>
      `;
      promptListActions.prepend(viewToggleContainer);
      listViewBtn = document.getElementById('list-view-btn');
      gridViewBtn = document.getElementById('grid-view-btn');
    }

    // Set default view mode if not present
    let savedView = localStorage.getItem('promptViewMode');
    if (!savedView) {
      savedView = 'grid';
      localStorage.setItem('promptViewMode', savedView);
    }

    // Always set the correct class on #prompt-list before first render
    if (promptList) {
      promptList.classList.remove('prompt-list', 'prompt-grid');
      if (savedView === 'list') {
        promptList.classList.add('prompt-list');
      } else {
        promptList.classList.add('prompt-grid');
      }
    }

    // Set toggle button active states
    if (listViewBtn && gridViewBtn) {
      if (savedView === 'list') {
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
      } else {
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
      }
      listViewBtn.onclick = () => {
        try {
          debugLog("List View button clicked");
          if (promptList) {
            promptList.classList.remove('prompt-grid');
            promptList.classList.add('prompt-list');
          }
          listViewBtn.classList.add('active');
          gridViewBtn.classList.remove('active');
          localStorage.setItem('promptViewMode', 'list');
          if (typeof renderPrompts === 'function') renderPrompts();
        } catch (err) {
          debugLog("Error switching to list view:", err);
        }
      };
      gridViewBtn.onclick = () => {
        try {
          debugLog("Grid View button clicked");
          if (promptList) {
            promptList.classList.remove('prompt-list');
            promptList.classList.add('prompt-grid');
          }
          gridViewBtn.classList.add('active');
          listViewBtn.classList.remove('active');
          localStorage.setItem('promptViewMode', 'grid');
          if (typeof renderPrompts === 'function') renderPrompts();
        } catch (err) {
          debugLog("Error switching to grid view:", err);
        }
      };
    }
  }

  function attachAddPromptListener() {
    debugLog("attachAddPromptListener: START");
    const addPromptBtn = document.getElementById('add-prompt-btn');
    if (addPromptBtn) {
      addPromptBtn.onclick = () => {
        try {
          debugLog("Add Prompt button clicked");
          window.dispatchEvent(new CustomEvent('openCrudModal', { detail: { mode: 'add' } }));
        } catch (err) {
          debugLog("Error handling Add Prompt button:", err);
        }
      };
    }
  }

  function attachBatchImportListener() {
    debugLog("attachBatchImportListener: START");
    const batchImportBtn = document.getElementById('batch-import-btn');
    if (batchImportBtn) {
      batchImportBtn.onclick = () => {
        debugLog("Batch Import button clicked");
        window.dispatchEvent(new CustomEvent('openBatchImportModal'));
      };
    }
  }

  function attachImportPromptsListener() {
    debugLog("attachImportPromptsListener: START");
    const importBtn = document.getElementById('import-prompts-btn');
    const importInput = document.getElementById('import-file-input');
    if (importBtn && importInput) {
      importBtn.onclick = () => {
        debugLog("Import Prompts button clicked");
        importInput.click();
      };
      importInput.onchange = async (e) => {
        debugLog("Import file input changed", importInput.files);
        const files = Array.from(importInput.files || []);
        if (!files.length) {
          debugLog("No files selected for import");
          window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'No files selected.', type: 'error' } }));
          return;
        }

        function parsePromptFile(file, text) {
          debugLog("parsePromptFile: called", file.name);
          const lines = text.split(/\r?\n/);
          let title = lines[0].trim();
          let content = lines.slice(1).join('\n').trim();
          if (!title) title = file.name.replace(/\.[^/.]+$/, '');
          if (!content) content = '';
          return {
            title,
            content,
            description: '',
            category: '',
            tags: []
          };
        }

        try {
          const promptObjs = [];
          for (const file of files) {
            const text = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () => reject(reader.error);
              reader.readAsText(file);
            });
            const prompt = parsePromptFile(file, text);
            if (!prompt.title || !prompt.content) {
              debugLog(`File "${file.name}" missing title or content`);
              window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `File "${file.name}" is missing a title or content.`, type: 'error' } }));
              continue;
            }
            promptObjs.push(prompt);
          }
          if (!promptObjs.length) {
            debugLog("No valid prompts found in selected files");
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'No valid prompts found in selected files.', type: 'error' } }));
            importInput.value = '';
            return;
          }

          // Show modal preview for confirmation
          const crudModal = document.getElementById('crud-modal');
          const crudModalBody = document.getElementById('crud-modal-body');
          if (!crudModal || !crudModalBody) {
            debugLog("Import modal not found");
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Import modal not found.', type: 'error' } }));
            importInput.value = '';
            return;
          }
          crudModalBody.innerHTML = `
            <div>
              <h2>Import Prompts</h2>
              <p>Ready to import <strong>${promptObjs.length}</strong> prompt(s):</p>
              <ul style="max-height:200px;overflow:auto;">
                ${promptObjs.map(p => `<li><strong>${p.title}</strong><br><pre style="white-space:pre-wrap;">${p.content.slice(0, 200)}${p.content.length > 200 ? '...' : ''}</pre></li>`).join('')}
              </ul>
              <div style="margin-top:1em;">
                <button id="confirm-import-btn" data-testid="confirm-import-btn">Import</button>
                <button id="cancel-import-btn" style="margin-left:1em;">Cancel</button>
              </div>
              <div id="import-progress" style="margin-top:1em;"></div>
            </div>
          `;
          showModal(crudModal);

          document.getElementById('confirm-import-btn').onclick = async () => {
            debugLog("Confirm Import button clicked");
            const progressDiv = document.getElementById('import-progress');
            let successCount = 0;
            let failCount = 0;
            progressDiv.textContent = 'Importing...';
            for (const [i, prompt] of promptObjs.entries()) {
              try {
                await createPrompt(prompt);
                successCount++;
                progressDiv.textContent = `Imported ${successCount}/${promptObjs.length}`;
                debugLog(`Prompt imported: ${prompt.title}`);
              } catch (err) {
                failCount++;
                progressDiv.textContent = `Imported ${successCount}/${promptObjs.length}, failed ${failCount}`;
                debugLog("Failed to import prompt", prompt, err);
              }
            }
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `Imported ${successCount} prompt(s).${failCount ? ' ' + failCount + ' failed.' : ''}`, type: failCount ? 'warning' : 'success' } }));
            hideModal(crudModal);
            window.dispatchEvent(new CustomEvent('filterPrompts', { detail: {} })); // Refresh list
            importInput.value = '';
          };

          document.getElementById('cancel-import-btn').onclick = () => {
            debugLog("Cancel Import button clicked");
            hideModal(crudModal);
            importInput.value = '';
          };
        } catch (err) {
          debugLog("Error reading files for import", err);
          window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Error reading files.', type: 'error' } }));
          importInput.value = '';
        }
      };
    }
  }

  // Main function to attach all control listeners
  function attachPromptListControlListeners() {
    debugLog("attachPromptListControlListeners: START");
    attachViewToggleListeners();
    attachAddPromptListener();
    attachBatchImportListener();
    attachImportPromptsListener();
  }

  // Attach listeners on init and whenever section is shown
  attachPromptListControlListeners();

  // Listen for section visibility changes and re-attach listeners
  const promptListSection = document.getElementById('prompt-list-section');
  if (promptListSection) {
    let listenersAttached = false;
    const observer = new MutationObserver(() => {
      if (promptListSection.style.display !== 'none' && !listenersAttached) {
        debugLog("prompt-list-section is now visible, attaching listeners (idempotent)");
        attachPromptListControlListeners();
        listenersAttached = true;
      } else if (promptListSection.style.display === 'none') {
        listenersAttached = false;
      }
    });
    observer.observe(promptListSection, { attributes: true, attributeFilter: ['style'] });
  }

  // Listen for filterPrompts event (myPrompts, category, tag)
  window.addEventListener('filterPrompts', (e) => {
    debugLog("[DIAG] filterPrompts event received", e.detail, "at", new Date().toISOString());
    if (e.detail) {
      if ('myPrompts' in e.detail) {
        if (e.detail.myPrompts) {
          currentParams.userId = 'me';
        } else {
          delete currentParams.userId;
        }
      }
      if ('category' in e.detail) {
        if (e.detail.category) {
          currentParams.category = e.detail.category;
        } else {
          delete currentParams.category;
        }
      }
      if ('tag' in e.detail) {
        if (e.detail.tag) {
          currentParams.tag = e.detail.tag;
        } else {
          delete currentParams.tag;
        }
      }
    }
    debugLog("[DIAG] Calling renderPrompts() after filterPrompts at", new Date().toISOString());
    renderPrompts();
  });

  function renderPrompts() {
    debugLog("renderPrompts: START", { currentParams });
    const promptList = document.getElementById('prompt-list');
    const loading = document.getElementById('prompt-list-loading');
    if (loading) loading.classList.remove('hidden');
    if (promptList) {
      promptList.innerHTML = '';
      // Log current view mode and parent class for diagnosis
      const viewMode = promptList.classList.contains('prompt-list') ? 'list' : (promptList.classList.contains('prompt-grid') ? 'grid' : 'unknown');
      debugLog("[DIAG] renderPrompts: promptList classList", promptList.classList.value, "viewMode", viewMode);
      // Fetch prompts, categories, and tags in parallel
      Promise.all([
        fetchPrompts(currentParams),
        import('../api/categories.js').then(mod => mod.fetchCategories()),
        import('../api/tags.js').then(mod => mod.fetchTags())
      ])
      .then(([prompts, categories, tags]) => {
        if (loading) loading.classList.add('hidden');
        if (Array.isArray(prompts) && prompts.length > 0) {
          debugLog("renderPrompts: prompts to render", { prompts, categories, tags });
          // Keep global app state in sync for modal lookups
          if (window.app) {
            window.app.allPrompts = prompts;
            debugLog("renderPrompts: updated window.app.allPrompts");
          } else {
            window.app = { allPrompts: prompts };
            debugLog("renderPrompts: created window.app with allPrompts");
          }
          promptList.innerHTML = '';
          prompts.forEach(prompt => {
            debugLog("[DIAG] renderPrompts: rendering prompt", { prompt, viewMode });
            const block = renderPromptBlock(prompt, categories, tags, { debug: true, viewMode });

            // --- List View Spacing & Field Reduction ---
            if (viewMode === 'list') {
              block.style.marginBottom = '24px';
              block.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
              block.style.borderRadius = '12px';
              block.style.background = 'rgba(255,255,255,0.01)';
              // Hide results/comments unless expanded
              const commentsResultsContainer = document.createElement('div');
              commentsResultsContainer.className = 'comments-results-container';
              commentsResultsContainer.style.display = 'none';
              commentsResultsContainer.setAttribute('role', 'region');
              commentsResultsContainer.setAttribute('aria-label', 'Comments and Results');
              block.addEventListener('click', () => {
                commentsResultsContainer.style.display =
                  commentsResultsContainer.style.display === 'none' ? '' : 'none';
              });
              renderCommentsResults(prompt.id, commentsResultsContainer);
              block.appendChild(commentsResultsContainer);
            } else {
              // Grid view: show comments/results as before
              const commentsResultsContainer = document.createElement('div');
              commentsResultsContainer.className = 'comments-results-container';
              commentsResultsContainer.setAttribute('role', 'region');
              commentsResultsContainer.setAttribute('aria-label', 'Comments and Results');
              renderCommentsResults(prompt.id, commentsResultsContainer);
              block.appendChild(commentsResultsContainer);
            }
            promptList.appendChild(block);
          });
          } else {
            // Determine context for empty state
            let contextMsg = '';
            const searchInput = document.querySelector('[data-testid="prompt-search-input"]');
            if (searchInput && searchInput.value) {
              contextMsg = ` for: <strong>${searchInput.value}</strong>`;
            } else if (currentParams.category) {
              contextMsg = ` in category: <strong>${currentParams.category}</strong>`;
            } else if (currentParams.tag) {
              contextMsg = ` with tag: <strong>${currentParams.tag}</strong>`;
            }
            promptList.innerHTML = `
              <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                height: 200px;
                background: rgba(255,255,255,0.02);
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                margin: 2em 0;
                font-size: 1.2em;
                color: #6c63ff;
                flex-direction: column;
              ">
                <div>
                  <span style="font-weight: 600;">No prompts found${contextMsg}.</span>
                </div>
                <div style="margin-top: 0.5em; color: #888; font-size: 0.95em;">
                  Try adjusting your search or filter criteria.
                </div>
              </div>
            `;
            debugLog("renderPrompts: no prompts found", { contextMsg });
          }
          // KISS: Attach event handlers for promptList after DOM is updated
          setTimeout(() => {
            try {
              if (window.initEventHandlers && typeof window.initEventHandlers === 'function') {
                console.debug('[promptList.js] Attaching event handlers after prompt list render');
                // Use latest form elements and promptManager if available
                const formElements = window.getFormElements ? window.getFormElements() : {};
                const promptManager = window.promptManager || null;
                window.initEventHandlers(formElements, promptManager, console.debug);
              }
            } catch (err) {
              console.error('[promptList.js] Error attaching event handlers after renderPrompts:', err);
            }
          }, 0);
          debugLog("renderPrompts: END (then block)");
        })
        .catch((err) => {
          if (loading) loading.classList.add('hidden');
          promptList.innerHTML = '<div style="padding:1em;color:red;">Error loading prompts.</div>';
          debugLog("renderPrompts: error loading prompts", err);
        });
    }
    debugLog("renderPrompts: END");
  }

  // Scroll a specific prompt into view after rendering
  function scrollPromptIntoView(promptId) {
    debugLog("scrollPromptIntoView: START", { promptId });
    const promptList = document.getElementById('prompt-list');
    if (promptList && promptId) {
      const promptEl = promptList.querySelector(`[data-id="${promptId}"]`);
      if (promptEl) {
        promptEl.scrollIntoView({ behavior: 'auto', block: 'center' });
        debugLog("scrollPromptIntoView: scrolled to prompt", { promptId });
      } else {
        debugLog("scrollPromptIntoView: prompt element not found", { promptId });
      }
    } else {
      debugLog("scrollPromptIntoView: promptList or promptId missing", { promptList, promptId });
    }
    debugLog("scrollPromptIntoView: END");
  }

  // Patch renderPrompts to scroll a specific prompt into view after rendering
}

// Top-level export for ES module compatibility
function renderPromptsWithScroll(promptId) {
  debugLog("renderPromptsWithScroll: START", { promptId, time: new Date().toISOString() });
  if (typeof renderPrompts === 'function') {
    renderPrompts();
    setTimeout(() => {
      if (typeof scrollPromptIntoView === 'function') {
        debugLog("renderPromptsWithScroll: calling scrollPromptIntoView", { promptId, time: new Date().toISOString() });
        scrollPromptIntoView(promptId);
      } else {
        debugLog("renderPromptsWithScroll: scrollPromptIntoView is not a function");
      }
      // After render, log all prompt blocks in DOM
      const promptBlocks = Array.from(document.querySelectorAll('[data-testid="prompt-block"]')).map(el => ({
        id: el.getAttribute('data-id'),
        title: el.querySelector('[data-testid="prompt-title"]')?.textContent
      }));
      debugLog("renderPromptsWithScroll: Prompt blocks in DOM after render", { promptBlocks, time: new Date().toISOString() });
    }, 400);
  } else {
    debugLog("renderPromptsWithScroll: renderPrompts is not a function");
  }
  debugLog("renderPromptsWithScroll: END");
}
export { renderPromptsWithScroll };