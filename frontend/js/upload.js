import { initLayout } from './layout.js';
import { api, showToast, formatBytes } from './api.js';

// ─────────────────────────────────────────────
// upload.js — File upload page
// ─────────────────────────────────────────────

async function init() {
  const user = await initLayout();
  if (!user) return;

  initDropZone();
  initUploadForm();
}

// ── Drop zone / file picker ──────────────────────
function initDropZone() {
  const zone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const preview = document.getElementById('file-preview');

  if (!zone || !fileInput) return;

  // Drag events
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      showFilePreview(e.dataTransfer.files[0]);
    }
  });

  // Click / file select
  zone.addEventListener('click', (e) => {
    if (e.target !== fileInput) fileInput.click();
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) showFilePreview(fileInput.files[0]);
  });

  function showFilePreview(file) {
    if (!preview) return;

    const ALLOWED_TYPES = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
    ];

    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast('Invalid file type. Allowed: PDF, DOCX, PPTX, JPG, PNG', 'error');
      fileInput.value = '';
      preview.classList.add('hidden');
      return;
    }

    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      showToast('File too large. Maximum size is 20 MB.', 'error');
      fileInput.value = '';
      preview.classList.add('hidden');
      return;
    }

    const icons = {
      'application/pdf': '📄',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📊',
      'image/jpeg': '🖼️',
      'image/png':  '🖼️',
    };

    document.getElementById('preview-icon').textContent = icons[file.type] || '📎';
    document.getElementById('preview-name').textContent = file.name;
    document.getElementById('preview-size').textContent = formatBytes(file.size);
    preview.classList.remove('hidden');

    // Update drop zone label
    document.querySelector('.drop-zone-text').textContent = file.name;
    document.querySelector('.drop-zone-sub').textContent = formatBytes(file.size) + ' · Click to change';
  }
}

// ── Upload form ──────────────────────────────────
function initUploadForm() {
  const form = document.getElementById('upload-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('file-input');
    if (!fileInput.files.length) {
      showToast('Please select a file first.', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('title', document.getElementById('upload-title').value.trim());
    formData.append('description', document.getElementById('upload-description').value.trim());
    formData.append('category', document.getElementById('upload-category').value);
    formData.append('subject', document.getElementById('upload-subject').value.trim());
    formData.append('semester', document.getElementById('upload-semester').value);
    const examYear = document.getElementById('upload-exam-year').value;
    if (examYear) formData.append('examYear', examYear);

    // Validate required fields
    if (!formData.get('title') || !formData.get('category') || !formData.get('subject') || !formData.get('semester')) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    // Show progress
    const btn = form.querySelector('button[type="submit"]');
    const progressWrapper = document.getElementById('progress-wrapper');
    const progressBar = document.getElementById('upload-progress');

    btn.disabled = true;
    btn.textContent = '⬆ Uploading…';
    if (progressWrapper) progressWrapper.classList.remove('hidden');

    // Simulate progress (real progress needs XHR)
    let prog = 0;
    const tick = setInterval(() => {
      prog = Math.min(prog + Math.random() * 15, 85);
      if (progressBar) progressBar.style.width = prog + '%';
      const pctEl = document.getElementById('progress-pct');
      if (pctEl) pctEl.textContent = Math.round(prog) + '%';
    }, 200);

    const { ok, data } = await api.upload('/materials/upload', formData);

    clearInterval(tick);
    if (progressBar) progressBar.style.width = '100%';
    const pctElFinal = document.getElementById('progress-pct');
    if (pctElFinal) pctElFinal.textContent = '100%';

    if (ok) {
      showToast('File uploaded successfully! 🎉', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1200);
    } else {
      showToast(data.message || 'Upload failed. Please try again.', 'error');
      btn.disabled = false;
      btn.textContent = '⬆ Upload File';
      if (progressWrapper) progressWrapper.classList.add('hidden');
      if (progressBar) progressBar.style.width = '0%';
      const pctElReset = document.getElementById('progress-pct');
      if (pctElReset) pctElReset.textContent = '0%';
    }
  });

}

init();
