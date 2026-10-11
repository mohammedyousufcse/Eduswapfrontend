import { initLayout } from './layout.js';
import { api, showToast, formatBytes, formatDate, getFileInfo, getCategoryBadge, fileUrl, getToken } from './api.js';

// ─────────────────────────────────────────────
// dashboard.js
// ─────────────────────────────────────────────

let currentPage = 1;
let currentFilters = {};
let viewMode = 'table'; // 'table' | 'grid'
let currentUser = null;
let previewMaterialId = null;

async function init() {
  currentUser = await initLayout();
  if (!currentUser) return;

  bindFilters();
  bindViewToggle();
  bindSearch();
  await loadStats();
  await loadMaterials();
}

// ── Stats ────────────────────────────────────────
async function loadStats() {
  const { ok, data } = await api.get('/materials?limit=1');
  if (!ok) return;

  const totalEl = document.getElementById('stat-total');
  if (totalEl) totalEl.textContent = data.pagination?.total || 0;

  // My uploads count
  const myRes = await api.get('/materials/my-uploads');
  const myUploadsEl = document.getElementById('stat-my-uploads');
  if (myUploadsEl && myRes.ok) myUploadsEl.textContent = myRes.data.materials?.length || 0;
}

// ── Load materials list ──────────────────────────
async function loadMaterials(page = 1) {
  currentPage = page;
  const listEl = document.getElementById('file-list');
  if (!listEl) return;

  listEl.innerHTML = `<tr><td colspan="6"><div class="loading-overlay"><div class="spinner"></div></div></td></tr>`;

  const params = new URLSearchParams({ page, limit: 20, ...currentFilters });
  const { ok, data } = await api.get(`/materials?${params}`);

  if (!ok) {
    listEl.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Failed to load files</h3><p>${data.message || 'Please try again.'}</p></div></td></tr>`;
    return;
  }

  const { materials, pagination } = data;

  if (!materials.length) {
    const tableWrapper = document.getElementById('file-table-wrapper');
    const gridEl = document.getElementById('file-grid');
    if (tableWrapper) tableWrapper.style.display = '';
    if (gridEl) gridEl.style.display = 'none';

    const isFiltered = Boolean(currentFilters.search || currentFilters.category || currentFilters.semester || currentFilters.examYear);
    const emptyTitle = isFiltered ? 'No matching materials' : 'No files found';
    const emptyMsg = isFiltered
      ? `No study materials matched your query${currentFilters.search ? ` "${escHtml(currentFilters.search)}"` : ''}. Try different keywords or clear filters.`
      : 'Be the first to upload a study material!';

    listEl.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">${isFiltered ? '🔍' : '📂'}</div><h3>${emptyTitle}</h3><p>${emptyMsg}</p></div></td></tr>`;
    renderPagination(pagination);
    return;
  }

  if (viewMode === 'table') {
    renderTable(materials, listEl);
  } else {
    renderGrid(materials);
  }
  renderPagination(pagination);
}

