/**
 * ECoR-OAMS · Category Management Page Logic
 * CR-2026-007: Dynamically manage categories, with CRUD operations.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Role-based access control check
    if (!Auth.requireAuth()) return;
    if (!Auth.isAuditor()) {
        showToast('Access denied — Auditor role required', 'error');
        window.location.href = '/dashboard';
        return;
    }

    // 2. Load Categories
    await loadCategories();

    // 3. Setup Form Submit Event Listeners
    setupEventListeners();
});

async function loadCategories() {
    const tbody = document.getElementById('categoriesBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3"><div class="loading-overlay"><div class="spinner"></div><span>Loading categories…</span></div></td></tr>';

    try {
        const categories = await api.get('/api/categories');
        if (!categories) return;

        if (categories.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3"><div class="empty-state"><div class="empty-icon">⚙️</div><p>No categories found</p></div></td></tr>';
            return;
        }

        tbody.innerHTML = categories.map(c => `
            <tr>
                <td><span class="asset-id" style="font-family:monospace">${c.category_id}</span></td>
                <td style="font-weight: 500;">${c.category_name}</td>
                <td style="text-align: center;">
                    <div style="display: inline-flex; gap: 8px;">
                        <button class="btn btn-outline btn-sm" onclick="openEditModal(${c.category_id}, '${escapeHtml(c.category_name)}')" title="Rename Category">✏️ Rename</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteCategory(${c.category_id}, '${escapeHtml(c.category_name)}')" title="Delete Category">🗑️ Delete</button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Failed to load categories:', err);
        tbody.innerHTML = '<tr><td colspan="3"><div class="empty-state"><p style="color:var(--danger)">Failed to load categories</p></div></td></tr>';
    }
}

function setupEventListeners() {
    // Create Category Form
    document.getElementById('createCategoryForm').addEventListener('submit', handleCreateCategory);

    // Edit Category Form
    document.getElementById('editCategoryForm').addEventListener('submit', handleEditCategory);
}

async function handleCreateCategory(e) {
    e.preventDefault();
    const input = document.getElementById('newCatName');
    const btn = document.getElementById('btnCreateCat');
    const name = input.value.trim();
    if (!name) return;

    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
        const result = await api.post('/api/categories', { category_name: name });
        if (result) {
            showToast(`Category "${result.category_name}" created successfully`, 'success');
            input.value = '';
            await loadCategories();
        }
    } catch (err) {
        console.error('Failed to create category:', err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Category';
    }
}

function openEditModal(id, name) {
    document.getElementById('editCatId').value = id;
    document.getElementById('editCatName').value = name;
    openModal('editCategoryModal');
}

async function handleEditCategory(e) {
    e.preventDefault();
    const id = document.getElementById('editCatId').value;
    const name = document.getElementById('editCatName').value.trim();
    const btn = document.getElementById('editSubmit');
    if (!id || !name) return;

    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
        const result = await api.put(`/api/categories/${id}`, { category_name: name });
        if (result) {
            showToast(`Category renamed successfully`, 'success');
            closeModal('editCategoryModal');
            await loadCategories();
        }
    } catch (err) {
        console.error('Failed to rename category:', err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Rename Category';
    }
}

async function deleteCategory(id, name) {
    if (!confirm(`Are you sure you want to delete the category "${name}"?\nThis action cannot be undone.`)) {
        return;
    }

    try {
        // Delete endpoint returns 204 No Content
        await api.delete(`/api/categories/${id}`);
        showToast(`Category "${name}" deleted successfully`, 'success');
        await loadCategories();
    } catch (err) {
        // Safe delete validation: the api() helper will show the conflict error toast
        console.error('Failed to delete category:', err);
    }
}

// Helper to escape HTML characters to prevent XSS
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
