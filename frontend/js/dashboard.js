/**
 * ECoR-OAMS · Dashboard Logic
 * Fetches metrics, renders charts, handles drill-down clicks.
 * CR-2026-005: Added Auditor Priority Flags section.
 */

const STATUS_COLORS = {
    'In-Use':       '#27AE60',
    'Under Repair': '#F39C12',
    'Surplus':      '#8E44AD',
    'Condemned':    '#E74C3C',
};

const CATEGORY_COLORS = ['color-1', 'color-2', 'color-3', 'color-4'];

document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.requireAuth()) return;

    // Set header date
    const headerDate = document.getElementById('headerDate');
    if (headerDate) {
        headerDate.textContent = new Date().toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });
    }

    // Fetch all dashboard data in parallel
    await Promise.all([
        loadSummary(),
        loadWarrantyAlerts(),
        loadSLAAlerts(),
        loadPendingCount(),
        loadPriorityFlags(),
    ]);
});


// ═══════════════════════════════════════════════════════════
//  SUMMARY METRICS
// ═══════════════════════════════════════════════════════════

async function loadSummary() {
    try {
        const data = await api.get('/api/dashboard/summary');
        if (!data) return;

        // Animate KPI cards
        animateCounter(document.getElementById('metricTotal'), data.total_assets);
        animateCounter(document.getElementById('metricActive'), data.active_assets);
        animateCounter(document.getElementById('metricValuation'), data.total_valuation, '₹');

        const repairCount = data.status_breakdown['Under Repair'] || 0;
        animateCounter(document.getElementById('metricRepair'), repairCount);

        // Subs
        const totalSub = document.getElementById('metricTotalSub');
        if (totalSub) totalSub.textContent = `Across ${Object.keys(data.category_breakdown).length} categories`;

        const activeSub = document.getElementById('metricActiveSub');
        if (activeSub && data.total_assets > 0) {
            const pct = Math.round((data.active_assets / data.total_assets) * 100);
            activeSub.textContent = `${pct}% of total inventory`;
        }

        const repairSub = document.getElementById('metricRepairSub');
        if (repairSub) {
            const condemned = data.status_breakdown['Condemned'] || 0;
            repairSub.textContent = `${condemned} condemned`;
        }

        // Render Status Donut
        renderStatusDonut(data.status_breakdown, data.total_assets);

        // Render Category Bars
        renderCategoryBars(data.category_breakdown, data.total_assets);

    } catch (err) {
        console.error('Failed to load summary:', err);
    }
}


function renderStatusDonut(breakdown, total) {
    const statuses = ['In-Use', 'Under Repair', 'Surplus', 'Condemned'];
    const chartData = statuses
        .filter(s => (breakdown[s] || 0) > 0)
        .map(s => ({ label: s, value: breakdown[s] || 0 }));

    const colors = chartData.map(d => STATUS_COLORS[d.label]);

    renderDonutChart('statusDonut', chartData, colors);

    // Total in center
    const donutTotal = document.getElementById('donutTotal');
    if (donutTotal) animateCounter(donutTotal, total);

    // Legend
    const legend = document.getElementById('statusLegend');
    if (legend) {
        legend.innerHTML = chartData.map(d => `
            <div class="legend-item" onclick="window.location.href='/assets?status=${encodeURIComponent(d.label)}'">
                <span class="legend-dot" style="background:${STATUS_COLORS[d.label]}"></span>
                <span class="legend-label">${d.label}</span>
                <span class="legend-value">${d.value}</span>
            </div>
        `).join('');
    }
}


function renderCategoryBars(breakdown, total) {
    const container = document.getElementById('categoryBars');
    if (!container) return;

    const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
    const maxVal = Math.max(...entries.map(e => e[1]), 1);

    container.innerHTML = entries.map(([cat, count], i) => {
        const pct = Math.round((count / maxVal) * 100);
        return `
            <div class="bar-item" onclick="window.location.href='/assets?category=${encodeURIComponent(cat)}'">
                <div class="bar-label-row">
                    <span class="bar-name">${cat}</span>
                    <span class="bar-count">${count}</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}" style="width: 0%"
                         data-width="${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');

    // Animate bars after render
    requestAnimationFrame(() => {
        container.querySelectorAll('.bar-fill').forEach(bar => {
            setTimeout(() => {
                bar.style.width = bar.dataset.width;
            }, 100);
        });
    });
}


// ═══════════════════════════════════════════════════════════
//  WARRANTY ALERTS
// ═══════════════════════════════════════════════════════════

async function loadWarrantyAlerts() {
    try {
        const data = await api.get('/api/dashboard/warranty-alerts?days=60');
        if (!data) return;

        const countBadge = document.getElementById('warrantyCount');
        if (countBadge) countBadge.textContent = `${data.length} item${data.length !== 1 ? 's' : ''}`;

        const list = document.getElementById('warrantyList');
        if (!list) return;

        if (data.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><p>No warranties expiring in the next 60 days</p></div>';
            return;
        }

        list.innerHTML = data.map(alert => {
            const cls = alert.days_remaining <= 15 ? 'critical' : 'warning';
            return `
                <div class="warranty-item">
                    <span class="days-badge ${cls}">${alert.days_remaining}d</span>
                    <div style="flex:1;min-width:0">
                        <div style="font-weight:600;font-size:0.85rem">${alert.asset_name}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted)">${alert.asset_id} · ${alert.expiry_type.toUpperCase()} expires ${formatDate(alert.expiry_date)}</div>
                    </div>
                    <span class="badge badge-underrepair" style="font-size:0.68rem">${alert.category}</span>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Failed to load warranty alerts:', err);
    }
}


