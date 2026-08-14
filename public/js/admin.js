(() => {
  'use strict';

  const body = document.getElementById('enquiry-body');
  const search = document.getElementById('enquiry-search');
  const statusFilter = document.getElementById('status-filter');
  const resultCount = document.getElementById('result-count');
  const toast = document.getElementById('toast');
  const dialog = document.getElementById('details-dialog');
  const details = document.getElementById('details-content');

  const notify = (message, error = false) => {
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = error ? '#8a1c1c' : '#17191c';
    toast.classList.add('show');
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => toast.classList.remove('show'), 2600);
  };

  const filterRows = () => {
    if (!body) return;
    const term = (search?.value || '').trim().toLowerCase();
    const status = statusFilter?.value || 'ALL';
    let visible = 0;
    body.querySelectorAll('tr[data-reference]').forEach((row) => {
      const matchesText = !term || row.dataset.search.includes(term);
      const matchesStatus = status === 'ALL' || row.dataset.status === status;
      const show = matchesText && matchesStatus;
      row.hidden = !show;
      if (show) visible += 1;
    });
    if (resultCount) resultCount.textContent = `${visible} shown`;
  };

  search?.addEventListener('input', filterRows);
  statusFilter?.addEventListener('change', filterRows);

  body?.addEventListener('change', async (event) => {
    const select = event.target.closest('[data-status-select]');
    if (!select) return;
    const reference = select.dataset.reference;
    const row = select.closest('tr');
    const previous = row?.dataset.status || 'NEW';
    select.disabled = true;
    try {
      const response = await fetch(`/admin/api/enquiries/${encodeURIComponent(reference)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ status: select.value }),
        credentials: 'same-origin',
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to save status.');
      row.dataset.status = data.status;
      notify(`Status updated to ${data.status}`);
      filterRows();
    } catch (error) {
      select.value = previous;
      notify(error.message, true);
    } finally {
      select.disabled = false;
    }
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
    dialog.showModal();
  });

  dialog?.addEventListener('click', (event) => {
    if (event.target.matches('[data-close-dialog]') || event.target === dialog) dialog.close();
  });

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }
})();
