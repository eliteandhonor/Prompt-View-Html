/**
 * ui/community.js - Community section: comments and results (2025 Rebuild, audit-overhauled)
 * Atomic fix: Refactored repeated placeholder rendering into a helper for maintainability.
 */

import { debugLog } from '../util/helpers.js';
import { fetchComments } from '../api/comments.js';
import { addComment } from '../api/comments.js';
import { fetchResults } from '../api/results.js';
import { escapeHtml } from '../util/helpers.js';
import { logError } from '../util/errorLog.js';
import { showToast } from './toast.js';
import { showConfirmModal } from './modals.js';

/**
 * Show an accessible toast and log invocation.
 * @param {'success'|'error'|'info'|'danger'} type
 * @param {string} message
 */
function showAccessibleToast(type, message) {
  debugLog('showAccessibleToast invoked', { type, message });
  showToast(message, { type });
}

/**
 * Show an accessible confirmation modal and log invocation.
 * @param {string} message
 * @returns {Promise<boolean>}
 */
function showAccessibleConfirm(message) {
  debugLog('showAccessibleConfirm invoked', { message });
  return showConfirmModal(message);
}

/**
 * Initialize the Community section (comments and results).
 * Adds debug logging, accessibility, and modularizes logic.
 */
/**
 * Initialize the Community section (comments and results).
 * @param {string} promptId - The ID of the prompt to fetch comments for.
 */
/**
 * Keyboard Shortcuts for Community UI Actions (2025-05-06)
 *
 * Shortcuts:
 *   - Alt+Shift+C: Focus the comment textarea (for rapid comment entry)
 *   - Alt+Shift+Enter: Submit the comment form (only if textarea is focused)
 *   - Alt+Shift+R: Refresh comments and results
 *
 * Rationale:
 *   - Uses Alt+Shift to avoid conflicts with common browser/system shortcuts (Ctrl, Meta, F-keys).
 *   - All shortcuts require two hands, reducing accidental activation.
 *   - No single-letter or navigation keys are used.
 *   - All actions are logged via debugLog for traceability.
 * Accessibility:
 *   - Shortcuts are non-destructive, do not interfere with screen readers, and are discoverable in code.
 *   - Focus/submit actions only operate if the relevant elements are present and enabled.
 *   - No shortcut disables or overrides browser/system accessibility features.
 */
export function initCommunity(promptId) {
  debugLog('initCommunity: entry', { promptId });
  renderCommentsSection(promptId);
  renderResultsSection(promptId);

  // Keyboard shortcut handler
  function communityShortcutHandler(e) {
    // Only respond to Alt+Shift+<Key> (not Ctrl/Meta)
    if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;

    // Focus comment textarea: Alt+Shift+C
    if (e.code === 'KeyC') {
      const textarea = document.getElementById('comment-content');
      if (textarea) {
        textarea.focus();
        debugLog('Shortcut: Focus comment textarea (Alt+Shift+C)');
        e.preventDefault();
      }
    }

    // Submit comment: Alt+Shift+Enter (only if textarea is focused)
    if (e.code === 'Enter') {
      const textarea = document.getElementById('comment-content');
      const form = document.getElementById('add-comment-form');
      if (
        textarea &&
        form &&
        document.activeElement === textarea &&
        !form.querySelector('#add-comment-submit')?.disabled
      ) {
        debugLog('Shortcut: Submit comment form (Alt+Shift+Enter)');
        form.requestSubmit();
        e.preventDefault();
      }
    }

    // Refresh comments/results: Alt+Shift+R
    if (e.code === 'KeyR') {
      debugLog('Shortcut: Refresh comments/results (Alt+Shift+R)');
      renderCommentsSection(promptId);
      renderResultsSection(promptId);
      e.preventDefault();
    }
  }

  // Attach shortcut handler (idempotent: only once per init)
  if (!window._communityShortcutsAttached) {
    window.addEventListener('keydown', communityShortcutHandler, true);
    window._communityShortcutsAttached = true;
    debugLog('Community keyboard shortcuts attached');
  }

  debugLog('initCommunity: exit');
}

/**
 * Render a status placeholder for loading or empty states.
 * @param {HTMLElement} container - The DOM element to render into.
 * @param {string} message - The message to display.
 * @param {string} [role="status"] - The ARIA role.
 * @param {string} [ariaLive="polite"] - The aria-live value.
 */
function renderStatusPlaceholder(container, message, role = "status", ariaLive = "polite") {
  if (container) {
    container.innerHTML = `
      <div role="${role}" aria-live="${ariaLive}" class="status-placeholder">
        <span>${message}</span>
      </div>
    `;
  }
}

