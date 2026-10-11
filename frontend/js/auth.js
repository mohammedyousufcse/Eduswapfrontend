import { api, showToast, saveToken, clearToken } from './api.js';

// ─────────────────────────────────────────────
// auth.js — Login / Signup / Session management
// ─────────────────────────────────────────────

const STUDENT_RE = /^[a-z0-9._%+\-]+@student\.tce\.edu$/i;

function validateTCEEmail(email) {
  const lower = (email || '').toLowerCase().trim();
  const atIdx = lower.lastIndexOf('@');
  if (atIdx === -1) return { valid: false, role: null };
  const domain = lower.slice(atIdx + 1);
  if (domain === 'student.tce.edu' && STUDENT_RE.test(lower)) return { valid: true, role: 'student' };
  return { valid: false, role: null };
}

// ── Session guard ──────────────────────────────
/**
 * Redirects to index.html if user is NOT logged in.
 * Call on every protected page (dashboard, upload, etc.)
 */
async function requireAuth() {
  const { ok, data } = await api.get('/auth/me');
  if (!ok) {
    window.location.href = 'index.html';
    return null;
  }
  return data.user;
}

/**
 * Redirects to dashboard if user IS already logged in.
 * Call on login/signup page.
 */
async function redirectIfLoggedIn() {
  const { ok } = await api.get('/auth/me');
  if (ok) window.location.href = 'dashboard.html';
}

/**
 * Logout the current user
 */
async function logout() {
  await api.post('/auth/logout');
  clearToken();
  window.location.href = 'index.html';
}

/**
 * Populate user info into common UI elements if they exist on the page
 */
function populateUserUI(user) {
  // Sidebar user pill
  const nameEl   = document.getElementById('user-name');
  const roleEl   = document.getElementById('user-role');
  const avatarEl = document.getElementById('user-avatar');

  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = user.role === 'faculty' ? '👨‍🏫 Faculty' : '🎓 Student';
  if (avatarEl) avatarEl.textContent = (user.name || 'U')[0].toUpperCase();

  // Logout buttons
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', logout);
  });
}

