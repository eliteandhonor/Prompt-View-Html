/**
 * prompts.js - Simple API client for prompts
 * (2025 Rebuild, "stupid simple" pattern)
 */

export async function fetchPrompts(params = {}) {
  try {
    console.log("[fetchPrompts] called with params:", params);
    const query = new URLSearchParams(params).toString();
    const url = '/api/prompts.php' + (query ? `?${query}` : '');
    console.log("[fetchPrompts] Fetching URL:", url);
    const res = await fetch(url);
    console.log("[fetchPrompts] Response status:", res.status);
    if (!res.ok) {
      const text = await res.text();
      console.error("[fetchPrompts] Error response:", text);
      throw new Error('Failed to fetch prompts');
    }
    const data = await res.json();
    console.log("[fetchPrompts] Data received:", data);
    return data.prompts;
  } catch (err) {
    console.error("[fetchPrompts] Exception:", err);
    throw err;
  }
}

export async function createPrompt(data) {
  try {
    console.log("[createPrompt] called with data:", data);
    const payload = { action: 'create', ...data };
    console.log("[createPrompt] Sending payload:", payload);
    const res = await fetch('/api/prompts.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log("[createPrompt] Response status:", res.status);
    if (!res.ok) {
      const text = await res.text();
      console.error("[createPrompt] Error response:", text);
      throw new Error('Failed to create prompt');
    }
    const result = await res.json();
    console.log("[createPrompt] Data received:", result);
    return result;
  } catch (err) {
    console.error("[createPrompt] Exception:", err);
    throw err;
  }
}

export async function updatePrompt(id, data) {
  try {
    console.log("[updatePrompt] called with id:", id, "data:", data);
    const payload = { action: 'update', id, ...data };
    console.log("[updatePrompt] Sending payload:", payload);
    const res = await fetch('/api/prompts.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log("[updatePrompt] Response status:", res.status);
    if (!res.ok) {
      const text = await res.text();
      console.error("[updatePrompt] Error response:", text);
      throw new Error('Failed to update prompt');
    }
    const result = await res.json();
    console.log("[updatePrompt] Data received:", result);
    return result;
  } catch (err) {
    console.error("[updatePrompt] Exception:", err);
    throw err;
  }
}

export async function deletePrompt(id) {
  try {
    console.log("[deletePrompt] called with id:", id);
    const payload = { action: 'delete', id };
    console.log("[deletePrompt] Sending payload:", payload);
    const res = await fetch('/api/prompts.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log("[deletePrompt] Response status:", res.status);
    if (!res.ok) {
      const text = await res.text();
      console.error("[deletePrompt] Error response:", text);
      throw new Error('Failed to delete prompt');
    }
    const result = await res.json();
    console.log("[deletePrompt] Data received:", result);
    return result;
  } catch (err) {
    console.error("[deletePrompt] Exception:", err);
    throw err;
  }
}