/**
 * Render the comments section with placeholder UI and debug logging.
 */
/**
 * Render the comments section with placeholder UI and debug logging.
 * Adds granular debug logs for missing DOM elements and timeout events.
 */
/**
 * Render the comments section with real API integration, accessibility, and debug logging.
 * @param {string} promptId - The ID of the prompt to fetch comments for.
 */
async function renderCommentsSection(promptId) {
  debugLog('renderCommentsSection: entry', { promptId });
  const commentsList = document.getElementById('comments-list');
  const addCommentFormContainer = document.getElementById('add-comment-form-container');

  if (commentsList) {
    renderStatusPlaceholder(commentsList, 'Loading comments...');
    debugLog('renderCommentsSection: loading comments placeholder rendered');
    try {
      if (!promptId) {
        debugLog('renderCommentsSection: No promptId provided, cannot fetch comments');
        renderStatusPlaceholder(commentsList, 'No prompt selected. Cannot load comments.', "status", "polite");
        return;
      }
      debugLog('renderCommentsSection: fetching comments from API', { promptId });
      const response = await fetchComments(promptId);
      debugLog('renderCommentsSection: API fetch complete', { response });

      if (!response || !Array.isArray(response.comments)) {
        debugLog('renderCommentsSection: API response missing or malformed', { response });
        renderStatusPlaceholder(commentsList, 'No comments found.', "status", "polite");
        return;
      }

      if (response.comments.length === 0) {
        renderStatusPlaceholder(commentsList, 'No comments yet. Be the first to comment!', "status", "polite");
        debugLog('renderCommentsSection: no comments to render');
        return;
      }

      // Render comments accessibly
      commentsList.innerHTML = `
        <ul aria-label="Comments list" role="list" class="unstyled-list">
          ${response.comments.map(comment => `
            <li role="listitem" tabindex="0" aria-label="Comment by ${escapeHtml(comment.author || 'Anonymous')}">
              <div class="author-row">
                <strong>${escapeHtml(comment.author || 'Anonymous')}</strong>
                <span class="comment-date">
                  ${comment.created_at ? escapeHtml(comment.created_at) : ''}
                </span>
              </div>
              <div>${escapeHtml(comment.content)}</div>
            </li>
          `).join('')}
        </ul>
      `;
      debugLog('renderCommentsSection: comments rendered', { count: response.comments.length });
    } catch (err) {
      debugLog('renderCommentsSection: error fetching or rendering comments', { error: err });
      renderStatusPlaceholder(commentsList, 'Failed to load comments. Please try again later.', "alert", "assertive");
    }
  } else {
    debugLog('renderCommentsSection: #comments-list not found in DOM', { found: false });
  }

  if (addCommentFormContainer) {
    // Render the Add Comment form
    addCommentFormContainer.innerHTML = `
      <form id="add-comment-form" aria-label="Add a comment" novalidate>
        <div style="margin-bottom:0.5em;">
          <label for="comment-author" id="label-author" class="form-label-block">
            Name (optional)
          </label>
          <input
            id="comment-author"
            name="author"
            type="text"
            maxlength="40"
            autocomplete="username"
            aria-labelledby="label-author"
            class="input-full"
          />
        </div>
        <div style="margin-bottom:0.5em;">
          <label for="comment-content" id="label-content" class="form-label-block">
            Comment <span aria-hidden="true" class="required-asterisk">*</span>
          </label>
          <textarea
            id="comment-content"
            name="content"
            required
            minlength="2"
            maxlength="500"
            aria-labelledby="label-content"
            aria-required="true"
            rows="3"
            class="textarea-full"
          ></textarea>
        </div>
        <div id="add-comment-error" role="alert" aria-live="assertive" class="error-message"></div>
        <button
          id="add-comment-submit"
          type="submit"
          class="submit-btn"
        >
          Add Comment
        </button>
        <span id="add-comment-success" class="inline-success">Comment added!</span>
      </form>
    `;
    debugLog('renderCommentsSection: add comment form rendered');

    const form = addCommentFormContainer.querySelector('#add-comment-form');
    const authorInput = form.querySelector('#comment-author');
    const contentInput = form.querySelector('#comment-content');
    const errorDiv = form.querySelector('#add-comment-error');
    const submitBtn = form.querySelector('#add-comment-submit');
    const loadingSpan = form.querySelector('#add-comment-loading');
    const successSpan = form.querySelector('#add-comment-success');

    // Focus management: focus content on form render
    setTimeout(() => {
      contentInput.focus();
    }, 0);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorDiv.textContent = '';
      successSpan.style.display = 'none';

      // Input validation
      const author = authorInput.value.trim();
      const content = contentInput.value.trim();
      let errorMsg = '';
      if (content.length < 2) {
        errorMsg = 'Comment must be at least 2 characters.';
      } else if (content.length > 500) {
        errorMsg = 'Comment must be 500 characters or less.';
      }
      if (author.length > 40) {
        errorMsg = 'Name must be 40 characters or less.';
      }
      if (errorMsg) {
        showAccessibleToast('error', errorMsg);
        contentInput.focus();
        debugLog('addCommentForm: validation error', { errorMsg });
        return;
      }

      // Confirmation dialog before submission
      const confirmed = await showAccessibleConfirm('Submit this comment?');
      if (!confirmed) {
        debugLog('addCommentForm: submission cancelled by user');
        showAccessibleToast('info', 'Comment submission cancelled.');
        return;
      }

      // Submission logic
      submitBtn.disabled = true;
      loadingSpan.style.display = '';
      debugLog('addCommentForm: submitting', { promptId, author, content });

      try {
        const result = await addComment(promptId, { author, content });
        debugLog('addCommentForm: submission success', { result });
        loadingSpan.style.display = 'none';
        form.reset();
        showAccessibleToast('success', 'Comment added!');
        // Re-render comments after short delay for UX
        setTimeout(() => {
          renderCommentsSection(promptId);
        }, 800);
      } catch (err) {
        debugLog('addCommentForm: submission error', { error: err });
        logError('Failed to add comment', err && err.stack ? err.stack : String(err));
        loadingSpan.style.display = 'none';
        submitBtn.disabled = false;
        showAccessibleToast('error', 'Failed to add comment. Please try again.');
        // Focus error for accessibility
        errorDiv.focus();
      }
    });

    // Accessibility: allow error div to be focused
    errorDiv.setAttribute('tabindex', '-1');
  } else {
    debugLog('renderCommentsSection: #add-comment-form-container not found in DOM', { found: false });
  }
  debugLog('renderCommentsSection: exit');
}

