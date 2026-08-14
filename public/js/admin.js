(() => {
  'use strict';

  const body = document.getElementById('enquiry-body');
  const search = document.getElementById('enquiry-search');
  const statusFilter = document.getElementById('status-filter');
  const resultCount = document.getElementById('result-count');
  const toast = document.getElementById('toast');
  const dialog = document.getElementById('details-dialog');
  const details = document.getElementById('details-content');
  const errorBox = document.getElementById('dashboard-error');
  const refresh = document.getElementById('refresh-dashboard');
  const prevPage = document.getElementById('prev-page');
  const nextPage = document.getElementById('next-page');
  const pageIndicator = document.getElementById('page-indicator');

  const state = { page: 1, pages: 1, limit: 12, loading: false, searchTimer: null };
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const notify = (message, error = false) => { if (!toast) return; toast.textContent = message; toast.dataset.error = error ? 'true' : 'false'; toast.classList.add('show'); clearTimeout(notify.timer); notify.timer = setTimeout(() => toast.classList.remove('show'), 2600); };
  const showError = (message) => { if (!errorBox) return; errorBox.textContent = message; errorBox.hidden = !message; };
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const formatDate = (value) => { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(); };

  function renderLoading() {
    if (body) body.innerHTML = '<tr><td colspan="7" class="loading-cell"><span class="loading-spinner" aria-hidden="true"></span><span>Loading enquiries…</span></td></tr>';
  }

  function renderRows(items) {
    if (!body) return;
    if (!items.length) { body.innerHTML = '<tr><td colspan="7" class="empty">No enquiries match your filters.</td></tr>'; return; }
    body.innerHTML = items.map((item) => `<tr data-reference="${escapeHtml(item.reference_id || '')}" data-status="${escapeHtml(item.status || 'NEW')}">
      <td><strong class="reference">${escapeHtml(item.reference_id || '—')}</strong></td>
      <td><strong>${escapeHtml(item.name || '—')}</strong><small>${escapeHtml(item.email || '')}</small></td>
      <td><span class="type-pill">${escapeHtml(item.type || '—')}</span></td>
      <td class="subject-cell">${escapeHtml(item.subject || '—')}</td>
      <td>${escapeHtml(formatDate(item.created_at))}</td>
      <td><select class="status-select" data-status-select data-reference="${escapeHtml(item.reference_id || '')}" aria-label="Status for ${escapeHtml(item.reference_id || item.name || 'enquiry')}">${window.ADMIN_STATUSES.map((status) => `<option value="${status}" ${status === (item.status || 'NEW') ? 'selected' : ''}>${status}</option>`).join('')}</select></td>
      <td><button class="icon-btn" type="button" data-details aria-label="View enquiry details">›</button></td>
    </tr>`).join('');
  }

  async function loadOverview() {
    const response = await fetch('/admin/api/overview', { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to load dashboard metrics.');
    const stats = data.stats || {};
    setText('stat-total', Number(stats.total || 0).toLocaleString());
    setText('stat-today', Number(stats.today || 0).toLocaleString());
    setText('stat-new', Number(stats.new_count || 0).toLocaleString());
    setText('stat-won', Number(stats.won || 0).toLocaleString());
  }

  async function loadEnquiries() {
    if (state.loading) return;
    state.loading = true;
    if (refresh) refresh.disabled = true;
    renderLoading();
    try {
      const params = new URLSearchParams({ page: String(state.page), limit: String(state.limit), search: (search?.value || '').trim(), status: statusFilter?.value || 'ALL' });
      const response = await fetch(`/admin/api/enquiries?${params}`, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to load enquiries.');
      state.pages = data.pages || 1;
      renderRows(data.enquiries || []);
      setText('result-count', `${data.total || 0} result${data.total === 1 ? '' : 's'}`);
      setText('page-indicator', `Page ${state.page} of ${state.pages}`);
      if (prevPage) prevPage.disabled = state.page <= 1;
      if (nextPage) nextPage.disabled = state.page >= state.pages;
      showError('');
    } catch (error) {
      if (body) body.innerHTML = `<tr><td colspan="7" class="empty">${escapeHtml(error.message)}</td></tr>`;
      showError(error.message);
    } finally { state.loading = false; if (refresh) refresh.disabled = false; }
  }

  async function loadDashboard() {
    showError('');
    // Start both requests immediately; neither blocks the other or initial page interactivity.
    await Promise.allSettled([loadOverview(), loadEnquiries()]);
  }

  search?.addEventListener('input', () => { clearTimeout(state.searchTimer); state.searchTimer = setTimeout(() => { state.page = 1; loadEnquiries(); }, 250); });
  statusFilter?.addEventListener('change', () => { state.page = 1; loadEnquiries(); });
  refresh?.addEventListener('click', loadDashboard);
  prevPage?.addEventListener('click', () => { if (state.page > 1) { state.page -= 1; loadEnquiries(); } });
  nextPage?.addEventListener('click', () => { if (state.page < state.pages) { state.page += 1; loadEnquiries(); } });

  body?.addEventListener('change', async (event) => {
    const select = event.target.closest('[data-status-select]');
    if (!select) return;
    const reference = select.dataset.reference;
    const row = select.closest('tr');
    const previous = row?.dataset.status || 'NEW';
    select.disabled = true;
    try {
      const response = await fetch(`/admin/api/enquiries/${encodeURIComponent(reference)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ status: select.value }), credentials: 'same-origin' });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to save status.');
      row.dataset.status = data.status;
      notify(`Status updated to ${data.status}`);
    } catch (error) { select.value = previous; notify(error.message, true); }
    finally { select.disabled = false; }
  });

  body?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-details]');
    if (!button || !dialog || !details) return;
    const row = button.closest('tr');
    if (!row) return;
    const cells = row.querySelectorAll('td');
    details.innerHTML = `<div class="dialog-body"><div class="detail-grid">
      <div class="detail-item"><span>Reference</span><strong>${escapeHtml(cells[0]?.innerText || '—')}</strong></div>
      <div class="detail-item"><span>Customer</span><strong>${escapeHtml(cells[1]?.innerText || '—')}</strong></div>
      <div class="detail-item"><span>Type</span><strong>${escapeHtml(cells[2]?.innerText || '—')}</strong></div>
      <div class="detail-item"><span>Status</span><strong>${escapeHtml(row.dataset.status || 'NEW')}</strong></div>
      <div class="detail-item" style="grid-column:1/-1"><span>Subject</span><strong>${escapeHtml(cells[3]?.innerText || '—')}</strong></div>
      <div class="detail-item"><span>Received</span><strong>${escapeHtml(cells[4]?.innerText || '—')}</strong></div>
    </div></div>`;
    if (!dialog.open) dialog.showModal();
  });
  dialog?.addEventListener('click', (event) => { if (event.target.matches('[data-close-dialog]') || event.target === dialog) dialog.close(); });
  dialog?.addEventListener('cancel', () => dialog.close());

  window.ADMIN_STATUSES = ['NEW', 'REVIEWING', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST'];
  loadDashboard();
})();