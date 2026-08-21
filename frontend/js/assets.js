/**
 * ECoR-OAMS · Assets Page Logic
 * CRUD operations, form validation, MAC regex, desktop bundles, detail view.
 * CR-2026-005: Dynamic sorting, global search, auditor review form.
 * CR-2026-006: Dynamic categories from API, category_id FK payloads.
 */

let currentAssets = [];
let currentSortBy = 'created_at';
let currentSortOrder = 'desc';
// CR-2026-006: Dynamic categories map  {category_id → category_name}
let categoriesMap = {};

document.addEventListener('DOMContentLoaded', async () => {
    if (!Auth.requireAuth()) return;

    // CR-2026-006: Load categories first so dropdowns are populated
    await loadCategories();

    // URL params for pre-filtering
    const params = new URLSearchParams(window.location.search);
    if (params.get('category')) document.getElementById('filterCategory').value = params.get('category');
    if (params.get('status'))   document.getElementById('filterStatus').value   = params.get('status');
    if (params.get('search'))   document.getElementById('searchInput').value    = params.get('search');
    if (params.get('tab') === 'depreciation') switchTab('depreciation');

    loadAssets();
    setupEventListeners();

    // CR-2026-011: Check for pending invoice autofill from dashboard or session
    const savedInvoice = sessionStorage.getItem('ecor_autofill_invoice');
    if (savedInvoice) {
        try {
            const parsed = JSON.parse(savedInvoice);
            sessionStorage.removeItem('ecor_autofill_invoice');
            populateCreateFormWithInvoice(parsed);
        } catch (e) {
            console.error('Failed to parse saved invoice data:', e);
        }
    }
});


// CR-2026-011: Helper to populate Create Asset Form with extracted invoice data
function populateCreateFormWithInvoice(data) {
    if (!data) return;
    openModal('createAssetModal');

    if (data.asset_name) {
        document.getElementById('ca_name').value = data.asset_name;
    }
    if (data.total_cost) {
        document.getElementById('ca_cost').value = data.total_cost;
    }
    if (data.date) {
        document.getElementById('ca_date').value = data.date;
    }
    if (data.gem_invoice_ref) {
        document.getElementById('ca_invoice').value = data.gem_invoice_ref;
    }

    // Try to auto-detect category
    const catSelect = document.getElementById('ca_category');
    if (catSelect) {
        const textToSearch = `${data.asset_name || ''} ${data.make_and_model || ''} ${data.vendor_name || ''}`.toLowerCase();
        let targetCatName = '';
        if (/optiplex|thinkpad|laptop|desktop|switch|router|cisco|dell|lenovo|server|monitor|macbook/i.test(textToSearch)) {
            targetCatName = 'IT Hardware';
        } else if (/printer|scanner|xerox|epson|canon|copier/i.test(textToSearch)) {
            targetCatName = 'Office Automation';
        } else if (/ac|split\s*ac|fan|heater|inverter|geyser|light/i.test(textToSearch)) {
            targetCatName = 'Electrical Appliances';
        } else if (/chair|desk|table|almirah|sofa|workstation|cabinet/i.test(textToSearch)) {
            targetCatName = 'Office Furniture';
        }

        if (targetCatName) {
            for (let i = 0; i < catSelect.options.length; i++) {
                if (catSelect.options[i].dataset?.name === targetCatName || catSelect.options[i].textContent === targetCatName) {
                    catSelect.selectedIndex = i;
                    catSelect.dispatchEvent(new Event('change'));
                    break;
                }
            }
        }
    }

    if (data.make_and_model && document.getElementById('ca_make')) {
        document.getElementById('ca_make').value = data.make_and_model;
    }
    if (data.serial_number && document.getElementById('ca_serial')) {
        document.getElementById('ca_serial').value = data.serial_number;
    }

    showToast('Invoice extracted & auto-filled into form!', 'success');
}