/**
 * Render the results section with placeholder UI and debug logging.
 */
/**
 * Render the results section with placeholder UI and debug logging.
 * Adds granular debug logs for missing DOM elements and timeout events.
 */
/**
 * Render the results section with real API integration, accessibility, and debug logging.
 * @param {string} promptId - The ID of the prompt to fetch results for.
 */
async function renderResultsSection(promptId) {
  debugLog('renderResultsSection: entry', { promptId });
  const resultsList = document.getElementById('results-list');
  if (resultsList) {
    renderStatusPlaceholder(resultsList, 'Loading results...');
    debugLog('renderResultsSection: loading results placeholder rendered');
    try {
      if (!promptId) {
        debugLog('renderResultsSection: No promptId provided, cannot fetch results');
        renderStatusPlaceholder(resultsList, 'No prompt selected. Cannot load results.', "status", "polite");
        return;
      }
      debugLog('renderResultsSection: fetching results from API', { promptId });
      const response = await fetchResults(promptId);
      debugLog('renderResultsSection: API fetch complete', { response });

      if (!response || !Array.isArray(response.results)) {
        debugLog('renderResultsSection: API response missing or malformed', { response });
        renderStatusPlaceholder(resultsList, 'No results found.', "status", "polite");
        return;
      }

      if (response.results.length === 0) {
        renderStatusPlaceholder(resultsList, 'No results yet. Be the first to contribute!', "status", "polite");
        debugLog('renderResultsSection: no results to render');
        return;
      }

      // Render results accessibly
      resultsList.innerHTML = `
        <ul aria-label="Results list" role="list" class="unstyled-list">
          ${response.results.map(result => `
            <li role="listitem" tabindex="0" aria-label="Result by ${escapeHtml(result.author || 'Anonymous')}">
              <div class="author-row">
                <strong>${escapeHtml(result.author || 'Anonymous')}</strong>
                <span class="comment-date">
                  ${result.created_at ? escapeHtml(result.created_at) : ''}
                </span>
              </div>
              <div>${escapeHtml(result.content)}</div>
            </li>
          `).join('')}
        </ul>
      `;
      debugLog('renderResultsSection: results rendered', { count: response.results.length });
    } catch (err) {
      debugLog('renderResultsSection: error fetching or rendering results', { error: err });
      renderStatusPlaceholder(resultsList, 'Failed to load results. Please try again later.', "alert", "assertive");
    }
  } else {
    debugLog('renderResultsSection: #results-list not found in DOM', { found: false });
  }
  debugLog('renderResultsSection: exit');
}