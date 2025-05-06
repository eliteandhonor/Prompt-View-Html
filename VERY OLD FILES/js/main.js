/**
 * Main app logic for minimal JSON-backed CRUD/tagging app.
 * Handles prompt CRUD, category/tag management, and UI rendering.
 * All user input is escaped, and utility functions are modularized.
 */
import { getSelectedOptions, escapeHtml, renderMarkdownToHTML } from './util/helpers.js';

/**
 * Wait for DOM to be ready before initializing app logic.
 */
document.addEventListener('DOMContentLoaded', () => {
  // --- Toast for feedback ---
  let toast = document.createElement('div');
  toast.id = 'toast';
  toast.style.cssText = 'position:fixed;bottom:2em;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:0.75em 2em;border-radius:8px;z-index:2000;display:none;font-size:1.1em;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
  document.body.appendChild(toast);
  function showToast(msg) {
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 1800);
  }
  // --- Tag/Category Management Modals ---
  const manageTagsBtn = document.getElementById('manage-tags-btn');
  const manageCategoriesBtn = document.getElementById('manage-categories-btn');
  const tagManagementModal = document.getElementById('tag-management-modal');
  const tagManagementContent = document.getElementById('tag-management-content');
  const closeTagManagementModal = document.getElementById('close-tag-management-modal');
  const categoryManagementModal = document.getElementById('category-management-modal');
  const categoryManagementContent = document.getElementById('category-management-content');
  const closeCategoryManagementModal = document.getElementById('close-category-management-modal');

  function openModalEl(modal) {
    if (modal) modal.style.display = 'flex';
  }
  function closeModalEl(modal) {
    if (modal) modal.style.display = 'none';
  }

  // Render tag management UI
  function renderTagManagement() {
    tagManagementContent.innerHTML = tags.map(tag => `
      <div style="display:flex;align-items:center;gap:0.5em;margin-bottom:0.5em;">
        <input type="text" value="${escapeHtml(tag.name)}" data-id="${tag.id}" style="flex:1;padding:0.3em 0.5em;" maxlength="32" />
        <button class="save-tag-btn primary" data-id="${tag.id}">Save</button>
        <button class="delete-tag-btn danger" data-id="${tag.id}">Delete</button>
      </div>
    `).join('');
    // Save handlers
    tagManagementContent.querySelectorAll('.save-tag-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const input = tagManagementContent.querySelector(`input[data-id="${id}"]`);
        const newName = input.value.trim();
        if (!newName) return showToast('Tag name cannot be empty');
        if (newName.length > 32) return showToast('Tag name too long');
        if (newName.includes(',')) return showToast('No commas allowed in tag names');
        btn.disabled = true;
        try {
          const res = await fetch(`/api/tags.php?id=${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
          });
          const data = await res.json();
          if (data.ok) {
            showToast('Tag renamed');
            await loadCategoriesAndTags();
            renderTagManagement();
          } else {
            showToast('Failed to rename tag: ' + (data.error || 'Unknown error'));
          }
        } catch (err) {
          showToast('Error renaming tag');
        }
        btn.disabled = false;
      };
    });
    // Delete handlers
    tagManagementContent.querySelectorAll('.delete-tag-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Delete this tag? It will be removed from all prompts.')) return;
        btn.disabled = true;
        try {
          const res = await fetch(`/api/tags.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.ok) {
            showToast('Tag deleted');
            await loadCategoriesAndTags();
            renderTagManagement();
          } else {
            showToast('Failed to delete tag: ' + (data.error || 'Unknown error'));
          }
        } catch (err) {
          showToast('Error deleting tag');
        }
        btn.disabled = false;
      };
    });
  }

  // Render category management UI
  function renderCategoryManagement() {
    categoryManagementContent.innerHTML = categories.map(cat => `
      <div style="display:flex;align-items:center;gap:0.5em;margin-bottom:0.5em;">
        <input type="text" value="${escapeHtml(cat.name)}" data-id="${cat.id}" style="flex:1;padding:0.3em 0.5em;" maxlength="32" />
        <button class="save-category-btn primary" data-id="${cat.id}">Save</button>
        <button class="delete-category-btn danger" data-id="${cat.id}">Delete</button>
      </div>
    `).join('');
    // Save handlers
    categoryManagementContent.querySelectorAll('.save-category-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const input = categoryManagementContent.querySelector(`input[data-id="${id}"]`);
        const newName = input.value.trim();
        if (!newName) return showToast('Category name cannot be empty');
        if (newName.length > 32) return showToast('Category name too long');
        if (newName.includes(',')) return showToast('No commas allowed in category names');
        btn.disabled = true;
        try {
          const res = await fetch(`/api/categories.php?id=${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
          });
          const data = await res.json();
          if (data.ok) {
            showToast('Category renamed');
            await loadCategoriesAndTags();
            renderCategoryManagement();
          } else {
            showToast('Failed to rename category: ' + (data.error || 'Unknown error'));
          }
        } catch (err) {
          showToast('Error renaming category');
        }
        btn.disabled = false;
      };
    });
    // Delete handlers
    categoryManagementContent.querySelectorAll('.delete-category-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Delete this category? It will be removed from all prompts.')) return;
        btn.disabled = true;
        try {
          const res = await fetch(`/api/categories.php?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
          const data = await res.json();
          if (data.ok) {
            showToast('Category deleted');
            await loadCategoriesAndTags();
            renderCategoryManagement();
          } else {
            showToast('Failed to delete category: ' + (data.error || 'Unknown error'));
          }
        } catch (err) {
          showToast('Error deleting category');
        }
        btn.disabled = false;
      };
    });
  }

  // Modal open/close event listeners
  if (manageTagsBtn && tagManagementModal) {
    manageTagsBtn.onclick = () => {
      renderTagManagement();
      openModalEl(tagManagementModal);
    };
  }
  if (closeTagManagementModal && tagManagementModal) {
    closeTagManagementModal.onclick = () => closeModalEl(tagManagementModal);
    tagManagementModal.addEventListener('click', e => {
      if (e.target === tagManagementModal) closeModalEl(tagManagementModal);
    });
  }
  if (manageCategoriesBtn && categoryManagementModal) {
    manageCategoriesBtn.onclick = () => {
      renderCategoryManagement();
      openModalEl(categoryManagementModal);
    };
  }
  if (closeCategoryManagementModal && categoryManagementModal) {
    closeCategoryManagementModal.onclick = () => closeModalEl(categoryManagementModal);
    categoryManagementModal.addEventListener('click', e => {
      if (e.target === categoryManagementModal) closeModalEl(categoryManagementModal);
    });
  }
  const promptList = document.getElementById('prompt-list');
  const form = document.getElementById('add-prompt-form');
  const titleInput = document.getElementById('prompt-title');
  const contentInput = document.getElementById('prompt-content');
  const addPreview = document.getElementById('add-preview');
  const categoryInput = document.getElementById('prompt-category');
  const tagsInput = document.getElementById('prompt-tags');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const modal = document.getElementById('prompt-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const deletePromptBtn = document.getElementById('delete-prompt-btn');
  const editPromptBtn = document.getElementById('edit-prompt-btn');
  const editPromptForm = document.getElementById('edit-prompt-form');
  const editPromptTitle = document.getElementById('edit-prompt-title');
  const editPromptContent = document.getElementById('edit-prompt-content');
  const editPreview = document.getElementById('edit-preview');
  const editCategoryInput = document.getElementById('edit-prompt-category');
  const editTagsInput = document.getElementById('edit-prompt-tags');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const copyPromptBtn = document.getElementById('copy-prompt-btn');
  // New filter UI elements
  const filterCategory = document.getElementById('filter-category');
  const filterTag = document.getElementById('filter-tag');
  const clearFiltersBtn = document.getElementById('clear-filters-btn');

  // --- App state ---
  const PAGE_SIZE = 5; // Number of prompts to show per page
  let allPrompts = [];
  let shownCount = 0;
  let currentPrompt = null;
  let categories = [];
  let tags = [];
  let searchQuery = '';
  let filterCategoryValue = '';
  let filterTagName = '';

  /**
   * Fetch all prompts from backend and render them.
   */
  async function fetchPrompts() {
    promptList.innerHTML = 'Loading...';
    try {
      const res = await fetch('/api/prompts.php');
      const data = await res.json();
      if (data.ok && Array.isArray(data.prompts)) {
        allPrompts = data.prompts;
        shownCount = 0;
        renderPrompts();
      } else {
        promptList.innerHTML = 'Failed to load prompts.';
      }
    } catch (err) {
      promptList.innerHTML = 'Error loading prompts.';
      console.error(err);
    }
  }

  /**
   * Render prompts to the UI, filtered by search and paginated.
   */
  function renderPrompts() {
    // Filter prompts by search, category, and tag
    let filtered = allPrompts;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        p => {
          // Search in title, content, prompt, category name, and tag names
          const titleMatch = p.title && p.title.toLowerCase().includes(q);
          const contentMatch = p.content && p.content.toLowerCase().includes(q);
          const promptMatch = p.prompt && p.prompt.toLowerCase().includes(q);
          // Category name match
          let categoryMatch = false;
          if (p.category && categories.length) {
            const cat = categories.find(c => c.id === p.category);
            if (cat && cat.name && cat.name.toLowerCase().includes(q)) categoryMatch = true;
          }
          // Tag name match
          let tagMatch = false;
          if (Array.isArray(p.tags) && p.tags.length && tags.length) {
            tagMatch = p.tags.some(tid => {
              const tag = tags.find(t => t.id === tid);
              return tag && tag.name && tag.name.toLowerCase().includes(q);
            });
          }
          return titleMatch || contentMatch || promptMatch || categoryMatch || tagMatch;
        }
      );
    }
    if (filterCategoryValue) {
      filtered = filtered.filter(p => p.category === filterCategoryValue);
    }
   if (filterTagName) {
     filtered = filtered.filter(p =>
       Array.isArray(p.tags) &&
       p.tags.some(tid => {
         const tag = tags.find(t => t.id === tid);
         // Match by tag name or fallback to tag ID
         return (tag && tag.name === filterTagName) || tid === filterTagName;
       })
     );
   }

    // --- Filter summary UI ---
    const filterSummary = document.getElementById('filter-summary');
    let summaryText = 'Showing all prompts';
    if (filterCategoryValue || filterTagName) {
      let catText = '';
      let tagText = '';
      if (filterCategoryValue) {
        const cat = categories.find(c => c.id === filterCategoryValue);
        catText = cat ? `Category: ${escapeHtml(cat.name)}` : '';
      }
      if (filterTagName) {
        tagText = `Tag: ${escapeHtml(filterTagName)}`;
      }
      summaryText = 'Showing prompts';
      if (catText) summaryText += ` in ${catText}`;
      if (tagText) summaryText += (catText ? ', ' : ' ') + tagText;
    }
    if (filterSummary) filterSummary.textContent = summaryText;

    const toShow = filtered.slice(0, shownCount + PAGE_SIZE);
    shownCount = toShow.length;
    if (!toShow.length) {
      promptList.innerHTML = '<em>No prompts found.</em>';
      loadMoreBtn.style.display = 'none';
      return;
    }
    promptList.innerHTML = toShow.map((p, idx) => {
      // Render tags as clickable elements
      let tagHtml = '';
     // Always render tags if present, even if tag name is missing
     if (Array.isArray(p.tags) && p.tags.length) {
       tagHtml = `<span style="margin-left:1em;"><strong>Tags:</strong> ` +
         p.tags.map(tid => {
           const tag = tags.find(t => t.id === tid);
           const tagName = tag ? tag.name : tid;
           return `<button type="button" class="tag-pill tag-link" data-tag="${escapeHtml(tagName)}" title="${escapeHtml(tagName)}">${escapeHtml(tagName)}</button>`;
         }).join('') +
         `</span>`;
     }
      return `
        <div class="prompt" data-idx="${idx}">
          <div class="prompt-title">${escapeHtml(p.title)}</div>
          <div class="prompt-content">${renderMarkdownToHTML(p.content || p.prompt || '')}</div>
          <div class="prompt-meta" style="font-size:0.9em;color:#555;">
            ${p.category && categories.length ? `<span><strong>Category:</strong> ${escapeHtml((categories.find(c => c.id === p.category) || {}).name || p.category)}</span>` : ''}
            ${tagHtml}
          </div>
        </div>
      `;
    }).join('');
    // Add click listeners for prompt detail modal
    Array.from(promptList.getElementsByClassName('prompt')).forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.getAttribute('data-idx'), 10);
        showPromptModal(toShow[idx]);
      });
    });
    // Add click listeners for tag links
    Array.from(promptList.getElementsByClassName('tag-link')).forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        filterTag.value = el.getAttribute('data-tag');
        filterTagName = el.getAttribute('data-tag');
        renderPrompts();
      });
      el.addEventListener('mouseover', () => { el.style.background = '#d0eaff'; });
      el.addEventListener('mouseout', () => { el.style.background = '#e0e0e0'; });
    });
    if (shownCount < filtered.length) {
      loadMoreBtn.style.display = '';
    } else {
      loadMoreBtn.style.display = 'none';
    }
  }

  /**
   * Show prompt details in a modal dialog.
   */
  function showPromptModal(prompt) {
    currentPrompt = prompt;
    // Modal Title
    const titleHtml = `<div class="prompt-title">${escapeHtml(prompt.title)}</div>`;

    // Modal Content Preview
    const contentHtml = `<div class="prompt-content">${renderMarkdownToHTML(prompt.content || prompt.prompt || '')}</div>`;

    // Category
    let catName = '';
    if (prompt.category && categories.length) {
      const cat = categories.find(c => c.id === prompt.category);
      if (cat) catName = cat.name;
    }
    const categoryHtml = catName
      ? `<div class="prompt-meta"><span class="tag-label">Category:</span> <span class="category-value">${escapeHtml(catName)}</span></div>`
      : '';

    // Tags
    let tagNames = [];
    if (!Array.isArray(prompt.tags)) {
      console.warn('[DEV] Prompt tags is not an array:', prompt.tags, prompt);
    }
    if (prompt.tags && tags.length) {
      tagNames = prompt.tags.map(tid => {
        const t = tags.find(tag => tag.id === tid);
        return t ? t.name : tid;
      });
    }
    let tagsHtml = '';
    if (tagNames.length) {
      tagsHtml =
        `<div class="prompt-meta tag-row"><span class="tag-label">Tags:</span>` +
        tagNames
          .map(
            tagName =>
              `<button type="button" class="tag-pill tag-link${tagName === filterTagName ? ' active' : ''}" data-tag="${escapeHtml(tagName)}" title="${escapeHtml(tagName)}">${escapeHtml(tagName)}</button>`
          )
          .join('') +
        `</div>`;
    }

    // Compose modal content
    modalContent.innerHTML =
      titleHtml +
      contentHtml +
      categoryHtml +
      tagsHtml;

    // Show modal
    modal.style.display = 'flex';
    deletePromptBtn.style.display = '';
    editPromptBtn.style.display = '';
    editPromptForm.style.display = 'none';

    // Accessibility: focus modal
    modal.setAttribute('tabindex', '-1');
    modal.focus();

    // Add click listeners for tag links in modal
    Array.from(modalContent.getElementsByClassName('tag-link')).forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        filterTag.value = el.getAttribute('data-tag');
        filterTagName = el.getAttribute('data-tag');
        closeModal();
        renderPrompts();
      });
    });
    // Wire up modal action buttons
    const copyBtn = modalContent.querySelector('#copy-prompt-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        if (!currentPrompt) return;
        const text = currentPrompt.content || currentPrompt.prompt || '';
        try {
          await navigator.clipboard.writeText(text);
          const oldText = copyBtn.textContent;
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = oldText; }, 1200);
        } catch (err) {
          copyBtn.textContent = 'Failed';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1200);
        }
      });
    }
    const editBtn = modalContent.querySelector('#edit-prompt-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        if (!currentPrompt) return;
        editPromptTitle.value = currentPrompt.title || '';
        editPromptContent.value = currentPrompt.content || currentPrompt.prompt || '';
        if (editCategoryInput && currentPrompt.category) {
          editCategoryInput.value = currentPrompt.category;
        }
        if (editTagsInput && currentPrompt.tags) {
          Array.from(editTagsInput.options).forEach(opt => {
            opt.selected = currentPrompt.tags.includes(opt.value);
          });
        }
        editPromptForm.style.display = '';
        editPromptBtn.style.display = 'none';
        modalContent.style.display = 'none';
      });
    }
    const deleteBtn = modalContent.querySelector('#delete-prompt-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!currentPrompt || !currentPrompt.id) return;
        if (!confirm('Are you sure you want to delete this prompt?')) return;
        const payload = {
          action: 'delete',
          id: currentPrompt.id,
          title: currentPrompt.title || '',
          content: currentPrompt.content || currentPrompt.prompt || '',
          description: currentPrompt.description || '',
          category: currentPrompt.category || '',
          tags: currentPrompt.tags || []
        };
        try {
          const res = await fetch('/api/prompts.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.ok) {
            closeModal();
            fetchPrompts();
          } else {
            formError.textContent = 'Failed to delete prompt: ' + (data.error || 'Unknown error');
            alert('Failed to delete prompt: ' + (data.error || 'Unknown error'));
          }
        } catch (err) {
          formError.textContent = 'Error deleting prompt. Please check your network connection or try again later.';
        }
      });
    }
  }

  /**
   * Hide the modal dialog and reset state.
   */
  function closeModal() {
    modal.style.display = 'none';
    modalTitle.textContent = '';
    modalContent.textContent = '';
    deletePromptBtn.style.display = 'none';
    editPromptBtn.style.display = 'none';
    editPromptForm.style.display = 'none';
    currentPrompt = null;
  }

  // Initialize markdown preview for add/edit forms
  if (addPreview && contentInput) addPreview.innerHTML = renderMarkdownToHTML(contentInput.value);
  if (editPreview && editPromptContent) editPreview.innerHTML = renderMarkdownToHTML(editPromptContent.value);

  // --- Event listeners ---
  loadMoreBtn.addEventListener('click', () => {
    renderPrompts();
  });

  closeModalBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (modal.style.display === 'flex' && (e.key === 'Escape' || e.key === 'Esc')) {
      closeModal();
    }
  });

  /**
  * Copy prompt content to clipboard from modal.
  */

  // Cancel editing a prompt
  cancelEditBtn.addEventListener('click', () => {
    editPromptForm.style.display = 'none';
    editPromptBtn.style.display = '';
    modalContent.style.display = '';
  });

  const editFormError = document.getElementById('edit-form-error');
