import { initLayout } from './layout.js';
import { api, showToast } from './api.js';

// ─────────────────────────────────────────────
// profile.js
// ─────────────────────────────────────────────

let currentUser = null;

async function init() {
  currentUser = await initLayout();
  if (!currentUser) return;

  populateProfile(currentUser);
  initProfileForm();
}

function populateProfile(user) {
  document.getElementById('profile-name').textContent   = user.name;
  document.getElementById('profile-email').textContent  = user.email;
  document.getElementById('profile-role').textContent   = user.role === 'faculty' ? '👨‍🏫 Faculty' : '🎓 Student';
  document.getElementById('profile-dept').textContent   = user.department || 'Mechanical';
  document.getElementById('profile-avatar').textContent = (user.name || 'U')[0].toUpperCase();

  // Form
  const nameInput = document.getElementById('pf-name');
  const rollInput = document.getElementById('pf-roll');
  const semInput  = document.getElementById('pf-semester');

  if (nameInput) nameInput.value = user.name || '';
  if (rollInput) rollInput.value = user.rollNumber || '';
  if (semInput) semInput.value = user.semester || '';

  document.getElementById('pf-email-display').textContent = user.email;
  document.getElementById('pf-dept-display').textContent  = user.department || 'Mechanical';
}

function initProfileForm() {
  const form = document.getElementById('profile-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const body = {
      name:       document.getElementById('pf-name').value.trim(),
      rollNumber: document.getElementById('pf-roll').value.trim(),
      semester:   document.getElementById('pf-semester').value,
    };

    const { ok, data } = await api.put('/auth/profile', body);

    if (ok) {
      currentUser = data.user;
      populateProfile(data.user);
      showToast('Profile updated!', 'success');
    } else {
      showToast(data.message || 'Update failed.', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Save Changes';
  });
}



init();
