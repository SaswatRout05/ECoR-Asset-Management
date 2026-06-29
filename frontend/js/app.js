/**
 * ECoR-OAMS · Shared Application Utilities
 * Auth management, API wrapper, navigation, toasts, theme toggle.
 * CR-2026-005: Added ThemeManager, AI chatbot sidebar, priority badge helper.
 */

const API_BASE = '';

// ═══════════════════════════════════════════════════════════
//  AUTH
// ═══════════════════════════════════════════════════════════

const Auth = {
    getToken() { return localStorage.getItem('ecor_token'); },
    getRole()  { return localStorage.getItem('ecor_role'); },
    getName()  { return localStorage.getItem('ecor_name'); },

    isLoggedIn() { return !!this.getToken(); },

    logout() {
        localStorage.removeItem('ecor_token');
        localStorage.removeItem('ecor_role');
        localStorage.removeItem('ecor_name');
        window.location.href = '/';
    },

    /** Redirect to login if not authenticated */
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = '/';
            return false;
        }
        return true;
    },

    isAdmin()     { return this.getRole() === 'it_admin'; },
    isCustodian() { return this.getRole() === 'custodian'; },
    isAuditor()   { return this.getRole() === 'auditor'; },
    canWrite()    { return this.getRole() !== 'auditor'; },
};


// ═══════════════════════════════════════════════════════════
//  THEME MANAGER (CR-2026-005)
// ═══════════════════════════════════════════════════════════

const ThemeManager = {
    STORAGE_KEY: 'ecor_theme',

    init() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
        }
    },

    toggle() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(this.STORAGE_KEY, next);
    },

    isDark() {
        return document.documentElement.getAttribute('data-theme') === 'dark';
    },

    /** Injects the toggle switch into header-right */
    injectToggle() {
        const headerRight = document.querySelector('.header-right');
        if (!headerRight) return;

        const toggle = document.createElement('div');
        toggle.className = 'theme-toggle';
        toggle.id = 'themeToggle';
        toggle.setAttribute('title', 'Toggle Dark/Light Mode');
        toggle.innerHTML = `
            <div class="theme-toggle-track">
                <div class="theme-toggle-thumb"></div>
            </div>
        `;
        toggle.addEventListener('click', () => this.toggle());

        // Insert before the logout button
        const logoutBtn = headerRight.querySelector('.btn-logout');
        if (logoutBtn) {
            headerRight.insertBefore(toggle, logoutBtn);
        } else {
            headerRight.appendChild(toggle);
        }
    }
};

// Apply theme immediately (before DOM ready) to prevent flash
ThemeManager.init();


// ═══════════════════════════════════════════════════════════
//  API FETCH WRAPPER
// ═══════════════════════════════════════════════════════════

async function api(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...(Auth.getToken() ? { 'Authorization': `Bearer ${Auth.getToken()}` } : {}),
        ...(options.headers || {}),
    };

    try {
        const res = await fetch(url, { ...options, headers });

        if (res.status === 401) {
            Auth.logout();
            return null;
        }

        if (res.status === 403) {
            showToast('Access denied — insufficient permissions', 'error');
            return null;
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Request failed' }));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }

        return await res.json();
    } catch (err) {
        if (err.message !== 'Failed to fetch') {
            showToast(err.message, 'error');
        }
        throw err;
    }
}

api.get    = (url)       => api(url);
api.post   = (url, body) => api(url, { method: 'POST', body: JSON.stringify(body) });
api.put    = (url, body) => api(url, { method: 'PUT',  body: JSON.stringify(body) });
api.patch  = (url, body) => api(url, { method: 'PATCH', body: JSON.stringify(body) });
api.delete = (url)       => api(url, { method: 'DELETE' });


// ═══════════════════════════════════════════════════════════
//  SIDEBAR & NAVIGATION
// ═══════════════════════════════════════════════════════════

function initSidebar() {
    // Highlight active page
    const path = window.location.pathname;
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        if (link.getAttribute('href') === path) {
            link.classList.add('active');
        }
    });

    // User info
    const nameEl = document.querySelector('.sidebar-footer .user-name');
    const roleEl = document.querySelector('.sidebar-footer .user-role');
    const avatarEl = document.querySelector('.sidebar-footer .user-avatar');
    if (nameEl) nameEl.textContent = Auth.getName() || 'User';
    if (roleEl) roleEl.textContent = (Auth.getRole() || '').replace('_', ' ');
    if (avatarEl) {
        const name = Auth.getName() || 'U';
        avatarEl.textContent = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    }

    // Logout button
    document.querySelectorAll('.btn-logout').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    });

    // Hide write-action elements for auditors
    if (Auth.isAuditor()) {
        document.querySelectorAll('.write-only').forEach(el => el.style.display = 'none');
    }

    // Hide admin-only elements for non-admins
    if (!Auth.isAdmin()) {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }

    // Show/hide auditor-only elements based on role
    if (Auth.isAuditor()) {
        document.querySelectorAll('.auditor-only').forEach(el => {
            el.style.display = el.tagName === 'A' ? 'flex' : 'block';
        });
    } else {
        document.querySelectorAll('.auditor-only').forEach(el => el.style.display = 'none');
    }

    // CR-2026-009: Show IT_Admin-only elements
    if (Auth.isAdmin()) {
        document.querySelectorAll('.it-admin-only').forEach(el => {
            el.style.display = el.tagName === 'A' ? 'flex' : 'block';
        });
    } else {
        document.querySelectorAll('.it-admin-only').forEach(el => el.style.display = 'none');
    }


    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('open');
        });
    }

    // CR-2026-005: Inject theme toggle
    ThemeManager.injectToggle();

    // CR-2026-005: AI Chatbot sidebar toggle
    const aiToggle = document.getElementById('aiToggleBtn');
    const aiSidebar = document.getElementById('aiSidebar');
    if (aiToggle && aiSidebar) {
        aiToggle.addEventListener('click', () => {
            aiSidebar.classList.toggle('open');
        });
    }
    const aiClose = document.getElementById('aiSidebarClose');
    if (aiClose && aiSidebar) {
        aiClose.addEventListener('click', () => {
            aiSidebar.classList.remove('open');
        });
    }
}