// Modal action button event listeners (restored for static buttons)
if (copyPromptBtn) {
  copyPromptBtn.addEventListener('click', async () => {
    if (!currentPrompt) return;
    // Copy plain text (not markdown or HTML)
    const text = currentPrompt.content || currentPrompt.prompt || '';
    try {
      await navigator.clipboard.writeText(text);
      const oldText = copyPromptBtn.textContent;
      copyPromptBtn.textContent = 'Copied!';
      setTimeout(() => { copyPromptBtn.textContent = oldText; }, 1200);
    } catch (err) {
      copyPromptBtn.textContent = 'Failed';
      setTimeout(() => { copyPromptBtn.textContent = 'Copy'; }, 1200);
    }
  });
}

if (deletePromptBtn) {
  deletePromptBtn.addEventListener('click', async () => {
    if (!currentPrompt || !currentPrompt.id) return;
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    // Try sending all fields for delete, not just id
    const payload = {
      action: 'delete',
      id: currentPrompt.id,
      title: currentPrompt.title || '',
      content: currentPrompt.content || currentPrompt.prompt || '',
      description: currentPrompt.description || '',
      category: currentPrompt.category || '',
      tags: currentPrompt.tags || []
    };
    console.log('[DEBUG] Sending delete request:', payload);
    try {
      const res = await fetch('/api/prompts.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log('[DEBUG] Delete response:', data);
      if (data.ok) {
        closeModal();
        fetchPrompts();
      } else {
        formError.textContent = 'Failed to delete prompt: ' + (data.error || 'Unknown error');
        alert('Failed to delete prompt: ' + (data.error || 'Unknown error'));
        console.error('[DEBUG] Delete error:', data);
      }
    } catch (err) {
      formError.textContent = 'Error deleting prompt. Please check your network connection or try again later.';
      console.error('[DEBUG] Network or JS error during delete:', err);
    }
  });
}

if (editPromptBtn) {
  editPromptBtn.addEventListener('click', () => {
    if (!currentPrompt) return;
    editPromptTitle.value = currentPrompt.title || '';
    editPromptContent.value = currentPrompt.content || currentPrompt.prompt || '';
    // Set category and tags in edit form
    if (editCategoryInput && currentPrompt.category) {
      editCategoryInput.value = currentPrompt.category;
    }
    if (editTagsInput && currentPrompt.tags) {
      Array.from(editTagsInput.options).forEach(opt => {
        opt.selected = currentPrompt.tags.includes(opt.value);
      });
    }
    editPromptForm.style.display = '';
    editPromptBtn.style.display = 'none';
    modalContent.style.display = 'none';
  });
}
  /**
   * Submit handler for editing a prompt.
   */
  editPromptForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    editFormError.textContent = '';
    if (!currentPrompt || !currentPrompt.id) return;
    const newTitle = editPromptTitle.value.trim();
    const newContent = editPromptContent.value.trim();
    const newCategory = editCategoryInput ? editCategoryInput.value : '';
    const newTags = editTagsInput ? getSelectedOptions(editTagsInput) : [];
    if (!newTitle || !newContent || !newCategory) {
      editFormError.textContent = 'Title, content, and category are required.';
      return;
    }
    // Prevent tags with commas in their names
    if (newTags.some(tagId => {
      const tag = tags.find(t => t.id === tagId);
      return tag && tag.name && tag.name.includes(',');
    })) {
      editFormError.textContent = 'Tags with commas are not allowed. Please remove them.';
      return;
    }
    const payload = {
      action: 'update',
      id: currentPrompt.id,
      title: newTitle,
      content: newContent,
      description: currentPrompt.description || '',
      category: newCategory,
      tags: newTags
    };
    console.log('[DEBUG] Sending update request:', payload);
    try {
      const res = await fetch('/api/prompts.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log('[DEBUG] Update response:', data);
      if (data.ok) {
        editFormError.textContent = '';
        closeModal();
        showToast('Prompt updated successfully!');
        fetchPrompts();
      } else {
        editFormError.textContent = 'Failed to update prompt: ' + (data.error || 'Unknown error');
        alert('Failed to update prompt: ' + (data.error || 'Unknown error'));
        console.error('[DEBUG] Update error:', data);
      }
    } catch (err) {
      editFormError.textContent = 'Error updating prompt. Please check your network connection or try again later.';
      console.error('[DEBUG] Network or JS error during update:', err);
    }
  });
  editPromptTitle.addEventListener('input', () => { editFormError.textContent = ''; });
  editPromptContent.addEventListener('input', () => {
    editFormError.textContent = '';
    if (editPreview) editPreview.innerHTML = renderMarkdownToHTML(editPromptContent.value);
  });
  if (editCategoryInput) editCategoryInput.addEventListener('change', () => { editFormError.textContent = ''; });
  if (editTagsInput) editTagsInput.addEventListener('change', () => { editFormError.textContent = ''; });

  const formError = document.getElementById('form-error');
  /**
   * Submit handler for adding a new prompt.
   */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const category = categoryInput ? categoryInput.value : '';
    const tagsSelected = tagsInput ? getSelectedOptions(tagsInput) : [];
    console.log('[DEBUG] Add Prompt Submit:', { title, content, category, tags: tagsSelected });

    // Frontend validation for category and tags
    if (!title || !content || !category) {
      formError.textContent = 'Title, content, and category are required.';
      console.error('[DEBUG] Validation failed: missing required fields', { title, content, category });
      return;
    }
    if (typeof category !== 'string' || category.trim() === '') {
      formError.textContent = 'A valid category must be selected.';
      console.error('[DEBUG] Validation failed: invalid category', { category });
      return;
    }
    if (!Array.isArray(tagsSelected)) {
      formError.textContent = 'Tags must be an array (can be empty).';
      console.error('[DEBUG] Validation failed: tags not array', { tagsSelected });
      return;
    }
    // Prevent tags with commas in their names
    if (tagsSelected.some(tagId => {
      const tag = tags.find(t => t.id === tagId);
      return tag && tag.name && tag.name.includes(',');
    })) {
      formError.textContent = 'Tags with commas are not allowed. Please remove them.';
      return;
    }
    try {
      const payload = {
        action: 'create',
        title,
        content,
        description: '',
        category,
        tags: tagsSelected
      };
      console.log('[DEBUG] Sending POST to /api/prompts.php:', payload);
      const res = await fetch('/api/prompts.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log('[DEBUG] Response from /api/prompts.php:', data);
      if (data.ok) {
        titleInput.value = '';
        contentInput.value = '';
        if (categoryInput) categoryInput.selectedIndex = 0;
        if (tagsInput) Array.from(tagsInput.options).forEach(opt => (opt.selected = false));
        formError.textContent = '';
        fetchPrompts();
      } else {
        formError.textContent = 'Failed to add prompt: ' + (data.error || 'Unknown error');
        console.error('[DEBUG] Failed to add prompt:', data);
      }
    } catch (err) {
      formError.textContent = 'Error adding prompt. See console for details.';
      console.error('[DEBUG] Network or JS error during add prompt:', err);
    }
  });
  titleInput.addEventListener('input', () => { formError.textContent = ''; });
  contentInput.addEventListener('input', () => {
    formError.textContent = '';
    if (addPreview) addPreview.innerHTML = renderMarkdownToHTML(contentInput.value);
  });
  if (categoryInput) categoryInput.addEventListener('change', () => { formError.textContent = ''; });
  if (tagsInput) tagsInput.addEventListener('change', () => { formError.textContent = ''; });

  // --- Add Category/Tag Button Logic and Empty State Handling ---
  /**
   * Load categories and tags from backend, then update UI.
   */
  async function loadCategoriesAndTags() {
    try {
      const [catRes, tagRes] = await Promise.all([
        fetch('/categories.json'),
        fetch('/tags.json')
      ]);
      categories = await catRes.json();
      tags = await tagRes.json();

      /**
        * Populate category <select> elements in add/edit forms and filter dropdown.
        */
      function populateCategories() {
        if (categoryInput) {
          categoryInput.innerHTML = categories.map(
            c => `<option value="${c.id}">${c.name}</option>`
          ).join('');
        }
        if (editCategoryInput) {
          editCategoryInput.innerHTML = categories.map(
            c => `<option value="${c.id}">${c.name}</option>`
          ).join('');
        }
        // Populate filter dropdown
        if (filterCategory) {
          filterCategory.innerHTML = `<option value="">All</option>` +
            categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
          filterCategory.value = filterCategoryValue;
        }
        // Disable add form if no categories
        if (categoryInput && categories.length === 0) {
          categoryInput.disabled = true;
          form.querySelector('button[type="submit"]').disabled = true;
          formError.textContent = 'Please add a category before creating prompts.';
        } else if (categoryInput) {
          categoryInput.disabled = false;
          form.querySelector('button[type="submit"]').disabled = false;
          formError.textContent = '';
        }
      }
      /**
       * Populate tag <select> elements in add/edit forms.
       */
      function populateTags() {
        if (tagsInput) {
          tagsInput.innerHTML = tags
            .filter(t => !t.name.includes(','))
            .map(t => `<option value="${t.id}">${t.name}</option>`)
            .join('');
          if (tags.length === 0) {
            tagsInput.disabled = true;
            const tagCta = document.getElementById('add-tag-btn');
            if (tagCta) tagCta.textContent = '+ Add First Tag';
          } else {
            tagsInput.disabled = false;
            const tagCta = document.getElementById('add-tag-btn');
            if (tagCta) tagCta.textContent = '+ Add Tag';
          }
        }
        if (editTagsInput) {
          editTagsInput.innerHTML = tags
            .filter(t => !t.name.includes(','))
            .map(t => `<option value="${t.id}">${t.name}</option>`)
            .join('');
          if (tags.length === 0) {
            editTagsInput.disabled = true;
            const tagCta = document.getElementById('edit-add-tag-btn');
            if (tagCta) tagCta.textContent = '+ Add First Tag';
          } else {
            editTagsInput.disabled = false;
            const tagCta = document.getElementById('edit-add-tag-btn');
            if (tagCta) tagCta.textContent = '+ Add Tag';
          }
        }
        // Populate tag filter dropdown with unique tag names
        if (filterTag) {
          const tagNames = Array.from(new Set(tags.map(t => t.name)));
          filterTag.innerHTML = `<option value="">All</option>` +
            tagNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
          filterTag.value = filterTagName;
        }
      }
      populateCategories();
      populateTags();

      // Add Category logic
      // --- Add Category logic ---
      const addCategoryBtn = document.getElementById('add-category-btn');
      if (addCategoryBtn) {
        addCategoryBtn.onclick = async () => {
          const name = prompt('Enter new category name:');
          if (!name) return;
          try {
            const res = await fetch('/api/categories.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name })
            });
            const data = await res.json();
            if (data.ok && data.category) {
              await loadCategoriesAndTags();
              if (categoryInput) {
                categoryInput.value = data.category.id;
                if (titleInput) titleInput.focus();
              }
              if (editCategoryInput) editCategoryInput.value = data.category.id;
            } else {
              alert('Failed to add category: ' + (data.error || 'Unknown error'));
            }
          } catch (err) {
            formError.textContent = 'Error adding category.. Please check your network connection or try again later.';
            console.error(err);
          }
        };
      }
      // --- Add Category from edit form ---
      const editAddCategoryBtn = document.getElementById('edit-add-category-btn');
      if (editAddCategoryBtn) {
        editAddCategoryBtn.onclick = async () => {
          const name = prompt('Enter new category name:');
          if (!name) return;
          try {
            const res = await fetch('/api/categories.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name })
            });
            const data = await res.json();
            if (data.ok && data.category) {
              await loadCategoriesAndTags();
              if (editCategoryInput) editCategoryInput.value = data.category.id;
            } else {
              alert('Failed to add category: ' + (data.error || 'Unknown error'));
            }
          } catch (err) {
            formError.textContent = 'Error adding category.. Please check your network connection or try again later.';
            console.error(err);
          }
        };
      }

      // Add Tag logic
      // --- Add Tag logic ---
      const addTagBtn = document.getElementById('add-tag-btn');
      if (addTagBtn) {
        addTagBtn.onclick = async () => {
          const input = prompt('Enter new tag name(s), separated by commas:');
          if (!input) return;
          const tagNames = input.split(',').map(t => t.trim()).filter(Boolean);
          let anyInvalid = false;
          for (const tagName of tagNames) {
            if (!tagName || tagName.includes(',')) {
              anyInvalid = true;
              continue;
            }
            try {
              const res = await fetch('/api/tags.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: tagName })
              });
              const data = await res.json();
              if (data.ok && data.tag) {
                await loadCategoriesAndTags();
                if (tagsInput) {
                  Array.from(tagsInput.options).forEach(opt => {
                    if (opt.value === data.tag.id) opt.selected = true;
                  });
                  tagsInput.focus();
                }
              } else {
                showToast('Failed to add tag: ' + (data.error || 'Unknown error'));
              }
            } catch (err) {
              formError.textContent = 'Error adding tag.. Please check your network connection or try again later.';
              console.error(err);
            }
          }
          if (anyInvalid) showToast('Invalid tag(s) skipped (no commas allowed, no empty tags)');
        };
      }
      // --- Add Tag from edit form ---
      const editAddTagBtn = document.getElementById('edit-add-tag-btn');
      if (editAddTagBtn) {
        editAddTagBtn.onclick = async () => {
          const input = prompt('Enter new tag name(s), separated by commas:');
          if (!input) return;
          const tagNames = input.split(',').map(t => t.trim()).filter(Boolean);
          let anyInvalid = false;
          for (const tagName of tagNames) {
            if (!tagName || tagName.includes(',')) {
              anyInvalid = true;
              continue;
            }
            try {
              const res = await fetch('/api/tags.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: tagName })
              });
              const data = await res.json();
              if (data.ok && data.tag) {
                await loadCategoriesAndTags();
                if (editTagsInput) {
                  Array.from(editTagsInput.options).forEach(opt => {
                    if (opt.value === data.tag.id) opt.selected = true;
                  });
                  editTagsInput.focus();
                }
              } else {
                showToast('Failed to add tag: ' + (data.error || 'Unknown error'));
              }
            } catch (err) {
              formError.textContent = 'Error adding tag.. Please check your network connection or try again later.';
              console.error(err);
            }
          }
          if (anyInvalid) showToast('Invalid tag(s) skipped (no commas allowed, no empty tags)');
        };
      }
    } catch (err) {
      console.error('Failed to load categories or tags', err);
    }
  }
  // Initial load of categories/tags and prompts
  loadCategoriesAndTags();
  fetchPrompts();

  // --- Filter event listeners ---
  if (filterCategory) {
    filterCategory.addEventListener('change', () => {
      filterCategoryValue = filterCategory.value;
      renderPrompts();
    });
  }
  if (filterTag) {
    filterTag.addEventListener('change', () => {
      filterTagName = filterTag.value;
      renderPrompts();
    });
  }
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      filterCategoryValue = '';
      filterTagName = '';
      if (filterCategory) filterCategory.value = '';
      if (filterTag) filterTag.value = '';
      renderPrompts();
    });
  }

  // --- Search input event listeners ---
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim();
      shownCount = 0; // Reset pagination on new search
      renderPrompts();
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchQuery = searchInput.value.trim();
        shownCount = 0;
        renderPrompts();
      }
    });
  }
});