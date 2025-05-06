/**
 * ui/commentsResults.js - Comments and Results UI (2025 Rebuild, "stupid simple")
 * [AUDITFIX] Refactored for debug logging, modularity, accessibility, and maintainability.
 */

import { fetchComments, addComment, deleteComment } from '../api/comments.js';
import { fetchResults, addResult, deleteResult } from '../api/results.js';
import { escapeHtml, debugLog } from '../util/helpers.js';
import { showToast } from '../ui/toast.js';
import { showConfirmModal } from './modals.js';

/**
 * Helper to optimistically remove a list item and restore on error.
 */
function handleListItemOptimisticRemove(li, action, restoreCallback) {
  if (li) {
    li.style.opacity = '0.5';
    li.style.pointerEvents = 'none';
  }
  return action()
    .catch((err) => {
      debugLog("[DEBUG] Optimistic remove failed, restoring item.", err);
      if (li) {
        li.style.opacity = '';
        li.style.pointerEvents = '';
      }
      if (restoreCallback) restoreCallback();
      throw err;
    });
}

/**
 * Accessibility: Focus trap for modal.
 */
function trapFocus(modal) {
  if (!modal) return;
  const focusableSelectors = [
    'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
    'input[type="text"]:not([disabled])', 'input[type="submit"]:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ];
  const focusableEls = modal.querySelectorAll(focusableSelectors.join(','));
  if (focusableEls.length === 0) return;
  const firstEl = focusableEls[0];
  const lastEl = focusableEls[focusableEls.length - 1];

  modal.addEventListener('keydown', function(e) {
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
    if (e.key === 'Escape') {
      modal.style.display = 'none';
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      debugLog("[DEBUG] Result modal closed via Escape");
    }
  });
}

export async function renderCommentsResults(promptId, container) {
  debugLog("[DEBUG] renderCommentsResults called with promptId:", promptId, "container:", container);
  if (!container) {
    debugLog("[DEBUG] renderCommentsResults: container is null/undefined");
    return;
  }
  // Add ARIA-live region for dynamic updates
  container.innerHTML = `
    <div id="comments-results-live" aria-live="polite" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;"></div>
    <div>Loading comments and results...</div>
  `;

  try {
    debugLog("[DEBUG] Fetching comments and results for promptId:", promptId);
    const [{ comments = [] }, { results = [] }] = await Promise.all([
      fetchComments(promptId),
      fetchResults(promptId)
    ]);
    debugLog("[DEBUG] Comments fetched:", comments);
    debugLog("[DEBUG] Results fetched:", results);

    // Render comments
    const commentsHtml = `
      <section style="margin-bottom:24px;">
        <h4 style="font-size:16px;font-weight:600;color:#E0D0FF;margin-bottom:8px;">Comments</h4>
        <ul id="comments-list" style="display:flex;flex-direction:column;gap:12px;padding:0;margin:0;">
          ${(comments || []).map(c => `
            <li style="display:flex;align-items:flex-start;gap:12px;background:#261A40;border-radius:10px;padding:12px 12px 12px 16px;margin-bottom:0;">
              <div style="flex:1;">
                <div style="color:#BFAEF5;font-size:13px;font-weight:600;margin-bottom:2px;">
                  User: ${c.author ? escapeHtml(c.author) : "Guest"}
                </div>
                <div style="font-size:15px;color:#F3EFFF;word-break:break-word;white-space:pre-line;">${escapeHtml(c.content || "")}</div>
              </div>
              <button class="delete-comment-btn" data-id="${c.id}" aria-label="Delete comment"
                style="margin-left:auto;background:#F44336;color:#fff;padding:4px 10px;border-radius:9999px;font-size:13px;font-weight:500;box-shadow:0 1px 4px #0002;">Delete</button>
            </li>
          `).join('')}
        </ul>
        <form id="add-comment-form" style="margin-top:8px;display:flex;gap:8px;align-items:center;">
          <input name="text" type="text" placeholder="Add a comment..." required
            style="flex:1;height:44px;padding:10px 12px;background:#1C1433;border-radius:8px;color:#F3EFFF;border:none;font-size:15px;"/>
          <button type="submit"
            style="background:linear-gradient(90deg,#7B3FE4 60%,#4F9CFF 100%);color:#fff;padding:8px 16px;border-radius:9999px;font-weight:500;font-size:15px;">Add</button>
        </form>
      </section>
    `;

    // Render results
    const resultsHtml = `
      <section>
        <h4 style="font-size:16px;font-weight:600;color:#E0D0FF;margin-bottom:8px;">Results</h4>
        <ul id="results-list" style="display:flex;flex-direction:column;gap:12px;padding:0;margin:0;">
          ${(results || []).map(r => `
            <li style="display:flex;align-items:flex-start;gap:12px;background:#261A40;border-radius:10px;padding:12px 12px 12px 16px;margin-bottom:0;">
              <div style="flex:1;max-width:100%;">
                <div style="color:#BFAEF5;font-size:13px;font-weight:600;margin-bottom:2px;">
                  User: ${r.author ? escapeHtml(r.author) : "Guest"}
                </div>
                <div style="font-size:15px;color:#F3EFFF;word-break:break-word;white-space:pre-line;max-height:220px;overflow:auto;padding:4px 0 2px 0;background:#1C1433;border-radius:6px;">
                  ${escapeHtml(r.content || "")}
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;">
                <button class="view-result-btn" data-content="${escapeHtml(r.content || '')}" aria-label="View result"
                  style="background:linear-gradient(90deg,#7B3FE4 60%,#4F9CFF 100%);color:#fff;padding:4px 10px;border-radius:9999px;font-size:13px;font-weight:500;box-shadow:0 1px 4px #0002;margin-bottom:4px;">View</button>
                <button class="delete-result-btn" data-id="${r.id}" aria-label="Delete result"
                  style="background:#F44336;color:#fff;padding:4px 10px;border-radius:9999px;font-size:13px;font-weight:500;box-shadow:0 1px 4px #0002;">Delete</button>
              </div>
            </li>
          `).join('')}
        </ul>
        <form id="add-result-form" style="margin-top:8px;display:flex;gap:8px;align-items:flex-end;">
          <textarea name="value" placeholder="Add a result (long text supported)..." required
            style="flex:1;min-height:80px;max-height:220px;padding:12px;background:#1C1433;border-radius:10px;color:#F3EFFF;border:none;font-size:15px;resize:vertical;"></textarea>
          <button type="submit"
            style="background:linear-gradient(90deg,#7B3FE4 60%,#4F9CFF 100%);color:#fff;padding:8px 16px;border-radius:9999px;font-weight:500;font-size:15px;">Add</button>
        </form>
      </section>
    `;

    container.innerHTML = commentsHtml + resultsHtml;
    debugLog("[DEBUG] Comments and results rendered in DOM. Comments count:", comments.length, "Results count:", results.length);

    // Add comment
    const addCommentForm = container.querySelector('#add-comment-form');
    if (addCommentForm) {
      addCommentForm.onsubmit = async (e) => {
        e.preventDefault();
        const content = addCommentForm.text.value.trim();
        if (!content) {
          debugLog("[DEBUG] Add comment: empty content, skipping");
          return;
        }
        debugLog("[DEBUG] Add comment: submitting", { promptId, content });
        try {
          const result = await addComment(promptId, { content });
          debugLog("[DEBUG] Add comment: API result", result);
          renderCommentsResults(promptId, container);
        } catch (err) {
          showToast && showToast('Failed to add comment', 'danger');
          debugLog("[DEBUG] Add comment: error", err);
        }
      };
      debugLog("[DEBUG] Add comment form handler attached");
    }

    // Delete comment
    container.querySelectorAll('.delete-comment-btn').forEach(btn => {
      btn.onclick = async () => {
        const commentId = btn.getAttribute('data-id');
        debugLog("[DEBUG] Delete comment button clicked for commentId:", commentId);
        if (await showConfirmModal('Delete this comment?')) {
          const li = btn.closest('li');
          await handleListItemOptimisticRemove(
            li,
            async () => {
              const result = await deleteComment(commentId);
              debugLog("[DEBUG] Delete comment: API result", result);
              if (li) {
                debugLog("[DEBUG] About to remove comment li from DOM. li.id:", li.id, "li.textContent:", li.textContent);
              }
              if (li && li.parentNode) {
                li.parentNode.removeChild(li);
                const stillExists = !!document.querySelector(`.delete-comment-btn[data-id="${commentId}"]`);
                debugLog("[DEBUG] Comment li removed from DOM. Still exists in DOM?", stillExists);
              }
              await renderCommentsResults(promptId, container);
            },
            () => {
              showToast && showToast('Failed to delete comment', 'danger');
            }
          );
        }
      };
      debugLog("[DEBUG] Delete comment handler attached for commentId:", btn.getAttribute('data-id'));
    });

    // Add result
    const addResultForm = container.querySelector('#add-result-form');
    if (addResultForm) {
      addResultForm.onsubmit = async (e) => {
        e.preventDefault();
        const content = addResultForm.value.value.trim();
        if (!content) {
          debugLog("[DEBUG] Add result: empty content, skipping");
          return;
        }
        debugLog("[DEBUG] Add result: submitting", { promptId, content });
        try {
          const result = await addResult(promptId, { content });
          debugLog("[DEBUG] Add result: API result", result);
          renderCommentsResults(promptId, container);
        } catch (err) {
          showToast && showToast('Failed to add result', 'danger');
          debugLog("[DEBUG] Add result: error", err);
        }
      };
      debugLog("[DEBUG] Add result form handler attached");
    }

    // Delete result
    container.querySelectorAll('.delete-result-btn').forEach(btn => {
      btn.onclick = async () => {
        const resultId = btn.getAttribute('data-id');
        debugLog("[DEBUG] Delete result button clicked for resultId:", resultId);
        if (await showConfirmModal('Delete this result?')) {
          const li = btn.closest('li');
          await handleListItemOptimisticRemove(
            li,
            async () => {
              const result = await deleteResult(resultId);
              debugLog("[DEBUG] Delete result: API result", result);
              if (li) {
                debugLog("[DEBUG] About to remove result li from DOM. li.id:", li.id, "li.textContent:", li.textContent);
              }
              if (li && li.parentNode) {
                li.parentNode.removeChild(li);
                const stillExists = !!document.querySelector(`.delete-result-btn[data-id="${resultId}"]`);
                debugLog("[DEBUG] Result li removed from DOM. Still exists in DOM?", stillExists);
              }
              await renderCommentsResults(promptId, container);
            },
            () => {
              showToast && showToast('Failed to delete result', 'danger');
            }
          );
        }
      };
      debugLog("[DEBUG] Delete result handler attached for resultId:", btn.getAttribute('data-id'));
    });

    // View result modal logic
    container.querySelectorAll('.view-result-btn').forEach(btn => {
      btn.onclick = () => {
        const content = btn.getAttribute('data-content') || '';
        const modal = document.getElementById('result-modal');
        const modalContent = document.getElementById('result-modal-content');
        debugLog("[DEBUG] View result button clicked. Content:", content);
        if (modal && modalContent) {
          modalContent.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-word;font-size:15px;color:#F3EFFF;background:#1C1433;border-radius:8px;padding:16px;max-height:60vh;overflow:auto;">${content}</pre>`;
          modal.style.display = 'flex';
          modal.classList.add('active');
          modal.setAttribute('aria-hidden', 'false');
          document.body.classList.add('modal-open');
          // Accessibility: focus trap
          trapFocus(modal);
          // Focus the close button if available
          const closeBtn = document.getElementById('close-result-modal-btn');
          if (closeBtn) {
            closeBtn.focus();
            closeBtn.onclick = () => {
              modal.style.display = 'none';
              modal.classList.remove('active');
              modal.setAttribute('aria-hidden', 'true');
              document.body.classList.remove('modal-open');
              debugLog("[DEBUG] Result modal closed");
            };
          }
        }
      };
      debugLog("[DEBUG] View result handler attached");
    });

  } catch (err) {
    container.innerHTML = '<div style="color:red;">Error loading comments or results.</div>';
    if (typeof showToast === "function") showToast('Error loading comments or results', 'danger');
    debugLog('[DEBUG] CommentsResults: Failed to load', err);
  }
}