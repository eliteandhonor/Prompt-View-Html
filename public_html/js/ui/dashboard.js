/**
 * Dashboard UI for Prompt Management App (2025 Overhaul)
 * Features: Quick stats, recent prompts, quick actions, responsive layout
 */

import { fetchPrompts } from '../api/prompts.js';
import { initPromptList } from './promptList.js';

export function initDashboard() {
  console.log("initDashboard: function called");
  const dashboard = document.getElementById('dashboard');
  if (!dashboard) return;

  dashboard.innerHTML = `
    <section class="dashboard-header">
      <h1>Dashboard</h1>
      <div class="dashboard-actions">
        <button id="dashboard-add-prompt" class="primary">Add Prompt</button>
        <button id="dashboard-import-prompts">Import</button>
        <button id="dashboard-bulk-actions">Bulk Actions</button>
      </div>
    </section>
    <section class="dashboard-stats" id="dashboard-stats">
      <div class="stat-card"><span id="stat-prompt-count">0</span><label>Prompts</label></div>
      <div class="stat-card"><span id="stat-category-count">0</span><label>Categories</label></div>
      <div class="stat-card"><span id="stat-tag-count">0</span><label>Tags</label></div>
    </section>
    <section class="dashboard-recent">
      <h2>Recent Prompts</h2>
      <div id="dashboard-recent-prompts" class="recent-prompts-list"></div>
    </section>
    <section class="dashboard-activity">
      <h2>Recent Activity</h2>
      <div id="dashboard-activity-feed" class="activity-feed"></div>
    </section>
  `;

  // Quick actions
  document.getElementById('dashboard-add-prompt')?.addEventListener('click', () => {
    console.log("dashboard-add-prompt button clicked");
    // Switch to Prompts view and open Add Prompt modal
    const dashboardSection = document.getElementById('dashboard-section');
    const promptListSection = document.getElementById('prompt-list-section');
    const dashboardBtn = document.getElementById('nav-dashboard-btn');
    const promptsBtn = document.getElementById('nav-prompts-btn');
    if (dashboardSection && promptListSection && dashboardBtn && promptsBtn) {
      dashboardSection.style.display = 'none';
      promptListSection.style.display = '';
      initPromptList();
      dashboardBtn.classList.remove('active');
      promptsBtn.classList.add('active');
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('openCrudModal', { detail: { mode: 'add' } }));
    }, 0);
  });
  document.getElementById('dashboard-import-prompts')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Import not yet implemented', type: 'info' } }));
  });
  document.getElementById('dashboard-bulk-actions')?.addEventListener('click', () => {
    // Switch to Prompts view and open Bulk Actions modal
    const dashboardSection = document.getElementById('dashboard-section');
    const promptListSection = document.getElementById('prompt-list-section');
    const dashboardBtn = document.getElementById('nav-dashboard-btn');
    const promptsBtn = document.getElementById('nav-prompts-btn');
    if (dashboardSection && promptListSection && dashboardBtn && promptsBtn) {
      dashboardSection.style.display = 'none';
      promptListSection.style.display = '';
      initPromptList();
      dashboardBtn.classList.remove('active');
      promptsBtn.classList.add('active');
    }
    window.dispatchEvent(new CustomEvent('openBulkActionsModal'));
  });

  // Fetch and display stats and recent prompts
  fetchPrompts().then(prompts => {
    document.getElementById('stat-prompt-count').textContent = prompts.length;
    // For now, categories/tags are placeholders
    document.getElementById('stat-category-count').textContent = '—';
    document.getElementById('stat-tag-count').textContent = '—';

    // Recent prompts
    const recent = prompts.slice(-5).reverse();
    document.getElementById('dashboard-recent-prompts').innerHTML = recent.length
      ? recent.map(p => `
        <div class="recent-prompt-card">
          <strong>${p.title}</strong>
          <span>${p.description || ''}</span>
          <span class="recent-date">${p.updated_at ? new Date(p.updated_at).toLocaleString() : ''}</span>
        </div>
      `).join('')
      : '<div>No recent prompts.</div>';
  });

  // Activity feed placeholder
  document.getElementById('dashboard-activity-feed').innerHTML = '<div>No recent activity.</div>';
}