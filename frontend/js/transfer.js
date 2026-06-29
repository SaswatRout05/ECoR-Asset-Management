/**
 * ECoR-OAMS · Transfer Page Logic
 * Initiate transfers, accept/reject pending, report damage, view history.
 * CR-2026-008: Accept/Reject transfer workflow.
 * CR-2026-009: Report Damage button.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!Auth.requireAuth()) return;

    loadPendingTransfers();
    loadTransferHistory();
    setupTransferListeners();
});


function setupTransferListeners() {
    // Transfer form
    document.getElementById('transferForm').addEventListener('submit', handleTransfer);

    // History filter
    document.getElementById('historyFilter').addEventListener('change', loadTransferHistory);

    // Set default date to today
    const dateInput = document.getElementById('tf_date');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}


// ═══════════════════════════════════════════════════════════
//  INITIATE TRANSFER
// ═══════════════════════════════════════════════════════════

async function handleTransfer(e) {
    e.preventDefault();
    const btn = document.getElementById('tf_submit');
    btn.disabled = true;
    btn.textContent = 'Processing…';

    const payload = {
        asset_id:         document.getElementById('tf_asset_id').value.trim().toUpperCase(),
        building_block:   document.getElementById('tf_building').value.trim(),
        room_number:      document.getElementById('tf_room').value.trim(),
        custodian_emp_id: document.getElementById('tf_custodian').value.trim(),
        allocation_date:  document.getElementById('tf_date').value || null,
    };

    try {
        const result = await api.post('/api/transfers', payload);
        if (!result) return;

        showToast(`Transfer initiated — allocation #${result.allocation_id} awaiting acknowledgment`, 'success');
        document.getElementById('transferForm').reset();
        document.getElementById('tf_date').value = new Date().toISOString().split('T')[0];

        loadPendingTransfers();
        loadTransferHistory();
    } catch (err) {
        console.error('Transfer failed:', err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Initiate Transfer';
    }
}


// ═══════════════════════════════════════════════════════════
//  PENDING TRANSFERS
// ═══════════════════════════════════════════════════════════

async function loadPendingTransfers() {
    try {
        const data = await api.get('/api/transfers/pending');
        if (!data) return;

        const countBadge = document.getElementById('pendingCount');
        if (countBadge) countBadge.textContent = `${data.length} pending`;

        const tbody = document.getElementById('pendingBody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">✅</div><p>No pending transfers</p></div></td></tr>';
            return;
        }

        const canWrite = Auth.canWrite();
        const isAuditor = Auth.isAuditor();
        tbody.innerHTML = data.map(a => `
            <tr>
                <td>${a.allocation_id}</td>
                <td><span class="asset-id">${a.asset_id}</span></td>
                <td>${a.building_block}</td>
                <td>${a.room_number}</td>
                <td>${a.custodian_emp_id}</td>
                <td>${formatDate(a.allocation_date)}</td>
                <td>${ackBadge(a.is_acknowledged)}</td>
                <td class="write-only">
                    ${canWrite ? `
                        <div style="display:flex;gap:4px;flex-wrap:wrap">
                            <button class="btn btn-success btn-sm" onclick="ackTransfer(${a.allocation_id}, 'accept')" id="acceptBtn_${a.allocation_id}" title="Accept Transfer">✓ Accept</button>
                            <button class="btn btn-outline btn-sm" onclick="ackTransfer(${a.allocation_id}, 'reject')" id="rejectBtn_${a.allocation_id}" title="Reject Transfer" style="color:var(--danger);border-color:var(--danger)">✕ Reject</button>
                            <button class="btn btn-ghost btn-sm" onclick="reportDamage('${a.asset_id}')" title="Report Damage">🔧 Damage</button>
                        </div>
                    ` : (isAuditor ? `
                        <button class="btn btn-primary btn-sm" onclick="approveHighValue(${a.allocation_id})" id="approveBtn_${a.allocation_id}" title="Approve High-Value Transfer">🔐 Approve</button>
                    ` : '—')}
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Failed to load pending transfers:', err);
    }
}


// ═══════════════════════════════════════════════════════════
//  CR-2026-008: ACCEPT / REJECT TRANSFER
// ═══════════════════════════════════════════════════════════

async function ackTransfer(allocationId, action) {
    const btnId = action === 'accept' ? `acceptBtn_${allocationId}` : `rejectBtn_${allocationId}`;
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Processing…';
    }

    try {
        const result = await api.patch(`/api/transfers/${allocationId}/ack`, { action });
        if (!result) return;

        const msg = action === 'accept'
            ? `Transfer #${allocationId} accepted — custody transferred`
            : `Transfer #${allocationId} rejected`;
        showToast(msg, action === 'accept' ? 'success' : 'warning');
        loadPendingTransfers();
        loadTransferHistory();
    } catch (err) {
        console.error(`Transfer ${action} failed:`, err);
        if (btn) {
            btn.disabled = false;
            btn.textContent = action === 'accept' ? '✓ Accept' : '✕ Reject';
        }
    }
}


// ═══════════════════════════════════════════════════════════
//  CR-2026-009: REPORT DAMAGE
// ═══════════════════════════════════════════════════════════

async function reportDamage(assetId) {
    if (!confirm(`Report damage for asset ${assetId}? This will set its status to "In Repair".`)) return;

    try {
        const result = await api.patch(`/api/assets/${assetId}/repair`, {});
        if (result) {
            showToast(`Asset ${assetId} marked as "In Repair"`, 'success');
        }
    } catch (err) {
        console.error('Report damage failed:', err);
    }
}


// ═══════════════════════════════════════════════════════════
//  CR-2026-009: AUDITOR APPROVE HIGH-VALUE TRANSFER
// ═══════════════════════════════════════════════════════════

async function approveHighValue(allocationId) {
    const btn = document.getElementById(`approveBtn_${allocationId}`);
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Approving…';
    }

    try {
        const result = await api.patch(`/api/transfers/${allocationId}/approve`, {});
        if (result) {
            showToast(`High-value transfer #${allocationId} approved`, 'success');
            loadPendingTransfers();
            loadTransferHistory();
        }
    } catch (err) {
        console.error('Approval failed:', err);
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔐 Approve';
        }
    }
}


// ═══════════════════════════════════════════════════════════
//  TRANSFER HISTORY (legacy acknowledge still supported)
// ═══════════════════════════════════════════════════════════

async function acknowledgeTransfer(allocationId) {
    await ackTransfer(allocationId, 'accept');
}


async function loadTransferHistory() {
    const filter = document.getElementById('historyFilter').value;
    let url = '/api/transfers?page=1&page_size=100';
    if (filter !== '') url += `&acknowledged=${filter}`;

    try {
        const data = await api.get(url);
        if (!data) return;

        const tbody = document.getElementById('historyBody');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📋</div><p>No transfer records</p></div></td></tr>';
            return;
        }

        tbody.innerHTML = data.map(a => `
            <tr>
                <td>${a.allocation_id}</td>
                <td><span class="asset-id">${a.asset_id}</span></td>
                <td>${a.building_block}</td>
                <td>${a.room_number}</td>
                <td>${a.custodian_emp_id}</td>
                <td>${formatDate(a.allocation_date)}</td>
                <td>${ackBadge(a.is_acknowledged)}</td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Failed to load transfer history:', err);
    }
}