// CR-2026-006: Fetch categories from API and populate dropdowns
async function loadCategories() {
    try {
        const cats = await api.get('/api/categories');
        if (!cats) return;

        categoriesMap = {};
        const filterSelect = document.getElementById('filterCategory');
        const formSelect   = document.getElementById('ca_category');

        // Clear existing dynamic options (keep first placeholder)
        if (filterSelect) {
            filterSelect.querySelectorAll('option:not(:first-child)').forEach(o => o.remove());
        }
        if (formSelect) {
            formSelect.querySelectorAll('option:not(:first-child)').forEach(o => o.remove());
        }

        cats.forEach(c => {
            categoriesMap[c.category_id] = c.category_name;

            if (filterSelect) {
                const opt = document.createElement('option');
                opt.value = c.category_name;  // filter by name
                opt.textContent = c.category_name;
                filterSelect.appendChild(opt);
            }
            if (formSelect) {
                const opt = document.createElement('option');
                opt.value = c.category_id;  // create form uses id
                opt.textContent = c.category_name;
                opt.dataset.name = c.category_name;
                formSelect.appendChild(opt);
            }
        });
    } catch (err) {
        console.error('Failed to load categories:', err);
    }
}


function setupEventListeners() {
    // CR-2026-011: Invoice Upload Handler
    const assetsUploadInput = document.getElementById('assetsInvoiceUpload');
    const btnAssetsUpload   = document.getElementById('btnAssetsUpload');
    if (assetsUploadInput) {
        assetsUploadInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!file.name.toLowerCase().endsWith('.pdf')) {
                showToast('Please select a valid PDF file (.pdf)', 'error');
                assetsUploadInput.value = '';
                return;
            }

            const origText = btnAssetsUpload ? btnAssetsUpload.textContent : '';
            if (btnAssetsUpload) {
                btnAssetsUpload.disabled = true;
                btnAssetsUpload.textContent = '⏳ Parsing PDF…';
            }

            try {
                const formData = new FormData();
                formData.append('file', file);

                const token = Auth.getToken();
                const res = await fetch('/api/assets/upload-bill', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token },
                    body: formData,
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.detail || 'Failed to extract invoice data');
                }

                const data = await res.json();
                populateCreateFormWithInvoice(data.extracted_data);
            } catch (err) {
                showToast('Invoice upload failed: ' + err.message, 'error');
            } finally {
                if (btnAssetsUpload) {
                    btnAssetsUpload.disabled = false;
                    btnAssetsUpload.textContent = origText;
                }
                assetsUploadInput.value = '';
            }
        });
    }

    // Search with debounce
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadAssets, 300);
    });

    // CR-2026-005: Global search with debounce
    let globalSearchTimeout;
    const globalInput = document.getElementById('globalSearchInput');
    if (globalInput) {
        globalInput.addEventListener('input', () => {
            clearTimeout(globalSearchTimeout);
            globalSearchTimeout = setTimeout(doGlobalSearch, 400);
        });
    }

    // Filters
    document.getElementById('filterCategory').addEventListener('change', loadAssets);
    document.getElementById('filterStatus').addEventListener('change', loadAssets);

    // Category change shows/hides IT details section
    document.getElementById('ca_category').addEventListener('change', (e) => {
        const itSection = document.getElementById('itDetailsSection');
        const selectedOpt = e.target.options[e.target.selectedIndex];
        const catName = selectedOpt?.dataset?.name || '';
        itSection.style.display = catName === 'IT Hardware' ? 'block' : 'none';
    });

    // Create Asset Form
    document.getElementById('createAssetForm').addEventListener('submit', handleCreateAsset);

    // Bundle Form
    document.getElementById('bundleForm').addEventListener('submit', handleCreateBundle);

    // CR-2026-005: Sortable table headers
    document.querySelectorAll('.data-table thead th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const sortField = th.dataset.sort;
            if (currentSortBy === sortField) {
                currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortBy = sortField;
                currentSortOrder = 'asc';
            }
            updateSortIndicators();
            loadAssets();
        });
    });
}


function updateSortIndicators() {
    document.querySelectorAll('.data-table thead th.sortable').forEach(th => {
        const indicator = th.querySelector('.sort-indicator');
        if (th.dataset.sort === currentSortBy) {
            th.classList.add('sort-active');
            indicator.textContent = currentSortOrder === 'asc' ? '▲' : '▼';
        } else {
            th.classList.remove('sort-active');
            indicator.textContent = '⇅';
        }
    });
}


