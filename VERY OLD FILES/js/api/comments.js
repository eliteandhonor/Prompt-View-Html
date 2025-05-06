/**
 * comments.js - Simple API client for comments
 * (2025 Rebuild, "stupid simple" pattern)
 */

export async function fetchComments(promptId) {
  try {
    console.log("[fetchComments] called with promptId:", promptId);
    const url = '/api/comments.php?promptId=' + encodeURIComponent(promptId);
    console.log("[fetchComments] Fetching URL:", url);
    const res = await fetch(url);
    console.log("[fetchComments] Response status:", res.status);
    if (!res.ok) {
      const text = await res.text();
      console.error("[fetchComments] Error response:", text);
      throw new Error('Failed to fetch comments');
    }
    const data = await res.json();
    console.log("[fetchComments] Data received:", data);
    return data;
  } catch (err) {
    console.error("[fetchComments] Exception:", err);
    throw err;
  }
}

export async function addComment(promptId, data) {
  try {
    console.log("[addComment] called with promptId:", promptId, "data:", data);
    const payload = { action: 'add', promptId, ...data };
    console.log("[addComment] Sending payload:", payload);
    const res = await fetch('/api/comments.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log("[addComment] Response status:", res.status);
    if (!res.ok) {
      const text = await res.text();
      console.error("[addComment] Error response:", text);
      throw new Error('Failed to add comment');
    }
    const result = await res.json();
    console.log("[addComment] Data received:", result);
    return result;
  } catch (err) {
    console.error("[addComment] Exception:", err);
    throw err;
  }
}

export async function deleteComment(commentId) {
  try {
    console.log("[deleteComment] called with commentId:", commentId);
    const payload = { action: 'delete', commentId };
    console.log("[deleteComment] Sending payload:", payload);
    const res = await fetch('/api/comments.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log("[deleteComment] Response status:", res.status);
    if (!res.ok) {
      const text = await res.text();
      console.error("[deleteComment] Error response:", text);
      throw new Error('Failed to delete comment');
    }
    const result = await res.json();
    console.log("[deleteComment] Data received:", result);
    return result;
  } catch (err) {
    console.error("[deleteComment] Exception:", err);
    throw err;
  }
}