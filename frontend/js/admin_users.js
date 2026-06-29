/**
 * ECoR-OAMS · Admin User Management Logic
 * CR-2026-009: User CRUD, lockdown toggle, role/status management.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.requireAuth()) return;
    if (!Auth.isAdmin()) {
        showToast('Access denied — IT Admin role required', 'error');
        setTimeout(() => window.location.href = '/dashboard', 1500);
        return;
    }

    loadLockdownStatus();
    loadUsers();
    setupAdminListeners();
});


function setupAdminListeners() {
    document.getElementById('createUserForm').addEventListener('submit', handleCreateUser);
}


// ═══════════════════════════════════════════════════════════
//  LOCKDOWN CONTROL
// ═══════════════════════════════════════════════════════════

async function loadLockdownStatus() {
    try {
        const data = await api.get('/api/admin/lockdown');
        if (!data) return;
        updateLockdownUI(data.is_lockdown);
    } catch (err) {
        console.error('Failed to load lockdown status:', err);
    }
}

function updateLockdownUI(isLocked) {
    const badge = document.getElementById('lockdownBadge');
    const btn = document.getElementById('lockdownToggle');
    if (badge) {
        badge.textContent = isLocked ? '🔒 LOCKED' : '🔓 Normal';
        badge.className = isLocked ? 'badge badge-condemned' : 'badge badge-inuse';
    }
    if (btn) {
        btn.textContent = isLocked ? '🔓 Lift Lockdown' : '🔒 Activate Lockdown';
        btn.className = isLocked ? 'btn btn-success' : 'btn btn-primary';
    }
}

async function toggleLockdown() {
    const btn = document.getElementById('lockdownToggle');
    if (btn) btn.disabled = true;

    try {
        const result = await api.post('/api/admin/lockdown', {});
        if (result) {
            updateLockdownUI(result.is_lockdown);
            showToast(result.message, result.is_lockdown ? 'warning' : 'success');
        }
    } catch (err) {
        console.error('Lockdown toggle failed:', err);
    } finally {
        if (btn) btn.disabled = false;
    }
}


// ═══════════════════════════════════════════════════════════
//  USER CRUD
// ═══════════════════════════════════════════════════════════

async function loadUsers() {
    try {
        const data = await api.get('/api/admin/users');
        if (!data) return;

        const countEl = document.getElementById('userCount');
        if (countEl) countEl.textContent = `${data.length} user${data.length !== 1 ? 's' : ''}`;

        const tbody = document.getElementById('usersBody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">👤</div><p>No users found</p></div></td></tr>';
            return;
        }

        const roleEmoji = {
            custodian: '👷',
            it_admin: '🛡️',
            auditor: '📊',
        };

        tbody.innerHTML = data.map(u => `
            <tr style="${!u.is_active ? 'opacity:0.55' : ''}">
                <td>${u.id}</td>
                <td style="font-weight:500">${u.username}</td>
                <td>${u.full_name}</td>
                <td><code style="font-size:0.8rem">${u.emp_id}</code></td>
                <td>
                    <select class="form-control" style="width:auto;padding:4px 8px;font-size:0.8rem"
                            onchange="updateUserRole(${u.id}, this.value)"
                            id="role_${u.id}">
                        <option value="custodian" ${u.role === 'custodian' ? 'selected' : ''}>${roleEmoji.custodian} Custodian</option>
                        <option value="it_admin" ${u.role === 'it_admin' ? 'selected' : ''}>${roleEmoji.it_admin} IT Admin</option>
                        <option value="auditor" ${u.role === 'auditor' ? 'selected' : ''}>${roleEmoji.auditor} Auditor</option>
                    </select>
                </td>
                <td>
                    ${u.is_active
                        ? '<span class="badge badge-acknowledged">✓ Active</span>'
                        : '<span class="badge badge-condemned">✕ Inactive</span>'
                    }
                </td>
                <td style="font-size:0.8rem;color:var(--text-muted)">${formatDate(u.created_at)}</td>
                <td>
                    <button class="btn btn-sm ${u.is_active ? 'btn-outline' : 'btn-success'}"
                            onclick="toggleUserActive(${u.id}, ${!u.is_active})"
                            style="font-size:0.75rem"
                            id="toggleBtn_${u.id}">
                        ${u.is_active ? '🚫 Deactivate' : '✓ Activate'}
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Failed to load users:', err);
    }
}


async function handleCreateUser(e) {
    e.preventDefault();
    const btn = document.getElementById('cu_submit');
    btn.disabled = true;
    btn.textContent = 'Creating…';

    const payload = {
        username:  document.getElementById('cu_username').value.trim(),
        password:  document.getElementById('cu_password').value,
        full_name: document.getElementById('cu_fullname').value.trim(),
        emp_id:    document.getElementById('cu_empid').value.trim(),
        role:      document.getElementById('cu_role').value,
    };

    try {
        const result = await api.post('/api/admin/users', payload);
        if (result) {
            showToast(`User "${result.username}" created successfully`, 'success');
            document.getElementById('createUserForm').reset();
            loadUsers();
        }
    } catch (err) {
        console.error('Create user failed:', err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create User';
    }
}


async function updateUserRole(userId, newRole) {
    try {
        const result = await api.patch(`/api/admin/users/${userId}`, { role: newRole });
        if (result) {
            showToast(`User role updated to "${newRole}"`, 'success');
        }
    } catch (err) {
        console.error('Role update failed:', err);
        loadUsers(); // Refresh to reset dropdown
    }
}


async function toggleUserActive(userId, newActive) {
    const btn = document.getElementById(`toggleBtn_${userId}`);
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Processing…';
    }

    try {
        const result = await api.patch(`/api/admin/users/${userId}`, { is_active: newActive });
        if (result) {
            const msg = newActive ? 'User account activated' : 'User account deactivated';
            showToast(msg, newActive ? 'success' : 'warning');
            loadUsers();
        }
    } catch (err) {
        console.error('Toggle active failed:', err);
        if (btn) {
            btn.disabled = false;
        }
    }
}
