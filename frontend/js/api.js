// ─────────────────────────────────────────────
// api.js — Shared fetch helper & config
// All API calls go through this file
// ─────────────────────────────────────────────

// 🔧 Change this to your deployed backend URL before deploying
const API_BASE = 'http://localhost:5000/api';

/** Save / clear token in localStorage */
function saveToken(token) { if (token) localStorage.setItem('eduswap_token', token); }
function clearToken() { localStorage.removeItem('eduswap_token'); }
function getToken() { return localStorage.getItem('eduswap_token'); }

/**
 * Core fetch wrapper.
 * @param {string} path  — e.g. '/auth/login'
 * @param {RequestInit} options
 * @returns {Promise<{ok: boolean, data: any}>}
 */
async function apiFetch(path, options = {}) {
  const token = getToken();
  const defaults = {
    credentials: 'include', // send httpOnly cookies (production)
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  };

  // Remove Content-Type for FormData (let browser set boundary)
  if (options.body instanceof FormData) {
    delete defaults.headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE}${path}`, { ...defaults, ...options });
  const data = await response.json().catch(() => ({}));

  // If the server returns a token (on login), save it
  if (data.token) saveToken(data.token);

  return { ok: response.ok, status: response.status, data };
}

/** Convenience wrappers */
const api = {
  get: (path) => apiFetch(path, { method: 'GET' }),
  post: (path, body) => apiFetch(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (path, body) => apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),
  upload: (path, formData) => apiFetch(path, { method: 'POST', body: formData }),
};

/**
 * Build a full file URL for download/preview
 */
function fileUrl(materialId, action = 'download') {
  const token = getToken();
  const base = `${API_BASE}/materials/${materialId}/${action}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

// ─────────────────────────────────────────────
// Toast notification system
// ─────────────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" aria-label="Close">✕</button>
  `;

  const close = toast.querySelector('.toast-close');
  const remove = () => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  };
  close.addEventListener('click', remove);
  setTimeout(remove, duration);

  container.appendChild(toast);
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format a date string
 */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Get file type icon and class from MIME type
 */
function getFileInfo(mimeType) {
  const map = {
    'application/pdf': { icon: '📄', cls: 'pdf', label: 'PDF' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: '📝', cls: 'docx', label: 'DOCX' },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: '📊', cls: 'pptx', label: 'PPTX' },
    'image/jpeg': { icon: '🖼️', cls: 'image', label: 'JPG' },
    'image/png': { icon: '🖼️', cls: 'image', label: 'PNG' },
  };
  return map[mimeType] || { icon: '📎', cls: 'other', label: 'File' };
}

/**
 * Category badge colors
 */
function getCategoryBadge(category) {
  const map = {
    'Question Paper': 'badge-pink',
    'Arrear Paper': 'badge-red',
    'Notes': 'badge-blue',
    'Assignment': 'badge-green',
    'Lab Manual': 'badge-purple',
    'Other': 'badge-slate',
  };
  return map[category] || 'badge-slate';
}

export { api, API_BASE, fileUrl, showToast, formatBytes, formatDate, getFileInfo, getCategoryBadge, saveToken, clearToken, getToken };
