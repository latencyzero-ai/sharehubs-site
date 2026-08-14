(() => {
  const body = document.querySelector('#admin-enquiries-body');
  const search = document.querySelector('#admin-search');
  const statusFilter = document.querySelector('#admin-status-filter');
  if (!body) return;

  let timer;

  async function loadEnquiries() {
    const params = new URLSearchParams();
    if (search?.value.trim()) params.set('search', search.value.trim());
    if (statusFilter?.value && statusFilter.value !== 'ALL') params.set('status', statusFilter.value);
    params.set('limit', '50');

    try {
      const response = await fetch(`/admin/api/enquiries?${params.toString()}`, { headers: { Accept: 'application/json' } });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Unable to load enquiries.');
      render(result.enquiries);
    } catch (error) {
      body.innerHTML = `<tr><td colspan="7" class="sh-admin-empty">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  function render(enquiries) {
    if (!enquiries.length) {
      body.innerHTML = '<tr><td colspan="7" class="sh-admin-empty">No enquiries match your filters.</td></tr>';
      return;
    }

    const statuses = ['NEW', 'REVIEWING', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST'];
    body.innerHTML = enquiries.map((item) => {
      const date = new Date(item.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
      const options = statuses.map((status) => `<option value="${status}" ${item.status === status ? 'selected' : ''}>${status}</option>`).join('');
      const subject = item.subject || item.service || 'Website enquiry';
      return `<tr data-reference="${escapeHtml(item.reference_id)}">
        <td><strong class="sh-admin-ref">${escapeHtml(item.reference_id)}</strong></td>
        <td><div class="sh-admin-customer"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.email)}</span></div></td>
        <td><span class="sh-admin-type">${escapeHtml(item.type)}</span></td>
        <td><span class="sh-admin-subject">${escapeHtml(subject)}</span></td>
        <td>${escapeHtml(date)}</td>
        <td><select class="sh-admin-status" data-status-reference="${escapeHtml(item.reference_id)}">${options}</select></td>
        <td><a class="sh-admin-link" href="mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent(`Re: ${subject}`)}">Reply</a></td>
      </tr>`;
    }).join('');
    bindStatusUpdates();
  }

  function bindStatusUpdates() {
    body.querySelectorAll('[data-status-reference]').forEach((select) => {
      select.addEventListener('change', async () => {
        const reference = select.dataset.statusReference;
        const previous = select.dataset.previous || select.value;
        select.dataset.previous = select.value;
        select.disabled = true;
        try {
          const response = await fetch(`/admin/api/enquiries/${encodeURIComponent(reference)}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ status: select.value }),
          });
          const result = await response.json();
          if (!response.ok || !result.ok) throw new Error(result.error || 'Unable to update status.');
          select.classList.add('is-saved');
          setTimeout(() => select.classList.remove('is-saved'), 900);
        } catch (error) {
          select.value = previous;
          window.alert(error.message);
        } finally {
          select.disabled = false;
        }
      });
    });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  search?.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(loadEnquiries, 250);
  });
  statusFilter?.addEventListener('change', loadEnquiries);

  bindStatusUpdates();
})();