// ═══════════════════════════════════════════════════════════
//  SLA ALERTS (Uneconomical Assets)
// ═══════════════════════════════════════════════════════════

async function loadSLAAlerts() {
    try {
        const data = await api.get('/api/metrics/sla-alerts');
        if (!data) return;

        const countBadge = document.getElementById('slaCount');
        if (countBadge) countBadge.textContent = `${data.length} item${data.length !== 1 ? 's' : ''}`;

        // Top banner
        const banner = document.getElementById('slaAlertsBanner');
        if (banner && data.length > 0) {
            banner.innerHTML = `
                <div class="alert-banner alert-danger">
                    <span class="alert-icon">🚨</span>
                    <span><strong>${data.length} asset(s)</strong> flagged as "Highly Uneconomical to Maintain" — repair costs ≥ 50% of purchase price.</span>
                </div>
            `;
        }

        const list = document.getElementById('slaList');
        if (!list) return;

        if (data.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><p>No assets exceeding maintenance threshold</p></div>';
            return;
        }

        list.innerHTML = data.map(alert => `
            <div class="sla-alert-item">
                <span style="font-size:1.2rem">⚠</span>
                <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:0.85rem">${alert.asset_name}</div>
                    <div style="font-size:0.75rem;color:var(--text-muted)">
                        Cost: ${formatINR(alert.purchase_cost)} · Repairs: ${formatINR(alert.total_repair_cost)} · TCO Ratio: <strong class="text-danger">${alert.tco_ratio_pct}%</strong>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Failed to load SLA alerts:', err);
    }
}


// ═══════════════════════════════════════════════════════════
//  PENDING TRANSFERS COUNT
// ═══════════════════════════════════════════════════════════

async function loadPendingCount() {
    try {
        const data = await api.get('/api/transfers/pending');
        if (!data) return;

        const badge = document.getElementById('pendingBadge');
        if (badge && data.length > 0) {
            badge.textContent = data.length;
            badge.style.display = 'inline';
        }
    } catch (err) {
        console.error('Failed to load pending count:', err);
    }
}


// ═══════════════════════════════════════════════════════════
//  CR-2026-005: AUDITOR PRIORITY FLAGS
// ═══════════════════════════════════════════════════════════

async function loadPriorityFlags() {
    try {
        const data = await api.get('/api/assets?has_priority_tag=true&page_size=50');
        if (!data) return;

        const countBadge = document.getElementById('priorityFlagCount');
        if (countBadge) countBadge.textContent = `${data.length} item${data.length !== 1 ? 's' : ''}`;

        const list = document.getElementById('priorityFlagsList');
        if (!list) return;

        if (data.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><p>No assets flagged by auditors</p></div>';
            return;
        }

        list.innerHTML = data.map(asset => {
            const isRemoval = asset.auditor_priority_tag === 'High Priority for Removal';
            const cls = isRemoval ? 'removal' : 'replacement';
            return `
                <div class="priority-flag-item ${cls}" onclick="window.location.href='/assets?search=${encodeURIComponent(asset.asset_id)}'">
                    <span style="font-size:1.2rem">${isRemoval ? '🔴' : '🟠'}</span>
                    <div style="flex:1;min-width:0">
                        <div style="font-weight:600;font-size:0.85rem">${asset.asset_name}</div>
                        <div style="font-size:0.75rem;color:var(--text-muted)">
                            ${asset.asset_id} · ${formatINR(asset.purchase_cost)} · ${asset.operational_status}
                        </div>
                        ${asset.auditor_remarks ? `<div style="font-size:0.75rem;color:var(--text-secondary);margin-top:4px;font-style:italic">"${asset.auditor_remarks.substring(0, 100)}${asset.auditor_remarks.length > 100 ? '…' : ''}"</div>` : ''}
                    </div>
                    ${priorityTagBadge(asset.auditor_priority_tag)}
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Failed to load priority flags:', err);
    }
}


// ═══════════════════════════════════════════════════════════
//  CR-2026-011: SMART INVOICE ONBOARDING UPLOAD HANDLER
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('dashboardInvoiceUpload');
    const uploadBtn = document.getElementById('btnDashboardUpload');
    if (!fileInput) return;

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.pdf')) {
            showToast('Please select a valid PDF file (.pdf)', 'error');
            fileInput.value = '';
            return;
        }

        const origText = uploadBtn ? uploadBtn.textContent : '';
        if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.textContent = '⏳ Parsing PDF…';
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('ecor_token');
            const res = await fetch('/api/assets/upload-bill', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                },
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Failed to extract invoice data');
            }

            const data = await res.json();
            // Store extracted data for autofill
            sessionStorage.setItem('ecor_autofill_invoice', JSON.stringify(data.extracted_data));
            window.location.href = '/assets?autofill=true';
        } catch (err) {
            showToast('Invoice parsing failed: ' + err.message, 'error');
        } finally {
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = origText;
            }
            fileInput.value = '';
        }
    });
});
