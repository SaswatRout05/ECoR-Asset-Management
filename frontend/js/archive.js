/**
 * ECoR-OAMS · Archive Page Logic
 * CR-2026-008: Display condemned assets, batch-select for bulk decommission.
 */

let archivedAssets = [];
let selectedIds = new Set();

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.requireAuth()) return;
    loadArchivedAssets();
    setupArchiveListeners();
});


function setupArchiveListeners() {
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            toggleAllCheckboxes(e.target.checked);
        });
    }
}


// ═══════════════════════════════════════════════════════════
//  LOAD CONDEMNED ASSETS
// ═══════════════════════════════════════════════════════════

async function loadArchivedAssets() {
    try {
        const data = await api.get('/api/assets/condemned?page_size=500');
        if (!data) return;

        archivedAssets = data;
        selectedIds.clear();
        updateSelectedCount();

        const countBadge = document.getElementById('archiveCount');
        if (countBadge) countBadge.textContent = `${data.length} item${data.length !== 1 ? 's' : ''}`;

        const tbody = document.getElementById('archiveBody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">✅</div><p>No condemned assets in archive</p></div></td></tr>';
            return;
        }

        tbody.innerHTML = data.map(a => `
            <tr>
                <td>
                    <input type="checkbox" class="asset-checkbox" data-id="${a.asset_id}"
                           onchange="toggleAssetSelection('${a.asset_id}', this.checked)"
                           ${selectedIds.has(a.asset_id) ? 'checked' : ''}>
                </td>
                <td><span class="asset-id">${a.asset_id}</span></td>
                <td style="font-weight:500">${a.asset_name}</td>
                <td>${a.category_name}</td>
                <td class="cost">${formatINR(a.purchase_cost)}</td>
                <td>${statusBadge(a.operational_status)}</td>
                <td>${lifecycleStatusBadge(a.asset_status)}</td>
                <td>${priorityTagBadge(a.auditor_priority_tag)}</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Failed to load archived assets:', err);
    }
}


// ═══════════════════════════════════════════════════════════
//  SELECTION MANAGEMENT
// ═══════════════════════════════════════════════════════════

function toggleAssetSelection(assetId, checked) {
    if (checked) {
        selectedIds.add(assetId);
    } else {
        selectedIds.delete(assetId);
    }
    updateSelectedCount();
}

function toggleAllCheckboxes(checked) {
    const checkboxes = document.querySelectorAll('.asset-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checked;
        const id = cb.dataset.id;
        if (checked) {
            selectedIds.add(id);
        } else {
            selectedIds.delete(id);
        }
    });

    const headerCb = document.getElementById('headerCheckbox');
    if (headerCb) headerCb.checked = checked;

    const selectAllCb = document.getElementById('selectAll');
    if (selectAllCb) selectAllCb.checked = checked;

    updateSelectedCount();
}

function updateSelectedCount() {
    const countEl = document.getElementById('selectedCount');
    if (countEl) countEl.textContent = `${selectedIds.size} selected`;

    const bulkBtn = document.getElementById('btnBulkCondemn');
    if (bulkBtn) bulkBtn.disabled = selectedIds.size === 0;
}


// ═══════════════════════════════════════════════════════════
//  BULK CONDEMN (already condemned — this confirms decommission)
// ═══════════════════════════════════════════════════════════

async function bulkCondemn() {
    if (selectedIds.size === 0) {
        showToast('No assets selected', 'warning');
        return;
    }

    const ids = Array.from(selectedIds);
    if (!confirm(`Confirm bulk decommission of ${ids.length} asset(s)?\n\nThis action marks them as formally condemned.`)) {
        return;
    }

    const btn = document.getElementById('btnBulkCondemn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Processing…';
    }

    try {
        const result = await api.patch('/api/assets/bulk-condemn', { asset_ids: ids });
        if (result) {
            showToast(`${result.updated_count} asset(s) condemned successfully`, 'success');
            if (result.not_found && result.not_found.length > 0) {
                showToast(`${result.not_found.length} asset(s) not found`, 'warning');
            }
            selectedIds.clear();
            loadArchivedAssets();
        }
    } catch (err) {
        console.error('Bulk condemn failed:', err);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '⚠ Bulk Decommission Selected';
        }
    }
}
