(() => {
  const body = document.querySelector('#admin-enquiries-body');
  const awaitingStaff = document.querySelector('#communication-awaiting-staff');
  const unreadTotal = document.querySelector('#communication-unread');
  if (!body) return;

  const state = new Map();

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[char]));

  const decorateRows = () => {
    body.querySelectorAll('tr[data-reference]').forEach((row) => {
      const reference = row.dataset.reference;
      if (!reference) return;
      const current = state.get(reference) || { communication_status: 'NEW', unread_count: 0 };
      const cells = row.querySelectorAll('td');
      if (cells.length >= 8) {
        const badge = cells[5].querySelector('[data-communication-reference]');
        if (badge) {
          badge.textContent = current.communication_status.replaceAll('_', ' ');
          badge.dataset.status = current.communication_status;
        }
        const unread = cells[5].querySelector('[data-unread-reference]');
        if (unread) {
          unread.textContent = current.unread_count;
          unread.hidden = !current.unread_count;
        }
      } else if (cells.length >= 7) {
        const cell = document.createElement('td');
        cell.innerHTML = `<span class="sh-admin-comm-status" data-communication-reference="${escapeHtml(reference)}" data-status="${escapeHtml(current.communication_status)}">${escapeHtml(current.communication_status.replaceAll('_', ' '))}</span><span class="sh-admin-unread" data-unread-reference="${escapeHtml(reference)}" ${current.unread_count ? '' : 'hidden'}>${current.unread_count}</span>`;
        row.insertBefore(cell, cells[5]);
      }
      row.classList.toggle('sh-admin-row-unread', Number(current.unread_count) > 0);
    });

    const empty = body.querySelector('.sh-admin-empty');
    if (empty) empty.parentElement?.setAttribute('colspan', '8');
  };

  const loadOverview = async () => {
    try {
      const response = await fetch('/admin/api/communication/overview', { headers: { Accept: 'application/json' } });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Unable to load communication state.');

      state.clear();
      (result.conversations || []).forEach((item) => state.set(item.reference_id, {
        communication_status: item.communication_status || 'NEW',
        unread_count: Number(item.unread_count || 0),
      }));

      if (awaitingStaff) awaitingStaff.textContent = Number(result.counts?.awaiting_staff || 0);
      if (unreadTotal) unreadTotal.textContent = Number(result.counts?.unread_messages || 0);
      decorateRows();
    } catch (error) {
      console.warn('Communication overview unavailable:', error.message);
    }
  };

  new MutationObserver(decorateRows).observe(body, { childList: true, subtree: true });
  decorateRows();
  loadOverview();
  setInterval(loadOverview, 30000);
})();
