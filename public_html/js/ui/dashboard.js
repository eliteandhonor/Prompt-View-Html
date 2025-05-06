/**
 * Dashboard UI for Prompt Management App (2025 Overhaul)
 * Features: Quick stats, recent prompts, quick actions, responsive layout
 */

import { fetchPrompts } from '../api/prompts.js';
import { initPromptList } from './promptList.js';
import { getCategories, getTags } from '../state/appState.js';
import { debugLog } from '../util/helpers.js';
import { showLoading, hideLoading } from './progress.js';

import { renderPromptBlock } from './renderPromptBlock.js';

/**
 * Render a stat card for the dashboard.
 * @param {string} id - The span element id for the stat value.
 * @param {string} label - The label for the stat.
 * @param {string} ariaLabel - The ARIA label for accessibility.
 * @param {string} testId - The data-testid for testing.
 * @returns {string} HTML string for the stat card.
 */
function renderStatCard(id, label, ariaLabel, testId) {
  return `<div class="stat-card" role="region" aria-label="${ariaLabel}" data-testid="${testId}">
    <span id="${id}">0</span><label>${label}</label>
  </div>`;
}


/**
 * Initialize the Dashboard UI.
 * Adds debug logging, accessibility, error handling, and modularizes repeated logic.
 */
export function initDashboard() {
  debugLog("initDashboard: function called");
  const dashboard = document.getElementById('dashboard');
  if (!dashboard) {
    debugLog("initDashboard: #dashboard element not found, aborting.");
    return;
  }

  dashboard.innerHTML = `
    <section class="dashboard-header" role="region" aria-label="Dashboard Header">
      <h1>Dashboard</h1>
      <div class="dashboard-actions">
        <button id="dashboard-add-prompt" class="primary" data-testid="dashboard-add-prompt-btn" aria-label="Add Prompt" tabindex="0">Add Prompt</button>
        <button id="dashboard-import-prompts" data-testid="dashboard-import-prompts-btn" aria-label="Import Prompts" tabindex="0">Import</button>
        <button id="dashboard-bulk-actions" data-testid="dashboard-bulk-actions-btn" aria-label="Bulk Actions" tabindex="0">Bulk Actions</button>
      </div>
    </section>
    <section class="dashboard-stats" id="dashboard-stats" role="region" aria-label="Dashboard Statistics">
      ${renderStatCard('stat-prompt-count', 'Prompts', 'Prompt count', 'stat-prompt-count-card')}
      ${renderStatCard('stat-category-count', 'Categories', 'Category count', 'stat-category-count-card')}
      ${renderStatCard('stat-tag-count', 'Tags', 'Tag count', 'stat-tag-count-card')}
    </section>
    <section class="dashboard-recent" role="region" aria-label="Recent Prompts">
      <h2>Recent Prompts</h2>
      <div id="dashboard-recent-prompts" class="recent-prompts-list"></div>
    </section>
    <section class="dashboard-activity" role="region" aria-label="Recent Activity">
      <h2>Recent Activity</h2>
      <div id="dashboard-activity-feed" class="activity-feed"></div>
    </section>
  `;

  // Helper to switch dashboard/promptList views
  function switchToPromptList() {
    debugLog("switchToPromptList: called");
    const dashboardSection = document.getElementById('dashboard');
    const promptListSection = document.getElementById('prompt-list-section');
    const dashboardBtn = document.getElementById('nav-dashboard-btn');
    const promptsBtn = document.getElementById('nav-prompts-btn');
    if (dashboardSection && promptListSection && dashboardBtn && promptsBtn) {
      dashboardSection.style.display = 'none';
      promptListSection.style.display = '';
      initPromptList();
      dashboardBtn.classList.remove('active');
      promptsBtn.classList.add('active');
      debugLog("switchToPromptList: switched to prompt list view");
    } else {
      debugLog("switchToPromptList: one or more elements missing", { dashboardSection, promptListSection, dashboardBtn, promptsBtn });
    }
  }

  // Quick actions with debug logging and accessibility
  const addPromptBtn = document.getElementById('dashboard-add-prompt');
  if (addPromptBtn) {
    addPromptBtn.addEventListener('click', (e) => {
      debugLog("dashboard-add-prompt button clicked", e);
      switchToPromptList();
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('openCrudModal', { detail: { mode: 'add' } }));
        debugLog("openCrudModal event dispatched (add mode)");
      }, 0);
    });
    addPromptBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        addPromptBtn.click();
      }
    });
  }

  const importPromptsBtn = document.getElementById('dashboard-import-prompts');
  if (importPromptsBtn) {
    importPromptsBtn.addEventListener('click', (e) => {
      debugLog("dashboard-import-prompts button clicked", e);
      switchToPromptList();
      window.dispatchEvent(new CustomEvent('openBatchImportModal'));
      setTimeout(() => {
        debugLog("openBatchImportModal event dispatched");
      }, 100);
    });
    importPromptsBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        importPromptsBtn.click();
      }
    });
  }

  const bulkActionsBtn = document.getElementById('dashboard-bulk-actions');
  if (bulkActionsBtn) {
    bulkActionsBtn.addEventListener('click', (e) => {
      debugLog("dashboard-bulk-actions button clicked", e);
      switchToPromptList();
      window.dispatchEvent(new CustomEvent('openBulkActionsModal'));
      debugLog("openBulkActionsModal event dispatched");
    });
    bulkActionsBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        bulkActionsBtn.click();
      }
    });
  }
