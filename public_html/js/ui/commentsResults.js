// ui/commentsResults.js - Comments and Results UI (2025 Rebuild, "stupid simple")

import { fetchComments, addComment, deleteComment } from '../api/comments.js';
import { fetchResults, addResult, deleteResult } from '../api/results.js';

export async function renderCommentsResults(promptId, container) {
  if (!container) return;
  container.innerHTML = '<div>Loading comments and results...</div>';

  try {
    const [comments, results] = await Promise.all([
      fetchComments(promptId),
      fetchResults(promptId)
    ]);

    // Render comments
    const commentsHtml = `
      <section>
        <h4>Comments</h4>
        <ul id="comments-list">
          ${(comments || []).map(c => `
            <li>
              <span>${c.author || 'Anon'}:</span> ${c.text}
              <button class="delete-comment-btn" data-id="${c.id}" aria-label="Delete comment">Delete</button>
            </li>
          `).join('')}
        </ul>
        <form id="add-comment-form">
          <input name="text" type="text" placeholder="Add a comment..." required />
          <button type="submit">Add</button>
        </form>
      </section>
    `;

    // Render results
    const resultsHtml = `
      <section>
        <h4>Results</h4>
        <ul id="results-list">
          ${(results || []).map(r => `
            <li>
              <span>${r.author || 'Anon'}:</span> ${r.value}
              <button class="delete-result-btn" data-id="${r.id}" aria-label="Delete result">Delete</button>
            </li>
          `).join('')}
        </ul>
        <form id="add-result-form">
          <input name="value" type="text" placeholder="Add a result..." required />
          <button type="submit">Add</button>
        </form>
      </section>
    `;

    container.innerHTML = commentsHtml + resultsHtml;

    // Add comment
    const addCommentForm = container.querySelector('#add-comment-form');
    if (addCommentForm) {
      addCommentForm.onsubmit = async (e) => {
        e.preventDefault();
        const text = addCommentForm.text.value.trim();
        if (!text) return;
        await addComment(promptId, { text });
        renderCommentsResults(promptId, container);
      };
    }

    // Delete comment
    container.querySelectorAll('.delete-comment-btn').forEach(btn => {
      btn.onclick = async () => {
        if (confirm('Delete this comment?')) {
          await deleteComment(btn.getAttribute('data-id'));
          renderCommentsResults(promptId, container);
        }
      };
    });

    // Add result
    const addResultForm = container.querySelector('#add-result-form');
    if (addResultForm) {
      addResultForm.onsubmit = async (e) => {
        e.preventDefault();
        const value = addResultForm.value.value.trim();
        if (!value) return;
        await addResult(promptId, { value });
        renderCommentsResults(promptId, container);
      };
    }

    // Delete result
    container.querySelectorAll('.delete-result-btn').forEach(btn => {
      btn.onclick = async () => {
        if (confirm('Delete this result?')) {
          await deleteResult(btn.getAttribute('data-id'));
          renderCommentsResults(promptId, container);
        }
      };
    });

  } catch (err) {
    container.innerHTML = '<div style="color:red;">Error loading comments or results.</div>';
    console.error('CommentsResults: Failed to load', err);
  }
}