// ── Login/Signup page initialization ──────────────
function initAuthPage() {
  // Check URL params for verification / password reset success
  const params = new URLSearchParams(window.location.search);
  if (params.get('verified') === '1') {
    showAlert('loginAlert', '✅ Email verified! You can now log in.', 'success');
  }
  if (params.get('reset') && params.get('reset').length > 10) {
    // Show reset password modal
    showResetPasswordPanel(params.get('reset'));
  }

  // ── Sliding panel (desktop) ──────────────────────────
  const slider = document.querySelector('.forms-slider');
  const tabLogin  = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const switchToSignup = document.querySelectorAll('[data-goto="signup"]');
  const switchToLogin  = document.querySelectorAll('[data-goto="login"]');

  // Mobile: toggle .active class on .form-panel
  const isMobile = () => window.innerWidth <= 640;

  function showLoginPanel() {
    if (isMobile()) {
      document.getElementById('login-form-panel').classList.add('active');
      document.getElementById('signup-form-panel').classList.remove('active');
    } else {
      slider.classList.remove('show-signup');
    }
    tabLogin?.classList.add('active');
    tabSignup?.classList.remove('active');
  }

  function showSignupPanel() {
    if (isMobile()) {
      document.getElementById('signup-form-panel').classList.add('active');
      document.getElementById('login-form-panel').classList.remove('active');
    } else {
      slider.classList.add('show-signup');
    }
    tabSignup?.classList.add('active');
    tabLogin?.classList.remove('active');
  }

  tabLogin?.addEventListener('click', showLoginPanel);
  tabSignup?.addEventListener('click', showSignupPanel);
  switchToLogin.forEach(el => el.addEventListener('click', showLoginPanel));
  switchToSignup.forEach(el => el.addEventListener('click', showSignupPanel));

  // Set initial state
  showLoginPanel();

  // ── Password toggles ──────────────────────────────
  document.querySelectorAll('.eye-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (!input) return;
      const isText = input.type === 'text';
      input.type = isText ? 'password' : 'text';
      btn.innerHTML = isText
        ? `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>`;
    });
  });

  // ── Role toggle ───────────────────────────────────
  const roleOptions = document.querySelectorAll('.role-option');
  const roleInput = document.getElementById('signup-role');
  roleOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      roleOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      if (roleInput) roleInput.value = opt.dataset.role;

      // Show/hide roll number based on role
      const rollGroup = document.getElementById('roll-group');
      if (rollGroup) rollGroup.style.display = opt.dataset.role === 'faculty' ? 'none' : '';
    });
  });

  // ── Email validation on signup ────────────────────
  const signupEmail = document.getElementById('signup-email');
  if (signupEmail) {
    signupEmail.addEventListener('blur', () => {
      const check = validateTCEEmail(signupEmail.value);
      const err = document.getElementById('signup-email-error');
      if (!check.valid && signupEmail.value) {
        if (err) err.textContent = 'Please use your student email (@student.tce.edu)';
        signupEmail.classList.add('error');
      } else {
        if (err) err.textContent = '';
        signupEmail.classList.remove('error');
      }
    });
  }

  // ── LOGIN form submit ────────────────────────────
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert('loginAlert');

      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const btn      = loginForm.querySelector('button[type="submit"]');

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-inline"></span> Logging in…';

      const { ok, data } = await api.post('/auth/login', { email, password });

      if (ok) {
        // Save token to localStorage for cross-origin local dev
        if (data.token) saveToken(data.token);
        showToast(`Welcome back, ${data.user.name}! 🎉`, 'success');
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
      } else {
        showAlert('loginAlert', data.message || 'Login failed. Please try again.', 'error');
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          document.getElementById('resend-verification-btn')?.classList.remove('hidden');
        }
      }

      btn.disabled = false;
      btn.innerHTML = 'Login';
    });
  }

  // ── RESEND verification ──────────────────────────
  const resendBtn = document.getElementById('resend-verification-btn');
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      if (!email) { showToast('Enter your email first.', 'warning'); return; }
      const { ok, data } = await api.post('/auth/resend-verification', { email });
      showToast(data.message || (ok ? 'Verification email sent.' : 'Error.'), ok ? 'success' : 'error');
    });
  }

  // ── FORGOT PASSWORD ──────────────────────────────
  const forgotLink = document.getElementById('forgot-password-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      if (!email) { showToast('Enter your email first.', 'warning'); return; }
      const { ok, data } = await api.post('/auth/forgot-password', { email });
      showToast(data.message || 'If registered, a reset link has been sent.', 'info');
    });
  }

  // ── SIGNUP form submit ───────────────────────────
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert('signupAlert');

      const name    = document.getElementById('signup-name').value.trim();
      const email   = document.getElementById('signup-email').value.trim();
      const roll    = document.getElementById('signup-roll')?.value.trim() || '';
      const sem     = document.getElementById('signup-semester').value;
      const role    = document.getElementById('signup-role').value;
      const pwd     = document.getElementById('signup-password').value;
      const confirm = document.getElementById('signup-confirm').value;

      // Client-side validation
      const emailCheck = validateTCEEmail(email);
      if (!emailCheck.valid) {
        showAlert('signupAlert', 'Please use a valid student email address (@student.tce.edu).', 'error');
        return;
      }
      if (pwd.length < 8) {
        showAlert('signupAlert', 'Password must be at least 8 characters.', 'error');
        return;
      }
      if (pwd !== confirm) {
        showAlert('signupAlert', 'Passwords do not match.', 'error');
        return;
      }

      const btn = signupForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-inline"></span> Creating account…';

      const { ok, data } = await api.post('/auth/register', {
        name, email, password: pwd, confirmPassword: confirm,
        rollNumber: roll, semester: sem, role,
      });

      if (ok) {
        showAlert('signupAlert', data.message, 'success');
        signupForm.reset();
        setTimeout(showLoginPanel, 3000);
      } else {
        showAlert('signupAlert', data.message || 'Signup failed.', 'error');
      }

      btn.disabled = false;
      btn.innerHTML = 'Sign Up';
    });
  }
}

// ── Helpers ──────────────────────────────────────
function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `auth-alert ${type}`;
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
      ${type === 'success'
        ? '<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'
        : '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>'}
    </svg>
    <span>${msg}</span>
  `;
  el.style.display = 'flex';
}

function clearAlert(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function showResetPasswordPanel(token) {
  // Handled inline in index.html if reset=<token> is in URL
}

export { requireAuth, redirectIfLoggedIn, logout, populateUserUI, initAuthPage, validateTCEEmail };