// Attach event listener to "Prompts" navigation button to switch to prompt list
  const navPromptsBtn = document.getElementById('nav-prompts-btn');
  if (navPromptsBtn) {
    navPromptsBtn.addEventListener('click', (e) => {
      debugLog("nav-prompts-btn clicked", e);
      switchToPromptList();
    });
    navPromptsBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navPromptsBtn.click();
      }
    });
  }

  // Fetch and display stats and recent prompts with error handling and debug logs
  (async () => {
    showLoading('Loading dashboard data...');
    debugLog("Fetching prompts for dashboard stats and recent list...");
    try {
      const prompts = await fetchPrompts();
      debugLog("Fetched prompts:", prompts);
    
      const statPromptCount = document.getElementById('stat-prompt-count');
      const statCategoryCount = document.getElementById('stat-category-count');
      const statTagCount = document.getElementById('stat-tag-count');
      if (statPromptCount) statPromptCount.textContent = prompts.length;
      if (statCategoryCount) statCategoryCount.textContent = getCategories().length;
      if (statTagCount) statTagCount.textContent = getTags().length;
    
      // Recent prompts
      const recent = prompts.slice(-5).reverse();
      const recentPromptsDiv = document.getElementById('dashboard-recent-prompts');
      if (recentPromptsDiv) {
        // Clear the container
        recentPromptsDiv.innerHTML = '';
        if (recent.length) {
          const categories = getCategories();
          const tags = getTags();
          recent.forEach(prompt => {
            const block = renderPromptBlock(prompt, categories, tags);
            block.addEventListener('promptBlock:activate', () => {
              window.dispatchEvent(new CustomEvent('openCrudModal', { detail: { mode: 'view', prompt } }));
            });
            recentPromptsDiv.appendChild(block);
          });
        } else {
          recentPromptsDiv.innerHTML = '<div>No recent prompts.</div>';
        }
        debugLog("Rendered recent prompts:", recent);
      }
    } catch (err) {
      debugLog("Error fetching prompts in dashboard:", err);
      const statPromptCount = document.getElementById('stat-prompt-count');
      const recentPromptsDiv = document.getElementById('dashboard-recent-prompts');
      if (statPromptCount) statPromptCount.textContent = '!';
      if (recentPromptsDiv) recentPromptsDiv.innerHTML = '<div role="alert" style="color:#e33;">Failed to load prompts.</div>';
    } finally {
      hideLoading();
    }
  })();

  // Activity feed placeholder with debug log
  const activityFeed = document.getElementById('dashboard-activity-feed');
  if (activityFeed) {
    activityFeed.innerHTML = '<div>No recent activity.</div>';
    debugLog("Dashboard activity feed placeholder rendered.");
  }
  debugLog("initDashboard: completed.");
}