// ═══════════════════════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════

function showToast(message, type = 'info', duration = 4000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}


// ═══════════════════════════════════════════════════════════
//  FORMATTING HELPERS
// ═══════════════════════════════════════════════════════════

function formatINR(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status) {
    const map = {
        'In-Use':       'inuse',
        'Under Repair': 'underrepair',
        'Surplus':      'surplus',
        'Condemned':    'condemned',
    };
    const cls = map[status] || 'inuse';
    return `<span class="badge badge-${cls}"><span class="badge-dot"></span>${status}</span>`;
}

function ackBadge(isAck) {
    return isAck
        ? '<span class="badge badge-acknowledged">✓ Acknowledged</span>'
        : '<span class="badge badge-pending">⏳ Pending</span>';
}

/** CR-2026-005: Priority tag badge helper */
function priorityTagBadge(tag) {
    if (!tag) return '';
    if (tag === 'High Priority for Removal') {
        return '<span class="badge badge-priority-removal">🔴 Removal</span>';
    }
    if (tag === 'High Priority for Replacement') {
        return '<span class="badge badge-priority-replacement">🟠 Replacement</span>';
    }
    return `<span class="badge">${tag}</span>`;
}

/** CR-2026-008: Transfer status badge helper */
function transferStatusBadge(status) {
    if (!status || status === 'None') return '';
    const map = {
        'Pending_Custodian': '<span class="badge badge-pending">⏳ Pending Custodian</span>',
        'Pending_Auditor':   '<span class="badge badge-underrepair">⏳ Pending Auditor</span>',
        'Accepted':          '<span class="badge badge-acknowledged">✓ Accepted</span>',
        'Rejected':          '<span class="badge badge-condemned">✕ Rejected</span>',
    };
    return map[status] || `<span class="badge">${status}</span>`;
}

/** CR-2026-008: Asset lifecycle status badge */
function lifecycleStatusBadge(status) {
    if (!status) return '';
    const map = {
        'Active':    '<span class="badge badge-inuse"><span class="badge-dot"></span>Active</span>',
        'In Repair': '<span class="badge badge-underrepair"><span class="badge-dot"></span>In Repair</span>',
        'Condemned': '<span class="badge badge-condemned"><span class="badge-dot"></span>Condemned</span>',
    };
    return map[status] || `<span class="badge">${status}</span>`;
}


// ═══════════════════════════════════════════════════════════
//  ANIMATED COUNTER
// ═══════════════════════════════════════════════════════════

function animateCounter(el, target, prefix = '', duration = 800) {
    const start = 0;
    const startTime = performance.now();

    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const current = Math.round(start + (target - start) * eased);
        el.textContent = prefix + current.toLocaleString('en-IN');
        if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
}


// ═══════════════════════════════════════════════════════════
//  MODAL HELPERS
// ═══════════════════════════════════════════════════════════

function openModal(id) {
    const overlay = document.getElementById(id);
    if (overlay) overlay.classList.add('active');
}

function closeModal(id) {
    const overlay = document.getElementById(id);
    if (overlay) overlay.classList.remove('active');
}

// Close modals on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// Close modals on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        // Also close AI sidebar
        const aiSidebar = document.getElementById('aiSidebar');
        if (aiSidebar) aiSidebar.classList.remove('open');
    }
});


// ═══════════════════════════════════════════════════════════
//  DONUT CHART (CSS conic-gradient)
// ═══════════════════════════════════════════════════════════

function renderDonutChart(elementId, data, colors) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) {
        el.style.background = 'var(--border)';
        return;
    }

    let gradientParts = [];
    let cumulative = 0;

    data.forEach((d, i) => {
        const pct = (d.value / total) * 100;
        const color = colors[i % colors.length];
        gradientParts.push(`${color} ${cumulative}% ${cumulative + pct}%`);
        cumulative += pct;
    });

    el.style.background = `conic-gradient(${gradientParts.join(', ')})`;
}


// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
        if (!Auth.requireAuth()) return;
        initSidebar();
    }
});