// ── Table view ───────────────────────────────────
function renderTable(materials, listEl) {
  const tbody = document.getElementById('file-list');
  const gridEl = document.getElementById('file-grid');
  const tableWrapper = document.getElementById('file-table-wrapper');

  if (gridEl) gridEl.style.display = 'none';
  if (tableWrapper) tableWrapper.style.display = '';

  tbody.innerHTML = materials.map(m => {
    const fi = getFileInfo(m.fileType);
    const uploader = m.uploadedBy || {};
    return `
      <tr data-id="${m._id}" class="file-row">
        <td>
          <div class="file-name-cell">
            <div class="file-icon ${fi.cls}">${fi.icon}</div>
            <div class="file-info-block">
              <div class="file-name">${escHtml(m.title)}</div>
              <div class="file-meta">${escHtml(m.originalName)} · ${formatBytes(m.fileSize)}</div>
            </div>
          </div>
        </td>
        <td class="hide-mobile"><span class="badge ${getCategoryBadge(m.category)}">${m.category}</span></td>
        <td class="hide-mobile">${escHtml(m.subject)}</td>
        <td class="hide-mobile">
          <div style="font-size:.825rem;">${uploader.name || '—'}</div>
          <div class="file-meta">${uploader.role === 'faculty' ? '👨‍🏫 Faculty' : '🎓 Student'}</div>
        </td>
        <td class="hide-mobile" style="font-size:.825rem;color:var(--slate-500);">${formatDate(m.createdAt)}</td>
        <td class="file-actions-cell">
          <div class="file-actions-group">
            <span class="file-downloads-count">⬇ ${m.downloadCount}</span>
            <div class="file-action-buttons">
              <button class="btn btn-primary btn-sm" onclick="handleDownload('${m._id}','${escHtml(m.originalName)}',event)">
                ⬇ Download
              </button>
              <button class="btn btn-secondary btn-sm" onclick="handlePreview('${m._id}','${m.fileType}',event)">
                👁 View
              </button>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Row click → preview
  document.querySelectorAll('.file-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      handlePreview(row.dataset.id, materials.find(m => m._id === row.dataset.id)?.fileType);
    });
  });
}

// ── Grid view ────────────────────────────────────
function renderGrid(materials) {
  const tableWrapper = document.getElementById('file-table-wrapper');
  const gridEl = document.getElementById('file-grid');

  if (tableWrapper) tableWrapper.style.display = 'none';
  if (!gridEl) return;
  gridEl.style.display = 'grid';

  gridEl.innerHTML = materials.map(m => {
    const fi = getFileInfo(m.fileType);
    const uploader = m.uploadedBy || {};
    return `
      <div class="file-card" onclick="handlePreview('${m._id}','${m.fileType}')">
        <div class="file-card-icon ${fi.cls}" style="background:${cardIconBg(fi.cls)};">${fi.icon}</div>
        <div class="file-card-title">${escHtml(m.title)}</div>
        <div class="file-card-meta">${escHtml(m.subject)} · Sem ${m.semester}</div>
        <span class="badge ${getCategoryBadge(m.category)}">${m.category}</span>
        <div class="file-card-footer">
          <span style="font-size:.75rem;color:var(--slate-400);">⬇ ${m.downloadCount} · ${uploader.name || '?'}</span>
          <button class="btn btn-primary btn-sm" onclick="handleDownload('${m._id}','${escHtml(m.originalName)}',event)">⬇</button>
        </div>
      </div>
    `;
  }).join('');
}

function cardIconBg(cls) {
  return { pdf: '#fee2e2', docx: '#dbeafe', pptx: '#fef3c7', image: '#d1fae5', other: '#f1f5f9' }[cls] || '#f1f5f9';
}

// ── Pagination ───────────────────────────────────
function renderPagination(pagination) {
  const el = document.getElementById('pagination');
  if (!el || !pagination) return;

  const { page, pages } = pagination;
  if (pages <= 1) { el.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="loadMaterials(${page - 1})" ${page === 1 ? 'disabled' : ''}>‹</button>`;
  for (let i = 1; i <= pages; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="loadMaterials(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="loadMaterials(${page + 1})" ${page === pages ? 'disabled' : ''}>›</button>`;
  el.innerHTML = html;
}

// ── Download ─────────────────────────────────────
window.handleDownload = async function (id, originalName, e) {
  if (e) e.stopPropagation();
  try {
    showToast('Starting download...', 'info', 2000);
    const token = getToken();
    const url = fileUrl(id, 'download');

    // Fetch with authorization header (works for both R2 and legacy GridFS)
    const res = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      credentials: 'include',
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      showToast(errData.message || 'Download failed.', 'error');
      return;
    }

    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      // R2 path: backend returned a signed URL
      const data = await res.json();
      if (!data.url) { showToast('Download failed: no URL returned.', 'error'); return; }
      const a = document.createElement('a');
      a.href = data.url;
      a.download = data.originalName || originalName || 'download';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 1000);
    } else {
      // Legacy GridFS path: stream blob from backend
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = originalName || 'download';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { a.remove(); window.URL.revokeObjectURL(blobUrl); }, 1000);
    }
    showToast('Download started!', 'success');
  } catch (err) {
    console.error('Download error:', err);
    showToast('Download failed.', 'error');
  }
};

