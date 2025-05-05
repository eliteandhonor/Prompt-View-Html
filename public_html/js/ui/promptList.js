// ui/promptList.js - KISS Prompt List UI (2025 Refactor with Full Logging)

import { fetchPrompts } from '../api/prompts.js';

export function initPromptList(params = {}) {
  console.log("initPromptList: called", params);
  let currentParams = { ...params };

  function showModal(modalEl) {
    console.log("showModal: called", modalEl);
    if (!modalEl) {
      console.warn("showModal: modalEl is null");
      return;
    }
    modalEl.hidden = false;
    modalEl.setAttribute('aria-hidden', 'false');
    modalEl.classList.add('active');
    modalEl.focus();
    document.body.classList.add('modal-open');
  }

  function hideModal(modalEl) {
    console.log("hideModal: called", modalEl);
    if (!modalEl) {
      console.warn("hideModal: modalEl is null");
      return;
    }
    modalEl.hidden = true;
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.classList.remove('active');
    document.body.classList.remove('modal-open');
  }

  function attachPromptListControlListeners() {
    console.log("attachPromptListControlListeners: called");
    const listViewBtn = document.getElementById('list-view-btn');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const promptList = document.getElementById('prompt-list');
    const addPromptBtn = document.getElementById('add-prompt-btn');
    const importBtn = document.getElementById('import-prompts-btn');
    const importInput = document.getElementById('import-file-input');

    // View toggle
    if (listViewBtn && gridViewBtn && promptList) {
      listViewBtn.onclick = () => {
        console.log("List View button clicked");
        promptList.classList.remove('prompt-grid');
        promptList.classList.add('prompt-list');
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
      };
      gridViewBtn.onclick = () => {
        console.log("Grid View button clicked");
        promptList.classList.remove('prompt-list');
        promptList.classList.add('prompt-grid');
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
      };
    }

    // Add Prompt
    if (addPromptBtn) {
      addPromptBtn.onclick = () => {
        console.log("Add Prompt button clicked");
        window.dispatchEvent(new CustomEvent('openCrudModal', { detail: { mode: 'add' } }));
      };
    }

    // Import Prompts
    if (importBtn && importInput) {
      importBtn.onclick = () => {
        console.log("Import Prompts button clicked");
        importInput.click();
      };
      importInput.onchange = async (e) => {
        console.log("Import file input changed", importInput.files);
        const files = Array.from(importInput.files || []);
        if (!files.length) {
          console.warn("No files selected for import");
          window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'No files selected.', type: 'error' } }));
          return;
        }

        function parsePromptFile(file, text) {
          console.log("parsePromptFile: called", file.name);
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
              console.warn(`File "${file.name}" missing title or content`);
              window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `File "${file.name}" is missing a title or content.`, type: 'error' } }));
              continue;
            }
            promptObjs.push(prompt);
          }
          if (!promptObjs.length) {
            console.warn("No valid prompts found in selected files");
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'No valid prompts found in selected files.', type: 'error' } }));
            importInput.value = '';
            return;
          }

          // Show modal preview for confirmation
          const crudModal = document.getElementById('crud-modal');
          const crudModalBody = document.getElementById('crud-modal-body');
          if (!crudModal || !crudModalBody) {
            console.error("Import modal not found");
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
            console.log("Confirm Import button clicked");
            const progressDiv = document.getElementById('import-progress');
            let successCount = 0;
            let failCount = 0;
            progressDiv.textContent = 'Importing...';
            for (const [i, prompt] of promptObjs.entries()) {
              try {
                await import('../api/prompts.js').then(mod => mod.createPrompt(prompt));
                successCount++;
                progressDiv.textContent = `Imported ${successCount}/${promptObjs.length}`;
                console.log(`Prompt imported: ${prompt.title}`);
              } catch (err) {
                failCount++;
                progressDiv.textContent = `Imported ${successCount}/${promptObjs.length}, failed ${failCount}`;
                console.error("Failed to import prompt", prompt, err);
              }
            }
            window.dispatchEvent(new CustomEvent('showToast', { detail: { message: `Imported ${successCount} prompt(s).${failCount ? ' ' + failCount + ' failed.' : ''}`, type: failCount ? 'warning' : 'success' } }));
            hideModal(crudModal);
            window.dispatchEvent(new CustomEvent('filterPrompts', { detail: {} })); // Refresh list
            importInput.value = '';
          };

          document.getElementById('cancel-import-btn').onclick = () => {
            console.log("Cancel Import button clicked");
            hideModal(crudModal);
            importInput.value = '';
          };
        } catch (err) {
          console.error("Error reading files for import", err);
          window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Error reading files.', type: 'error' } }));
          importInput.value = '';
        }
      };
    }
  }

  // Attach listeners on init and whenever section is shown
  attachPromptListControlListeners();

  // Listen for section visibility changes and re-attach listeners
  const promptListSection = document.getElementById('prompt-list-section');
  if (promptListSection) {
    const observer = new MutationObserver(() => {
      if (promptListSection.style.display !== 'none') {
        console.log("prompt-list-section is now visible, re-attaching listeners");
        attachPromptListControlListeners();
      }
    });
    observer.observe(promptListSection, { attributes: true, attributeFilter: ['style'] });
  }

  // Listen for filterPrompts event (myPrompts, category, tag)
  window.addEventListener('filterPrompts', (e) => {
    console.log("[DIAG] filterPrompts event received", e.detail, "at", new Date().toISOString());
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
    console.log("[DIAG] Calling renderPrompts() after filterPrompts at", new Date().toISOString());
    renderPrompts();
  });

  function renderPrompts() {
    console.log("[DIAG] renderPrompts: called with params", currentParams, "at", new Date().toISOString());
    const promptList = document.getElementById('prompt-list');
    const loading = document.getElementById('prompt-list-loading');
    if (loading) loading.classList.remove('hidden');
    if (promptList) {
      promptList.innerHTML = '';
      fetchPrompts(currentParams)
        .then(prompts => {
          console.log("[DIAG] renderPrompts: fetchPrompts resolved", prompts, "at", new Date().toISOString());
          // [DEBUG] Log all prompt titles being rendered
          console.log("[DEBUG] Prompt titles to render:", prompts.map(p => p.title));
          // [DEBUG] Log current search/filter input if present
          const searchInput = document.querySelector('[data-testid="prompt-search-input"]');
          if (searchInput) {
            console.log("[DEBUG] Current search/filter value:", searchInput.value);
          }
          if (loading) loading.classList.add('hidden');
          if (Array.isArray(prompts) && prompts.length > 0) {
            promptList.innerHTML = prompts
              .map(prompt => `
                <div class="prompt-block" data-testid="prompt-block" data-id="${prompt.id}" tabindex="0" aria-label="Prompt: ${prompt.title}">
                  <h3 data-testid="prompt-title" data-id="${prompt.id}">${prompt.title}</h3>
                  <p>${prompt.description || ''}</p>
                  <div class="prompt-meta">
                    <span>By: ${prompt.author || 'Unknown'}</span>
                    <span>Category: ${prompt.category || 'Uncategorized'}</span>
                    <span>Tags: ${(prompt.tags || []).join(', ')}</span>
                  </div>
                </div>
              `)
              .join('');
            // [DIAG] Log after prompt is rendered in DOM
            const renderedTitles = Array.from(promptList.querySelectorAll('[data-testid="prompt-title"]')).map(el => ({
              id: el.getAttribute('data-id'),
              text: el.textContent
            }));
            console.log("[DIAG] Prompts rendered in DOM:", renderedTitles, "at", new Date().toISOString());

            // Wire up prompt block and prompt title click to open detail modal
            promptList.querySelectorAll('.prompt-block').forEach(block => {
              const id = block.getAttribute('data-id');
              const prompt = prompts.find(p => String(p.id) === String(id));
              // Card click
              block.addEventListener('click', (e) => {
                if (prompt) {
                  window.dispatchEvent(new CustomEvent('openCrudModal', { detail: { mode: 'view', prompt } }));
                }
              });
              // Title click
              const title = block.querySelector('[data-testid="prompt-title"]');
              if (title) {
                title.addEventListener('click', (e) => {
                  e.stopPropagation();
                  if (prompt) {
                    window.dispatchEvent(new CustomEvent('openCrudModal', { detail: { mode: 'view', prompt } }));
                  }
                });
              }
            });
          } else {
            promptList.innerHTML = '<div style="padding:1em;">No prompts found.</div>';
            console.log("[DIAG] renderPrompts: no prompts found at", new Date().toISOString());
          }
        })
        .catch(err => {
          if (loading) loading.classList.add('hidden');
          promptList.innerHTML = '<div style="padding:1em;color:red;">Error loading prompts.</div>';
          console.error('[DIAG] PromptList: Failed to load prompts', err, "at", new Date().toISOString());
        });
    } else {
      console.warn("[DIAG] renderPrompts: promptList element not found at", new Date().toISOString());
    }
  }

  // Scroll a specific prompt into view after rendering
  function scrollPromptIntoView(promptId) {
    const promptList = document.getElementById('prompt-list');
    if (promptList && promptId) {
      const promptEl = promptList.querySelector(`[data-id="${promptId}"]`);
      if (promptEl) {
        promptEl.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    }
  }

  // Patch renderPrompts to scroll a specific prompt into view after rendering
}

// Top-level export for ES module compatibility
function renderPromptsWithScroll(promptId) {
  // [DEBUG] renderPromptsWithScroll called
  console.log("[DEBUG] renderPromptsWithScroll called with promptId:", promptId, "at", new Date().toISOString());
  if (typeof renderPrompts === 'function') {
    renderPrompts();
    setTimeout(() => {
      if (typeof scrollPromptIntoView === 'function') {
        console.log("[DEBUG] scrollPromptIntoView called with promptId:", promptId, "at", new Date().toISOString());
        scrollPromptIntoView(promptId);
      } else {
        console.warn("[DEBUG] scrollPromptIntoView is not a function");
      }
      // [DEBUG] After render, log all prompt blocks in DOM
      const promptBlocks = Array.from(document.querySelectorAll('[data-testid="prompt-block"]')).map(el => ({
        id: el.getAttribute('data-id'),
        title: el.querySelector('[data-testid="prompt-title"]')?.textContent
      }));
      console.log("[DEBUG] Prompt blocks in DOM after render:", promptBlocks, "at", new Date().toISOString());
    }, 400);
  } else {
    console.warn("[DEBUG] renderPrompts is not a function");
  }
}
export { renderPromptsWithScroll };