// ═══════════════════════════════════════════════════════════
//  LOAD ASSETS
// ═══════════════════════════════════════════════════════════

async function loadAssets() {
    const search   = document.getElementById('searchInput').value.trim();
    const category = document.getElementById('filterCategory').value;
    const status   = document.getElementById('filterStatus').value;

    let url = `/api/assets?page=1&page_size=200&sort_by=${currentSortBy}&sort_order=${currentSortOrder}`;
    if (search)   url += `&search=${encodeURIComponent(search)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (status)   url += `&status=${encodeURIComponent(status)}`;

    try {
        const data = await api.get(url);
        if (!data) return;
        currentAssets = data;
        renderAssetsTable(data);
    } catch (err) {
        console.error('Failed to load assets:', err);
    }
}


// CR-2026-005: Global Search
async function doGlobalSearch() {
    const query = document.getElementById('globalSearchInput').value.trim();
    if (!query) {
        loadAssets();
        return;
    }

    try {
        const data = await api.get(`/api/search?q=${encodeURIComponent(query)}`);
        if (!data) return;
        currentAssets = data;
        renderAssetsTable(data);
    } catch (err) {
        console.error('Global search failed:', err);
    }
}


function renderAssetsTable(assets) {
    const tbody = document.getElementById('assetsBody');
    if (!tbody) return;

    if (assets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">📦</div><p>No assets found</p></div></td></tr>';
        return;
    }

    tbody.innerHTML = assets.map(a => `
        <tr onclick="viewAssetDetail('${a.asset_id}')" style="cursor:pointer">
            <td><span class="asset-id">${a.asset_id}</span></td>
            <td style="font-weight:500">${a.asset_name}</td>
            <td>${a.category_name}</td>
            <td>${formatDate(a.purchase_date)}</td>
            <td class="cost">${formatINR(a.purchase_cost)}</td>
            <td>${statusBadge(a.operational_status)}</td>
            <td style="font-size:0.78rem;color:var(--text-muted)">${a.gem_invoice_ref}</td>
            <td>${priorityTagBadge(a.auditor_priority_tag)}</td>
            <td>
                <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); viewAssetDetail('${a.asset_id}')" title="View Details">👁</button>
            </td>
        </tr>
    `).join('');
}


// ═══════════════════════════════════════════════════════════
//  CREATE ASSET
// ═══════════════════════════════════════════════════════════

async function handleCreateAsset(e) {
    e.preventDefault();
    const btn = document.getElementById('ca_submit');
    btn.disabled = true;
    btn.textContent = 'Creating…';

    const categorySelect = document.getElementById('ca_category');
    const selectedOpt = categorySelect.options[categorySelect.selectedIndex];
    const categoryId = parseInt(categorySelect.value, 10);
    const categoryName = selectedOpt?.dataset?.name || '';
    const payload = {
        asset_name:         document.getElementById('ca_name').value.trim(),
        category_id:        categoryId,
        pl_number:          document.getElementById('ca_pl').value.trim() || null,
        purchase_date:      document.getElementById('ca_date').value,
        purchase_cost:      parseFloat(document.getElementById('ca_cost').value),
        gem_invoice_ref:    document.getElementById('ca_invoice').value.trim(),
        operational_status: document.getElementById('ca_status').value,
        amc_expiry_date:    document.getElementById('ca_amc').value || null,
    };

    try {
        const asset = await api.post('/api/assets', payload);
        if (!asset) return;

        // If IT Hardware, also create IT details
        if (categoryName === 'IT Hardware') {
            const serial = document.getElementById('ca_serial').value.trim();
            const make   = document.getElementById('ca_make').value.trim();
            if (serial && make) {
                const mac = document.getElementById('ca_mac')?.value.trim() || null;

                // Client-side MAC validation
                if (mac && !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac)) {
                    showToast('Invalid MAC address format. Use XX:XX:XX:XX:XX:XX', 'error');
                    btn.disabled = false;
                    btn.textContent = 'Create Asset';
                    return;
                }

                const itPayload = {
                    serial_number:       serial,
                    make_and_model:      make,
                    mac_address:         mac,
                    ip_address:          document.getElementById('ca_ip')?.value.trim() || null,
                    warranty_expiry_date: document.getElementById('ca_warranty').value || null,
                };
                await api.post(`/api/assets/${asset.asset_id}/it-details`, itPayload);
            }
        }

        showToast(`Asset ${asset.asset_id} created successfully`, 'success');
        closeModal('createAssetModal');
        document.getElementById('createAssetForm').reset();
        document.getElementById('itDetailsSection').style.display = 'none';
        loadAssets();
    } catch (err) {
        console.error('Create asset failed:', err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Asset';
    }
}


// ═══════════════════════════════════════════════════════════
//  CREATE DESKTOP BUNDLE
// ═══════════════════════════════════════════════════════════

async function handleCreateBundle(e) {
    e.preventDefault();
    const btn = document.getElementById('bd_submit');
    btn.disabled = true;
    btn.textContent = 'Creating…';

    const cpuMac = document.getElementById('bd_cpu_mac')?.value.trim() || null;
    if (cpuMac && !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(cpuMac)) {
        showToast('Invalid CPU MAC address format', 'error');
        btn.disabled = false;
        btn.textContent = 'Create Bundle';
        return;
    }

    const payload = {
        gem_invoice_ref:     document.getElementById('bd_invoice').value.trim(),
        purchase_date:       document.getElementById('bd_date').value,
        purchase_cost_cpu:   parseFloat(document.getElementById('bd_cpu_cost').value),
        purchase_cost_monitor: parseFloat(document.getElementById('bd_mon_cost').value),
        cpu_name:            document.getElementById('bd_cpu_name').value.trim(),
        monitor_name:        document.getElementById('bd_mon_name').value.trim(),
        cpu_serial:          document.getElementById('bd_cpu_serial').value.trim(),
        cpu_make_model:      document.getElementById('bd_cpu_make').value.trim(),
        cpu_mac_address:     cpuMac,
        cpu_ip_address:      document.getElementById('bd_cpu_ip')?.value.trim() || null,
        monitor_serial:      document.getElementById('bd_mon_serial').value.trim(),
        monitor_make_model:  document.getElementById('bd_mon_make').value.trim(),
        warranty_expiry_date: document.getElementById('bd_warranty').value || null,
    };

    try {
        const result = await api.post('/api/assets/desktop-bundle', payload);
        if (!result) return;

        showToast(`Desktop bundle created: ${result.cpu.asset_id} + ${result.monitor.asset_id}`, 'success');
        closeModal('bundleModal');
        document.getElementById('bundleForm').reset();
        loadAssets();
    } catch (err) {
        console.error('Bundle creation failed:', err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Bundle';
    }
}


// ═══════════════════════════════════════════════════════════
//  ASSET DETAIL VIEW (+ CR-2026-005: Auditor Review Panel)
// ═══════════════════════════════════════════════════════════

async function viewAssetDetail(assetId) {
    openModal('detailModal');
    const body = document.getElementById('detailBody');
    const title = document.getElementById('detailTitle');
    body.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';

    try {
        const data = await api.get(`/api/assets/${assetId}`);
        if (!data) return;

        const a = data.asset;
        title.textContent = `${a.asset_name} · ${a.asset_id}`;

        let html = `
            <div style="display:grid;grid-template-columns: 2fr 1fr;gap: 20px;margin-bottom:20px">
                <!-- Left: Metadata -->
                <div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 20px;margin-bottom:16px">
                        <div><span class="text-muted" style="font-size:0.75rem;display:block">Asset ID</span><strong class="asset-id" style="font-size:1rem">${a.asset_id}</strong></div>
                        <div><span class="text-muted" style="font-size:0.75rem;display:block">Status</span>${statusBadge(a.operational_status)}</div>
                        <div><span class="text-muted" style="font-size:0.75rem;display:block">Category</span>${a.category_name}</div>
                        <div><span class="text-muted" style="font-size:0.75rem;display:block">PL Number</span>${a.pl_number || '—'}</div>
                        <div><span class="text-muted" style="font-size:0.75rem;display:block">Purchase Date</span>${formatDate(a.purchase_date)}</div>
                        <div><span class="text-muted" style="font-size:0.75rem;display:block">Purchase Cost</span><strong>${formatINR(a.purchase_cost)}</strong></div>
                        <div><span class="text-muted" style="font-size:0.75rem;display:block">GeM Invoice</span>${a.gem_invoice_ref}</div>
                        <div><span class="text-muted" style="font-size:0.75rem;display:block">AMC Expiry</span>${a.amc_expiry_date ? formatDate(a.amc_expiry_date) : '—'}</div>
                    </div>
                    ${(Auth.canWrite() && a.asset_status !== 'Condemned') ? `
                        <div style="margin-top:12px">
                            <button class="btn btn-outline btn-sm" onclick="reportDamageDetail('${a.asset_id}')" style="color:var(--danger);border-color:var(--danger)">
                                🔧 Report Damage
                            </button>
                        </div>
                    ` : ''}
                </div>

                <!-- Right: Asset QR Tag Card -->
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px;background:var(--bg-input);border:1px solid var(--border-light);border-radius:var(--radius-md);text-align:center">
                    <span style="font-size:0.72rem;font-weight:600;margin-bottom:8px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Asset QR Tag</span>
                    <div id="qrCodeContainer" style="width:120px;height:120px;background:#fff;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-sm);border:1px solid var(--border-light);overflow:hidden;margin-bottom:10px">
                        <div class="spinner" id="qrSpinner" style="width:20px;height:20px;border-width:2px"></div>
                    </div>
                    <button class="btn btn-accent btn-sm" id="btnPrintQR" onclick="printQRCode('${a.asset_id}')" style="width:100%;font-size:0.75rem" disabled>
                        🖨️ Print QR Tag
                    </button>
                </div>
            </div>
        `;

        // Display existing auditor review data (visible to all roles)
        if (a.auditor_priority_tag || a.auditor_remarks) {
            html += `
                <div style="padding:16px;background:rgba(52,152,219,0.04);border:1px solid rgba(52,152,219,0.15);border-radius:var(--radius-md);margin-bottom:16px">
                    <h3 style="font-size:0.88rem;margin-bottom:10px;color:var(--info)">🏷️ Auditor Review</h3>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;font-size:0.85rem">
                        <div><span class="text-muted">Priority Tag:</span> ${priorityTagBadge(a.auditor_priority_tag) || '—'}</div>
                        <div style="grid-column:1/-1"><span class="text-muted">Remarks:</span> ${a.auditor_remarks || '—'}</div>
                    </div>
                </div>
            `;
        }

        // IT Details
        if (data.it_details) {
            const it = data.it_details;
            html += `
                <div style="padding:16px;background:var(--bg-input);border-radius:var(--radius-md);margin-bottom:16px">
                    <h3 style="font-size:0.88rem;margin-bottom:10px;color:var(--primary)">🖥 IT Equipment Details</h3>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;font-size:0.85rem">
                        <div><span class="text-muted">Serial:</span> ${it.serial_number}</div>
                        <div><span class="text-muted">Make/Model:</span> ${it.make_and_model}</div>
                        <div><span class="text-muted">MAC:</span> <code>${it.mac_address || '—'}</code></div>
                        <div><span class="text-muted">IP:</span> <code>${it.ip_address || '—'}</code></div>
                        <div><span class="text-muted">Warranty:</span> ${it.warranty_expiry_date ? formatDate(it.warranty_expiry_date) : '—'}</div>
                    </div>
                </div>
            `;
        }

        // Current allocation
        if (data.current_allocation) {
            const ca = data.current_allocation;
            html += `
                <div style="padding:16px;background:rgba(39,174,96,0.06);border:1px solid rgba(39,174,96,0.12);border-radius:var(--radius-md);margin-bottom:16px">
                    <h3 style="font-size:0.88rem;margin-bottom:8px;color:var(--success)">📍 Current Location</h3>
                    <div style="font-size:0.85rem">
                        <strong>${ca.building_block}</strong> · Room ${ca.room_number} · Custodian: ${ca.custodian_emp_id}
                    </div>
                </div>
            `;
        }

        // Allocation history
        if (data.allocations && data.allocations.length > 0) {
            html += `<h3 style="font-size:0.88rem;margin:16px 0 10px">📋 Allocation History</h3><div class="timeline">`;
            data.allocations.forEach(al => {
                const cls = al.is_acknowledged ? 'acknowledged' : 'pending';
                html += `
                    <div class="timeline-item ${cls}">
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">
                            <div class="tl-header">
                                <span class="tl-location">${al.building_block} · Room ${al.room_number}</span>
                                <span class="tl-date">${formatDate(al.allocation_date)}</span>
                            </div>
                            <div class="tl-details">Custodian: ${al.custodian_emp_id} · ${ackBadge(al.is_acknowledged)}</div>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Repair logs
        if (data.repair_logs && data.repair_logs.length > 0) {
            html += `<h3 style="font-size:0.88rem;margin:20px 0 10px">🔧 Repair History</h3>`;
            html += '<div style="display:flex;flex-direction:column;gap:8px">';
            data.repair_logs.forEach(r => {
                html += `
                    <div style="padding:10px 14px;background:var(--bg-input);border-radius:var(--radius-sm);font-size:0.84rem">
                        <div style="display:flex;justify-content:space-between">
                            <span>${formatDate(r.failure_date)} — ${r.description || 'No description'}</span>
                            <strong class="cost">${formatINR(r.repair_cost)}</strong>
                        </div>
                        <div class="text-muted" style="font-size:0.75rem;margin-top:4px">
                            ${r.repair_end ? 'Completed' : '⏳ In Progress'}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        // CR-2026-005: Auditor Review Form (only for auditor role)
        if (Auth.isAuditor()) {
            html += `
                <div class="auditor-review-panel">
                    <h3>🏷️ Auditor Review Form</h3>
                    <form id="auditorReviewForm" onsubmit="submitAuditorReview(event, '${a.asset_id}')">
                        <div class="form-group" style="margin-bottom:12px">
                            <label>Priority Classification</label>
                            <select class="form-control" id="ar_priority_tag">
                                <option value="">— No Priority Tag —</option>
                                <option value="High Priority for Removal" ${a.auditor_priority_tag === 'High Priority for Removal' ? 'selected' : ''}>🔴 High Priority for Removal</option>
                                <option value="High Priority for Replacement" ${a.auditor_priority_tag === 'High Priority for Replacement' ? 'selected' : ''}>🟠 High Priority for Replacement</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom:12px">
                            <label>Auditor Remarks</label>
                            <textarea class="form-control" id="ar_remarks" rows="3" placeholder="Enter review remarks, findings, or recommendations…">${a.auditor_remarks || ''}</textarea>
                        </div>
                        <div class="form-actions" style="border:none;padding-top:8px;margin-top:8px">
                            <button type="submit" class="btn btn-primary btn-sm" id="ar_submit">Save Review</button>
                        </div>
                    </form>
                </div>
            `;
        }

        body.innerHTML = html;
        fetchQRCode(a.asset_id);

    } catch (err) {
        body.innerHTML = '<div class="empty-state"><p>Failed to load asset details</p></div>';
    }
}


// CR-2026-005: Submit auditor review
async function submitAuditorReview(e, assetId) {
    e.preventDefault();
    const btn = document.getElementById('ar_submit');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const payload = {
        auditor_priority_tag: document.getElementById('ar_priority_tag').value || null,
        auditor_remarks: document.getElementById('ar_remarks').value.trim() || null,
    };

    try {
        const result = await api.put(`/api/assets/${assetId}/auditor-review`, payload);
        if (result) {
            showToast('Auditor review saved successfully', 'success');
            loadAssets(); // Refresh table to show new tag
        }
    } catch (err) {
        console.error('Auditor review failed:', err);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Review';
    }
}


// ═══════════════════════════════════════════════════════════
//  TAB SWITCHING
// ═══════════════════════════════════════════════════════════

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add('active');

    document.getElementById('registerTab').style.display     = tab === 'register' ? 'block' : 'none';
    document.getElementById('depreciationTab').style.display  = tab === 'depreciation' ? 'block' : 'none';
    document.getElementById('pageTitle').textContent = tab === 'depreciation' ? 'Depreciation Schedule' : 'Asset Register';

    if (tab === 'depreciation') loadDepreciation();
}

async function loadDepreciation() {
    try {
        const data = await api.get('/api/dashboard/depreciation');
        if (!data) return;

        const tbody = document.getElementById('depBody');
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><p>No depreciation data</p></div></td></tr>';
            return;
        }

        tbody.innerHTML = data.map(d => {
            const bvClass = d.book_value <= 0 ? 'low' : d.book_value > d.purchase_cost * 0.5 ? 'positive' : '';
            return `
                <tr>
                    <td><span class="asset-id">${d.asset_id}</span></td>
                    <td>${d.asset_name}</td>
                    <td class="cost">${formatINR(d.purchase_cost)}</td>
                    <td>${formatDate(d.purchase_date)}</td>
                    <td>${d.age_years}</td>
                    <td class="cost">${formatINR(d.annual_depreciation)}</td>
                    <td class="cost">${formatINR(d.accumulated_depreciation)}</td>
                    <td class="cost depreciation-value ${bvClass}">${formatINR(d.book_value)}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Failed to load depreciation:', err);
    }
}


// Dynamic QR Code Printing using hidden iframe sized for a standard 2x2 physical sticker
function printQRCode(assetId) {
    const imgEl = document.getElementById('qrCodeImage');
    if (!imgEl) {
        showToast('QR Code not loaded yet', 'warning');
        return;
    }
    
    // Create or reuse hidden iframe
    let iframe = document.getElementById('qrPrintIframe');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'qrPrintIframe';
        iframe.style.position = 'absolute';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);
    }
    
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
        <html>
        <head>
            <title>Asset QR Tag - ${assetId}</title>
            <style>
                @page {
                    size: 2in 2in;
                    margin: 0;
                }
                body {
                    margin: 0;
                    padding: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 2in;
                    height: 2in;
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    box-sizing: border-box;
                }
                img {
                    width: 1.5in;
                    height: 1.5in;
                    object-fit: contain;
                }
                .label {
                    font-size: 8px;
                    font-weight: bold;
                    text-align: center;
                    margin-top: 1px;
                    word-break: break-all;
                }
            </style>
        </head>
        <body>
            <img src="${imgEl.src}" />
            <div class="label">${assetId}</div>
            <script>
                window.onload = function() {
                    window.focus();
                    window.print();
                };
            </script>
        </body>
        </html>
    `);
    iframeDoc.close();
}


// Fetch the QR code image blob on load and display inside the img tag
async function fetchQRCode(assetId) {
    try {
        const response = await fetch(`/api/assets/${assetId}/qrcode`, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch QR Code');
        }
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const container = document.getElementById('qrCodeContainer');
        if (container) {
            container.innerHTML = `<img src="${blobUrl}" id="qrCodeImage" alt="QR Code" style="width:100%;height:100%;object-fit:contain" />`;
        }
        
        const btnPrint = document.getElementById('btnPrintQR');
        if (btnPrint) {
            btnPrint.disabled = false;
        }
    } catch (err) {
        console.error('QR code fetch failed:', err);
        const container = document.getElementById('qrCodeContainer');
        if (container) {
            container.innerHTML = `<span style="font-size:0.75rem;color:var(--danger)">Failed to load</span>`;
        }
    }
}

// Custodian Reports Damage from Detail Panel
async function reportDamageDetail(assetId) {
    if (!confirm(`Report damage for asset ${assetId}? This will set its status to "In Repair".`)) return;

    try {
        const result = await api.patch(`/api/assets/${assetId}/repair`, {});
        if (result) {
            showToast(`Asset ${assetId} marked as "In Repair"`, 'success');
            viewAssetDetail(assetId);
            if (typeof loadAssets === 'function') {
                loadAssets();
            }
        }
    } catch (err) {
        console.error('Report damage failed:', err);
    }
}
