// renderPromptBlock.js - Modular Prompt Block Renderer with Full Debug Logging and Accessibility (2025 Audit Overhaul)

import { escapeHtml } from '../util/helpers.js';

/**
 * Render a single prompt block as a DOM element.
 * @param {Object} prompt - The prompt object.
 * @param {Array} categories - Array of category objects.
 * @param {Array} tags - Array of tag objects.
 * @param {Object} [options] - Optional settings.
 * @param {boolean} [options.debug] - Enable debug logging.
 * @returns {HTMLElement} The prompt block element.
 */
export function renderPromptBlock(prompt, categories = [], tags = [], options = {}) {
  const DEBUG = options.debug ?? (typeof window !== 'undefined' && window.DEBUG_MODE);
  const viewMode = options.viewMode || (typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('promptViewMode') : 'grid');
  function debugLog(...args) {
    if (DEBUG) console.log('[renderPromptBlock]', ...args);
  }
  debugLog('PARAMS', { prompt, categories, tags, options, viewMode });

  // DEBUG: Log if this is being called for modal or card
  debugLog('RENDER CONTEXT', { isModal: options.isModal, promptId: prompt.id });

  debugLog('START', { prompt, categories, tags, options });

  // Defensive: Validate input
  if (!prompt || typeof prompt !== 'object') {
    debugLog('Invalid prompt object', prompt);
    throw new Error('renderPromptBlock: prompt must be an object');
  }

  // Format timestamp if available
  let created = '';
  if (prompt.created_at) {
    const d = new Date(prompt.created_at);
    created = !isNaN(d) ? d.toLocaleString() : escapeHtml(prompt.created_at);
  }

  // Map category ID to name
  let categoryName = '';
  let categoryId = '';
  if (prompt.category && Array.isArray(categories)) {
    debugLog('CATEGORY SEARCH', { promptCategory: prompt.category, categories });
    const cat = categories.find(c => c.id === prompt.category);
    if (cat && cat.name) {
      categoryName = cat.name;
      categoryId = cat.id;
      debugLog('CATEGORY FOUND', { categoryName, categoryId });
    } else {
      debugLog('CATEGORY NOT FOUND', { promptCategory: prompt.category });
    }
  }
  if (!categoryName) categoryName = 'No category';

  // Map tag IDs to names
  let tagObjs = [];
  if (Array.isArray(prompt.tags) && Array.isArray(tags)) {
    debugLog('TAGS SEARCH', { promptTags: prompt.tags, tags });
    tagObjs = prompt.tags.map(tid => {
      const tag = tags.find(t => t.id === tid);
      if (tag && tag.name) {
        debugLog('TAG FOUND', { tid, tagName: tag.name });
        return tag;
      } else {
        debugLog('TAG NOT FOUND', { tid });
        return { id: tid, name: tid };
      }
    });
  }

  // Title: fallback and truncation
  let title = (prompt.title || '').trim();
  if (!title || title.length < 2 || ['s', '1', 'as'].includes(title.toLowerCase())) {
    debugLog('TITLE FALLBACK', { original: prompt.title });
    title = 'Untitled';
  } else if (title.length > 48) {
    title = escapeHtml(title.slice(0, 45)) + '…';
  } else {
    title = escapeHtml(title);
  }
  debugLog('TITLE FINAL', { title, original: prompt.title });

  // DEBUG: Log if title contains HTML tags
  if (/<[a-z][\s\S]*>/i.test(prompt.title || '')) {
    debugLog('TITLE CONTAINS HTML', { original: prompt.title });
  }

  // Content preview: 1–2 lines, fallback if empty
  let contentPreview = (prompt.content || '').trim();
  if (!contentPreview) contentPreview = '<span style="color:#bbb;">No content added</span>';
  else if (contentPreview.length > 120) contentPreview = escapeHtml(contentPreview.slice(0, 117)) + '…';
  else contentPreview = escapeHtml(contentPreview);

  // Description: fallback for missing fields, truncate for card
  let description = (prompt.description || '').trim();
  if (description.length > 80) description = escapeHtml(description.slice(0, 77)) + '…';
  else description = escapeHtml(description);

  const author = escapeHtml(prompt.author || 'Unknown');

  // Create the prompt block element
  const block = document.createElement('div');
  // Set class based on view mode
  block.className = `prompt-block hoverable ${viewMode === 'list' ? 'prompt-block-list' : 'prompt-block-grid'}`;
  block.setAttribute('data-testid', 'prompt-block');
  block.setAttribute('data-id', escapeHtml(prompt.id));
  block.setAttribute('tabindex', '0');
  block.setAttribute('aria-label', `Prompt: ${title}`);
  block.setAttribute('role', 'region');
  debugLog('[DIAG] renderPromptBlock: block className', block.className, 'viewMode', viewMode);

  // Header
  const header = document.createElement('div');
  header.className = 'prompt-header';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.gap = '0.5em';

  // Title
  const h3 = document.createElement('h3');
  h3.className = 'prompt-title';
  h3.setAttribute('data-testid', 'prompt-title');
  h3.setAttribute('data-id', escapeHtml(prompt.id));
  h3.setAttribute('title', title);
  h3.textContent = title;

  // Actions
  const actions = document.createElement('div');
  actions.className = 'prompt-actions';
  actions.style.display = 'flex';
  actions.style.gap = '0.5em';

  // Edit button
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'edit-btn';
  editBtn.setAttribute('data-testid', `edit-prompt-btn-${escapeHtml(prompt.id)}`);
  editBtn.setAttribute('aria-label', `Edit prompt: ${title}`);
  editBtn.setAttribute('tabindex', '0');
  editBtn.innerText = '✏️';

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'delete-btn';
  deleteBtn.setAttribute('data-testid', `delete-prompt-btn-${escapeHtml(prompt.id)}`);
  deleteBtn.setAttribute('aria-label', `Delete prompt: ${title}`);
  deleteBtn.setAttribute('tabindex', '0');
  deleteBtn.innerText = '🗑️';
  // DELETE: Real handler with debug log and confirmation
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    debugLog('[ACTION] Delete button clicked', { promptId: prompt.id, prompt });

    // Save current actions for restoration
    const originalActions = actions.cloneNode(true);

    // Create inline confirmation block
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'prompt-inline-confirm';
    confirmDiv.style.display = 'flex';
    confirmDiv.style.gap = '0.5em';
    confirmDiv.style.alignItems = 'center';

    const confirmText = document.createElement('span');
    confirmText.textContent = 'Are you sure you want to delete this prompt?';

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'confirm-delete-btn';
    confirmBtn.style.background = '#c00';
    confirmBtn.style.color = '#fff';
    confirmBtn.style.border = 'none';
    confirmBtn.style.padding = '0.3em 0.8em';
    confirmBtn.style.borderRadius = '4px';
    confirmBtn.style.cursor = 'pointer';
    confirmBtn.textContent = 'Delete';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'cancel-delete-btn';
    cancelBtn.style.background = '#eee';
    cancelBtn.style.color = '#333';
    cancelBtn.style.border = 'none';
    cancelBtn.style.padding = '0.3em 0.8em';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.textContent = 'Cancel';

    // Remove all children from actions and add confirmation UI
    while (actions.firstChild) actions.removeChild(actions.firstChild);
    actions.append(confirmText, confirmBtn, cancelBtn);

    // Focus the confirm button for accessibility
    setTimeout(() => confirmBtn.focus(), 0);

    // Confirm delete handler
    confirmBtn.onclick = async (ev) => {
      ev.stopPropagation();
      debugLog('[ACTION] Inline delete confirmed', { promptId: prompt.id });

      // LOG: Check if window.deletePrompt exists
      debugLog('[DEBUG] typeof window.deletePrompt:', typeof window.deletePrompt);

      if (window.deletePrompt) {
        try {
          debugLog('[DEBUG] Calling window.deletePrompt with id:', prompt.id);
          const result = await window.deletePrompt(prompt.id);
          debugLog('[DEBUG] window.deletePrompt result:', result);

          // Remove card from UI immediately
          const card = e.target.closest('.prompt-block');
          debugLog('[DEBUG] About to remove card from DOM:', card);
          if (card && card.parentNode) {
            card.parentNode.removeChild(card);
            debugLog('[DEBUG] Card removed from DOM');
          } else {
            debugLog('[DEBUG] Card not found or has no parent');
          }
          window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Prompt deleted.', type: 'success' } }));
          window.dispatchEvent(new CustomEvent('filterPrompts', { detail: {} }));
        } catch (err) {
          debugLog('[ACTION] Backend deletePrompt failed', { promptId: prompt.id, error: err });
          if (window.showToast) window.showToast('Error deleting prompt.', { type: 'error' });
          // Restore original actions on error
          while (actions.firstChild) actions.removeChild(actions.firstChild);
          Array.from(originalActions.childNodes).forEach(node => actions.appendChild(node));
        }
      } else {
        debugLog('[ACTION] No backend deletePrompt function found', { promptId: prompt.id });
        if (window.showToast) window.showToast('Delete API not available.', { type: 'error' });
        // Restore original actions on error
        while (actions.firstChild) actions.removeChild(actions.firstChild);
        Array.from(originalActions.childNodes).forEach(node => actions.appendChild(node));
      }
    };

    // Cancel handler
    cancelBtn.onclick = (ev) => {
      ev.stopPropagation();
      debugLog('[ACTION] Inline delete cancelled', { promptId: prompt.id });
      // Restore original actions
      while (actions.firstChild) actions.removeChild(actions.firstChild);
      Array.from(originalActions.childNodes).forEach(node => actions.appendChild(node));
      // Focus the delete button for accessibility
      const restoredDeleteBtn = actions.querySelector('.delete-btn');
      if (restoredDeleteBtn) setTimeout(() => restoredDeleteBtn.focus(), 0);
    };
  };

  // COPY: Real handler with debug log and feedback
  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'copy-btn';
  copyBtn.setAttribute('data-testid', `copy-prompt-btn-${escapeHtml(prompt.id)}`);
  copyBtn.setAttribute('aria-label', `Copy prompt: ${title}`);
  copyBtn.setAttribute('tabindex', '0');
  copyBtn.innerText = '📋';
  copyBtn.onclick = (e) => {
    e.stopPropagation();
    const textToCopy = prompt.content || '';
    debugLog('[ACTION] Copy button clicked', { promptId: prompt.id, textToCopy });
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          debugLog('[ACTION] Copy to clipboard success', { promptId: prompt.id });
          if (window.showToast) window.showToast('Prompt copied to clipboard!');
        })
        .catch((err) => {
          debugLog('[ACTION] Copy to clipboard failed', { promptId: prompt.id, error: err });
          alert('Failed to copy prompt content.');
        });
    } else {
      debugLog('[ACTION] Clipboard API not available', { promptId: prompt.id });
      alert('Clipboard API not available.');
    }
  };

  // EDIT: Real handler with debug log and event
  editBtn.onclick = (e) => {
    e.stopPropagation();
    debugLog('[ACTION] Edit button clicked', { promptId: prompt.id, prompt });
    // Dispatch a custom event for editing
    window.dispatchEvent(new CustomEvent('prompt:edit', { detail: { prompt } }));
  };

  actions.append(editBtn, deleteBtn, copyBtn);
  header.append(h3, actions);

  // Content preview
  const contentDiv = document.createElement('div');
  contentDiv.className = 'prompt-content-preview';
  contentDiv.setAttribute('data-testid', 'prompt-content-preview');
  contentDiv.style.marginBottom = '0.5em';
  contentDiv.style.overflow = 'hidden';
  contentDiv.style.display = '-webkit-box';
  contentDiv.style.webkitLineClamp = '2';
  contentDiv.style.webkitBoxOrient = 'vertical';
  contentDiv.style.textOverflow = 'ellipsis';
  contentDiv.innerHTML = contentPreview;

  // Description
  const descP = document.createElement('p');
  descP.className = 'prompt-description';
  descP.setAttribute('data-testid', 'prompt-description');
  descP.style.marginBottom = '0.7em';
  descP.style.overflow = 'hidden';
  descP.style.display = '-webkit-box';
  descP.style.webkitLineClamp = '2';
  descP.style.webkitBoxOrient = 'vertical';
  descP.style.textOverflow = 'ellipsis';
  descP.innerHTML = description;

  // Meta info
  const metaDiv = document.createElement('div');
  metaDiv.className = 'prompt-meta';
  metaDiv.style.display = 'flex';
  metaDiv.style.flexWrap = 'wrap';
  metaDiv.style.gap = '0.7em';
  metaDiv.style.fontSize = '0.98em';
  metaDiv.style.color = 'var(--color-text-muted)';
  metaDiv.style.marginBottom = '0.5em';
  metaDiv.innerHTML = `
    <span>ID: <code>${escapeHtml(prompt.id)}</code></span>
    ${created ? `<span>Created: ${created}</span>` : ''}
    <span>By: ${author}</span>
  `;

  // Tags and category
  const tagsDiv = document.createElement('div');
  tagsDiv.className = 'prompt-tags-cats';
  tagsDiv.style.display = 'flex';
  tagsDiv.style.flexWrap = 'wrap';
  tagsDiv.style.gap = '0.5em';
  tagsDiv.style.marginBottom = '0.2em';

  // Category pill
  const catPill = document.createElement('span');
  catPill.className = 'tag-pill category-pill';
  catPill.setAttribute('data-testid', `category-pill-${escapeHtml(prompt.id)}`);
  catPill.setAttribute('aria-label', `Category: ${escapeHtml(categoryName)}`);
  catPill.setAttribute('title', `Category: ${escapeHtml(categoryName)}`);
  catPill.textContent = categoryName;
  tagsDiv.appendChild(catPill);

  // Tag pills
  if (tagObjs.length === 0) {
    const noTags = document.createElement('span');
    noTags.className = 'tag-pill';
    noTags.style.fontStyle = 'italic';
    noTags.style.color = '#aaa';
    noTags.textContent = 'No tags';
    tagsDiv.appendChild(noTags);
  } else {
    tagObjs.forEach(tag => {
      // Support comma-separated tags as fallback
      let tagNames = typeof tag.name === 'string' ? tag.name.split(',').map(t => t.trim()).filter(Boolean) : [tag.name];
      tagNames.forEach(name => {
        const tagPill = document.createElement('span');
        tagPill.className = 'tag-pill';
        tagPill.setAttribute('data-testid', `tag-pill-${escapeHtml(prompt.id)}-${escapeHtml(tag.id)}-${escapeHtml(name)}`);
        tagPill.setAttribute('aria-label', `Tag: ${escapeHtml(name)}`);
        tagPill.setAttribute('title', `Tag: ${escapeHtml(name)}`);
        tagPill.textContent = name;
        tagPill.style.cursor = 'pointer';
        tagPill.onclick = (e) => {
          e.stopPropagation();
          debugLog('[DIAG] Tag clicked', { tagName: name, promptId: prompt.id });
          window.dispatchEvent(new CustomEvent('filterPrompts', { detail: { tag: name } }));
        };
        tagsDiv.appendChild(tagPill);
        // DEBUG: Log tag name before display
        debugLog('TAG DISPLAY', { tagName: name });
      });
    });
  }

  // Results Section (KISS, pure safety, no mutation)
  if (Array.isArray(prompt.results) && prompt.results.length > 0) {
    const resultsSection = document.createElement('div');
    resultsSection.className = 'prompt-results-section';
    resultsSection.style.margin = '0.5em 0 0.5em 0';
    resultsSection.style.padding = '0.5em 0';
    resultsSection.style.borderTop = '1px solid #2a1a40';
    resultsSection.style.borderBottom = '1px solid #2a1a40';

    const resultsTitle = document.createElement('div');
    resultsTitle.textContent = 'Results:';
    resultsTitle.style.fontWeight = '600';
    resultsTitle.style.fontSize = '0.98em';
    resultsTitle.style.marginBottom = '0.3em';
    resultsSection.appendChild(resultsTitle);

    prompt.results.forEach((result, idx) => {
      const resultRow = document.createElement('div');
      resultRow.className = 'prompt-result-row';
      resultRow.style.display = 'flex';
      resultRow.style.alignItems = 'center';
      resultRow.style.gap = '0.5em';
      resultRow.style.marginBottom = '0.2em';

      const resultContent = document.createElement('span');
      resultContent.textContent = typeof result === 'string' ? result : (result.content || '[No content]');
      resultContent.style.flex = '1';
      resultContent.style.fontSize = '0.97em';
      resultContent.style.color = '#E0D0FF';

      // Delete button for result
      const delResultBtn = document.createElement('button');
      delResultBtn.type = 'button';
      delResultBtn.className = 'delete-result-btn';
      delResultBtn.setAttribute('aria-label', `Delete result ${idx + 1}`);
      delResultBtn.setAttribute('tabindex', '0');
      delResultBtn.innerText = '🗑️';
      delResultBtn.onclick = (e) => {
        e.stopPropagation();
        debugLog('[ACTION] Delete result button clicked', { promptId: prompt.id, resultIdx: idx, result });
        // Dispatch a custom event for result deletion (KISS, pure safety)
        window.dispatchEvent(new CustomEvent('result:delete', {
          detail: {
            promptId: prompt.id,
            resultId: result.id || idx,
            result,
            prompt
          }
        }));
      };

      resultRow.append(resultContent, delResultBtn);
      resultsSection.appendChild(resultRow);
    });

    block.appendChild(resultsSection);
  }

  // Assemble block
  block.append(header, contentDiv, descP, metaDiv, tagsDiv);

  // DEBUG: Log if action buttons exist and if listeners are attached
  debugLog('ACTION BUTTONS', {
    editBtnExists: !!editBtn,
    deleteBtnExists: !!deleteBtn,
    copyBtnExists: !!copyBtn,
    context: options.isModal ? 'modal' : 'card'
  });

  // Accessibility: keyboard focus/activation
  block.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      debugLog('Prompt block activated by keyboard', { prompt });
      block.click();
    }
  });

  // Click handler: triggers the intended action (e.g., open prompt detail modal)
  block.addEventListener('click', (e) => {
    debugLog('Prompt block activated by click', { prompt });
    // Intended action: open prompt detail modal or similar
    // Replace the following line with the actual modal opening logic if needed
    const event = new CustomEvent('promptBlock:activate', { detail: { prompt } });
    block.dispatchEvent(event);
  });

  // DEBUG: Log final block structure for inspection
  debugLog('END', { block, html: block.outerHTML });
  return block;
}