// ── Preview ──────────────────────────────────────
window.handlePreview = async function (id, mimeType, e) {
  if (e) e.stopPropagation();
  previewMaterialId = id;
  const modal = document.getElementById('preview-modal-overlay');
  const container = document.getElementById('preview-content');
  if (!modal || !container) return;

  modal.classList.add('open');

  // Handle files that cannot be previewed in-browser (like DOCX, PPTX)
  if (mimeType !== 'application/pdf' && !mimeType?.startsWith('image/')) {
    container.innerHTML = `
      <div class="empty-state" style="padding:2.5rem 1.5rem;text-align:center;">
        <div class="empty-state-icon" style="font-size:3rem;margin-bottom:1rem;">📄</div>
        <h3 style="font-size:1.1rem;margin-bottom:.5rem;">Preview not available</h3>
        <p style="color:var(--slate-500);font-size:.9rem;max-width:380px;margin:0 auto 1.5rem;">
          This file format cannot be rendered directly in the browser. Click Download below to open it on your device.
        </p>
      </div>`;
    const dlBtn = document.getElementById('preview-download-btn');
    if (dlBtn) dlBtn.onclick = () => handleDownload(id, '', null);
    return;
  }

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem;">
      <div class="spinner"></div>
      <p style="margin-top:1rem;color:var(--slate-500);font-size:.9rem;">Loading preview...</p>
    </div>`;

  try {
    const token = getToken();
    const url = fileUrl(id, 'preview');
    const res = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      credentials: 'include',
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      container.innerHTML = `
        <div class="empty-state" style="padding:2.5rem;text-align:center;">
          <div class="empty-state-icon" style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
          <h3 style="margin-bottom:.5rem;">Failed to load preview</h3>
          <p style="color:var(--slate-500);font-size:.9rem;">${errData.message || 'File could not be found in storage.'}</p>
        </div>`;
      return;
    }

    const contentType = res.headers.get('content-type') || '';
    let previewUrl;
    let resolvedMime = mimeType;

    if (contentType.includes('application/json')) {
      // R2 path: backend returned a signed URL
      const data = await res.json();
      if (!data.url) {
        container.innerHTML = `<div class="empty-state" style="padding:2.5rem;text-align:center;"><div class="empty-state-icon" style="font-size:3rem;margin-bottom:1rem;">⚠️</div><h3>Preview unavailable</h3></div>`;
        return;
      }
      previewUrl = data.url;
      if (data.mimeType) resolvedMime = data.mimeType;
    } else {
      // Legacy GridFS path: stream blob from backend
      const blob = await res.blob();
      previewUrl = window.URL.createObjectURL(blob);
    }

    if (resolvedMime === 'application/pdf') {
      container.innerHTML = `<iframe class="preview-iframe" src="${previewUrl}" title="PDF Preview" style="width:100%;height:72vh;border:none;border-radius:8px;"></iframe>`;
    } else if (resolvedMime?.startsWith('image/')) {
      container.innerHTML = `<img class="preview-img" src="${previewUrl}" alt="Preview" style="max-width:100%;max-height:72vh;object-fit:contain;margin:auto;display:block;border-radius:8px;" />`;
    }
  } catch (err) {
    console.error('Preview load error:', err);
    container.innerHTML = `
      <div class="empty-state" style="padding:2.5rem;text-align:center;">
        <div class="empty-state-icon" style="font-size:3rem;margin-bottom:1rem;">⚠️</div>
        <h3 style="margin-bottom:.5rem;">Preview Error</h3>
        <p style="color:var(--slate-500);font-size:.9rem;">Could not connect to server to load preview.</p>
      </div>`;
  }

  // Download from modal
  const dlBtn = document.getElementById('preview-download-btn');
  if (dlBtn) dlBtn.onclick = () => handleDownload(id, '', null);
};

// ── Filters ──────────────────────────────────────
function bindFilters() {
  ['filter-category', 'filter-semester', 'filter-year'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', applyFilters);
  });
}

function applyFilters() {
  currentFilters = {};
  const cat = document.getElementById('filter-category')?.value;
  const sem = document.getElementById('filter-semester')?.value;
  const yr = document.getElementById('filter-year')?.value;
  if (cat) currentFilters.category = cat;
  if (sem) currentFilters.semester = sem;
  if (yr) currentFilters.examYear = yr;
  loadMaterials(1);
}

// ── Search ───────────────────────────────────────
let searchTimeout;
function bindSearch() {
  const topbarSearch = document.getElementById('search-input');
  const dashSearch = document.getElementById('dashboard-search-input');
  const clearBtn = document.getElementById('dashboard-search-clear');
  const activePill = document.getElementById('search-active-pill');
  const activeTerm = document.getElementById('search-active-term');
  const removeBtn = document.getElementById('search-active-remove');
  const kbdHint = document.querySelector('.search-kbd-hint');

  function updateSearchUI(query) {
    if (dashSearch && dashSearch.value !== query) dashSearch.value = query;
    if (topbarSearch && topbarSearch.value !== query) topbarSearch.value = query;

    if (query && query.trim()) {
      if (clearBtn) clearBtn.style.display = 'flex';
      if (kbdHint) kbdHint.style.display = 'none';
      if (activePill) {
        activePill.style.display = 'inline-flex';
        if (activeTerm) activeTerm.textContent = `"${query.trim()}"`;
      }
    } else {
      if (clearBtn) clearBtn.style.display = 'none';
      if (kbdHint) kbdHint.style.display = 'inline-flex';
      if (activePill) activePill.style.display = 'none';
    }
  }

  function performSearch(query) {
    const q = (query || '').trim();
    if (q) {
      currentFilters.search = q;
    } else {
      delete currentFilters.search;
    }
    updateSearchUI(q);
    loadMaterials(1);
  }

  function handleInput(e) {
    const val = e.target.value;
    updateSearchUI(val);
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch(val);
    }, 350);
  }

  function clearSearch() {
    clearTimeout(searchTimeout);
    if (dashSearch) dashSearch.value = '';
    if (topbarSearch) topbarSearch.value = '';
    updateSearchUI('');
    delete currentFilters.search;
    loadMaterials(1);
    if (dashSearch) dashSearch.focus();
  }

  if (dashSearch) {
    dashSearch.addEventListener('input', handleInput);
    dashSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(searchTimeout);
        performSearch(dashSearch.value);
      } else if (e.key === 'Escape') {
        clearSearch();
      }
    });
  }

  if (topbarSearch) {
    topbarSearch.addEventListener('input', handleInput);
    topbarSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(searchTimeout);
        performSearch(topbarSearch.value);
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', clearSearch);
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', clearSearch);
  }

  // Quick keyboard shortcut: '/' focuses the search box
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      if (dashSearch) {
        dashSearch.focus();
        dashSearch.select();
      }
    }
  });
}

// ── View toggle ──────────────────────────────────
function bindViewToggle() {
  document.getElementById('view-table')?.addEventListener('click', () => {
    viewMode = 'table';
    document.getElementById('view-table')?.classList.add('active');
    document.getElementById('view-grid')?.classList.remove('active');
    loadMaterials(currentPage);
  });
  document.getElementById('view-grid')?.addEventListener('click', () => {
    viewMode = 'grid';
    document.getElementById('view-grid')?.classList.add('active');
    document.getElementById('view-table')?.classList.remove('active');
    loadMaterials(currentPage);
  });
}

// ── Modal close ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('close-preview')?.addEventListener('click', () => {
    document.getElementById('preview-modal-overlay')?.classList.remove('open');
    document.getElementById('preview-content').innerHTML = '';
  });
  document.getElementById('preview-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'preview-modal-overlay') {
      document.getElementById('preview-modal-overlay').classList.remove('open');
      document.getElementById('preview-content').innerHTML = '';
    }
  });
});

// ── Expose for pagination buttons ────────────────
window.loadMaterials = loadMaterials;

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

init();
