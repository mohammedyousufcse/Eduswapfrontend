import { requireAuth, populateUserUI, logout } from './auth.js';


// ─────────────────────────────────────────────
// Common layout initialization for app pages
// Call this at the top of each page's JS file
// ─────────────────────────────────────────────

async function initLayout() {
  const user = await requireAuth();
  if (!user) return null;

  populateUserUI(user);
  initSidebar();
  initMobileMenu();
  setActiveNavItem();

  return user;
}

function initSidebar() {
  // Logout
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await logout();
    });
  });
}

function initMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay?.classList.toggle('show');
  });

  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  });
}

function setActiveNavItem() {
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href') || '';
    if (href.includes(currentPage)) {
      item.classList.add('active');
    }
  });
}

export { initLayout };
