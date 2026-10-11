import { initLayout } from './layout.js';
import { api, showToast, formatBytes, formatDate, getFileInfo, getCategoryBadge, fileUrl } from './api.js';

// ─────────────────────────────────────────────
// my-uploads.js
// ─────────────────────────────────────────────

let currentUser = null;
let editingId = null;

async function init() {
  currentUser = await initLayout();
  if (!currentUser) return;
  await loadMyUploads();
  initEditModal();
}

async function loadMyUploads() {
  const tbody = document.getElementById('my-uploads-list');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6"><div class="loading-overlay"><div class="spinner"></div></div></td></tr>`;

  const { ok, data } = await api.get('/materials/my-uploads');

  if (!ok) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Failed to load</h3></div></td></tr>`;
    return;
  }

  const materials = data.materials;

  const countEl = document.getElementById('uploads-count');
  if (countEl) countEl.textContent = `${materials.length} file${materials.length !== 1 ? 's' : ''}`;

  if (!materials.length) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <div class="empty-state-icon">📤</div>
        <h3>No uploads yet</h3>
        <p>Start sharing study materials with your classmates!</p>
        <a href="upload.html" class="btn btn-primary" style="margin-top:1rem;">Upload Now</a>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = materials.map(m => {
    const fi = getFileInfo(m.fileType);
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
        <td class="hide-mobile">Sem ${m.semester}${m.examYear ? ' · ' + m.examYear : ''}</td>
        <td class="hide-mobile" style="font-size:.825rem;color:var(--slate-500);">⬇ ${m.downloadCount} &nbsp; ${formatDate(m.createdAt)}</td>
        <td class="file-actions-cell">
          <div class="file-actions-group my-uploads-actions">
            <button class="btn btn-secondary btn-sm" onclick="openEdit('${m._id}')">✏️ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="handleDelete('${m._id}','${escHtml(m.title)}')">🗑 Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ── Edit modal ───────────────────────────────────
function initEditModal() {
  document.getElementById('close-edit-modal')?.addEventListener('click', closeEdit);
  document.getElementById('edit-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal-overlay') closeEdit();
  });

  document.getElementById('edit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!editingId) return;

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const body = {
      title:       document.getElementById('edit-title').value.trim(),
      description: document.getElementById('edit-description').value.trim(),
      category:    document.getElementById('edit-category').value,
      subject:     document.getElementById('edit-subject').value.trim(),
      semester:    document.getElementById('edit-semester').value,
      examYear:    document.getElementById('edit-exam-year').value || null,
    };

    const { ok, data } = await api.put(`/materials/${editingId}`, body);

    if (ok) {
      showToast('File updated!', 'success');
      closeEdit();
      await loadMyUploads();
    } else {
      showToast(data.message || 'Update failed.', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Save Changes';
  });
}

window.openEdit = async function(id) {
  editingId = id;
  const { ok, data } = await api.get(`/materials/${id}`);
  if (!ok) { showToast('Could not load file info.', 'error'); return; }

  const m = data.material;
  document.getElementById('edit-title').value       = m.title || '';
  document.getElementById('edit-description').value = m.description || '';
  document.getElementById('edit-category').value    = m.category || '';
  document.getElementById('edit-subject').value     = m.subject || '';
  document.getElementById('edit-semester').value    = m.semester || '';
  document.getElementById('edit-exam-year').value   = m.examYear || '';

  document.getElementById('edit-modal-overlay')?.classList.add('open');
};

function closeEdit() {
  editingId = null;
  document.getElementById('edit-modal-overlay')?.classList.remove('open');
}

// ── Delete ───────────────────────────────────────
window.handleDelete = async function(id, title) {
  if (!confirm(`Delete "${title}"? This action cannot be undone.`)) return;

  const { ok, data } = await api.delete(`/materials/${id}`);
  if (ok) {
    showToast('File deleted.', 'success');
    await loadMyUploads();
  } else {
    showToast(data.message || 'Delete failed.', 'error');
  }
};

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

init();
