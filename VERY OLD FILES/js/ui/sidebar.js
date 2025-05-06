// ui/sidebar.js - Sidebar initialization and logic (2025 Rebuild)

import { fetchCategories } from '../api/categories.js';
import { fetchTags } from '../api/tags.js';

export function initSidebar() {
  // Sidebar toggle
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');
  console.log('[Sidebar] initSidebar called');
  if (sidebar && toggleBtn) {
    console.log('[Sidebar] Sidebar and toggleBtn found');
    toggleBtn.addEventListener('click', () => {
      const expanded = sidebar.getAttribute('aria-expanded') === 'true';
      sidebar.setAttribute('aria-expanded', String(!expanded));
      sidebar.classList.toggle('open');
      toggleBtn.setAttribute('aria-pressed', String(!expanded));
      console.log('[Sidebar] Sidebar toggled', { expanded: !expanded });
    });
  } else {
    console.warn('[Sidebar] Sidebar or toggleBtn not found', { sidebar, toggleBtn });
  }

  // Load and render categories
  const categoryList = document.getElementById('category-list');
  if (categoryList) {
    console.log('[Sidebar] categoryList found');
    categoryList.innerHTML = '<li>Loading categories...</li>';
    fetchCategories()
      .then(categories => {
        console.log('[Sidebar] fetchCategories resolved', categories);
        if (Array.isArray(categories) && categories.length > 0) {
          categoryList.innerHTML = categories
            .map(cat => `<li tabindex="0" role="button" aria-label="Category: ${cat.name}">${cat.name}</li>`)
            .join('');
          console.log('[Sidebar] Rendered categories', categories.map(c => c.name));
        } else {
          categoryList.innerHTML = '<li class="empty-state" aria-live="polite">No categories found. <span class="hint">Add a category to get started.</span></li>';
          console.warn('[Sidebar] No categories found (empty state rendered)');
        }
        // Add click event for filtering by category
        categoryList.querySelectorAll('li[tabindex="0"]').forEach(li => {
          li.addEventListener('click', () => {
            console.log('[Sidebar] Category clicked', li.textContent);
            window.dispatchEvent(new CustomEvent('filterPrompts', { detail: { category: li.textContent } }));
          });
        });
      })
      .catch(err => {
        categoryList.innerHTML = '<li>Error loading categories.</li>';
        console.error('[Sidebar] Failed to load categories', err);
      });
  } else {
    console.warn('[Sidebar] categoryList not found');
  }

  // Load and render tags
  const tagList = document.getElementById('tag-list');
  if (tagList) {
    console.log('[Sidebar] tagList found');
    tagList.innerHTML = '<li>Loading tags...</li>';
    fetchTags()
      .then(tags => {
        console.log('[Sidebar] fetchTags resolved', tags);
        if (Array.isArray(tags) && tags.length > 0) {
          tagList.innerHTML = tags
            .map(tag => `<li tabindex="0" role="button" aria-label="Tag: ${tag.name}">${tag.name}</li>`)
            .join('');
          console.log('[Sidebar] Rendered tags', tags.map(t => t.name));
        } else {
          tagList.innerHTML = '<li class="empty-state" aria-live="polite">No tags found. <span class="hint">Add a tag to get started.</span></li>';
          console.warn('[Sidebar] No tags found (empty state rendered)');
        }
        // Add click event for filtering by tag
        tagList.querySelectorAll('li[tabindex="0"]').forEach(li => {
          li.addEventListener('click', () => {
            console.log('[Sidebar] Tag clicked', li.textContent);
            window.dispatchEvent(new CustomEvent('filterPrompts', { detail: { tag: li.textContent } }));
          });
        });
      })
      .catch(err => {
        tagList.innerHTML = '<li>Error loading tags.</li>';
        console.error('[Sidebar] Failed to load tags', err);
      });
  } else {
    console.warn('[Sidebar] tagList not found');
  }

  // "My Prompts" toggle
  const myPromptsBtn = document.getElementById('show-my-prompts');
  if (myPromptsBtn) {
    console.log('[Sidebar] myPromptsBtn found');
    myPromptsBtn.addEventListener('click', () => {
      myPromptsBtn.classList.toggle('active');
      const showMine = myPromptsBtn.classList.contains('active');
      console.log('[Sidebar] My Prompts toggled', { showMine });
      window.dispatchEvent(new CustomEvent('filterPrompts', { detail: { myPrompts: showMine } }));
    });
  } else {
    console.warn('[Sidebar] myPromptsBtn not found');
  }
}