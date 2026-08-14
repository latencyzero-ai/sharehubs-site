(() => {
  const body = document.querySelector('#admin-enquiries-body');
  const awaitingStaff = document.querySelector('#communication-awaiting-staff');
  const unreadTotal = document.querySelector('#communication-unread');
  if (!body) return;

  const COMMUNICATION_STATUSES = ['NEW', 'AWAITING_STAFF', 'AWAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];
  const state = new Map();
  let decorating = false;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[char]));

  const updateStatus = async (reference, select) => {
    const previous = select.dataset.previous || select.value;
    select.dataset.previous = select.value;
    select.disabled = true;
    try {
      const response = await fetch(`/admin/api/enquiries/${encodeURIComponent(reference)}/communication-status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ status: select.value }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Unable to update communication status.');
      const current = state.get(reference) || {};
      current.communication_status = result.communication_status;
      state.set(reference, current);
      select.classList.add('is-saved');
      setTimeout(() => select.classList.remove('is-saved'), 900);
    } catch (error) {
      select.value = previous;
      console.warn('Communication status update failed:', error.message);
    } finally { select.disabled = false; }
  };

  const buildSelect = (reference, value) => {
    const select = document.createElement('select');
    select.className = 'sh-admin-status sh-admin-communication-status';
    select.dataset.communicationStatusReference = reference;
    select.dataset.previous = value;
    select.setAttribute('aria-label', `Communication status for ${reference}`);
    select.innerHTML = COMMUNICATION_STATUSES.map((status) => `<option value="${status}" ${status === value ? 'selected' : ''}>${status.replaceAll('_', ' ')}</option>`).join('');
    select.addEventListener('change', () => updateStatus(reference, select));
    return select;
  };

  const decorateRows = () => {
    if (decorating) return;
    decorating = true;
    try {
      body.querySelectorAll('tr[data-reference]').forEach((row) => {
        const reference = row.dataset.reference;
        if (!reference) return;
        const current = state.get(reference) || { communication_status: 'NEW', unread_count: 0 };
        const cells = row.querySelectorAll('td');
        if (cells.length >= 8) {
          const cell = cells[5];
          let select = cell.querySelector('[data-communication-status-reference]');
          if (!select) {
            cell.querySelector('[data-communication-reference]')?.remove();
            select = buildSelect(reference, current.communication_status);
            cell.prepend(select);
          } else if (document.activeElement !== select) select.value = current.communication_status;

          let unread = cell.querySelector('[data-unread-reference]');
          if (!unread) {
            unread = document.createElement('span');
            unread.className = 'sh-admin-unread';
            unread.dataset.unreadReference = reference;
            cell.appendChild(unread);
          }
          unread.textContent = current.unread_count;
          unread.hidden = !current.unread_count;
        } else if (cells.length >= 7) {
          const cell = document.createElement('td');
          cell.appendChild(buildSelect(reference, current.communication_status));
          const unread = document.createElement('span');
          unread.className = 'sh-admin-unread';
          unread.dataset.unreadReference = reference;
          unread.textContent = current.unread_count;
          unread.hidden = !current.unread_count;
          cell.appendChild(unread);
          row.insertBefore(cell, cells[5]);
        }
        row.classList.toggle('sh-admin-row-unread', Number(current.unread_count) > 0);
      });
      const empty = body.querySelector('.sh-admin-empty');
      if (empty) empty.parentElement?.setAttribute('colspan', '8');
    } finally { decorating = false; }
  };

  const loadOverview = async () => {
    try {
      const response = await fetch('/admin/api/communication/overview', { headers: { Accept: 'application/json' } });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Unable to load communication state.');
      state.clear();
      (result.conversations || []).forEach((item) => state.set(item.reference_id, { communication_status: item.communication_status || 'NEW', unread_count: Number(item.unread_count || 0) }));
      if (awaitingStaff) awaitingStaff.textContent = Number(result.counts?.awaiting_staff || 0);
      if (unreadTotal) unreadTotal.textContent = Number(result.counts?.unread_messages || 0);
      decorateRows();
    } catch (error) { console.warn('Communication overview unavailable:', error.message); }
  };

  new MutationObserver(decorateRows).observe(body, { childList: true, subtree: true });
  decorateRows();
  loadOverview();
  setInterval(loadOverview, 30000);
})();
