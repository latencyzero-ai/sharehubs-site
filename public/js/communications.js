(() => {
  const forms = document.querySelectorAll('form[data-communication-form]');
  forms.forEach((form) => {
    const button = form.querySelector('button[type="submit"]');
    const state = document.createElement('div');
    state.className = 'sh-form-status sh-mt-4';
    state.setAttribute('role', 'status');
    form.appendChild(state);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      state.textContent = '';
      state.className = 'sh-form-status sh-mt-4';
      button.disabled = true;
      const original = button.textContent;
      button.textContent = 'Sending…';
      try {
        const response = await fetch(form.action, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: new URLSearchParams(new FormData(form)),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.error || 'We could not submit your request.');
        form.reset();
        state.className = 'sh-form-status sh-mt-4';
        state.innerHTML = `<strong>Request received.</strong><br>${result.message || 'Thank you. Our team will be in touch.'}${result.reference ? `<br><span>Reference: <strong>${result.reference}</strong></span>` : ''}`;
      } catch (error) {
        state.className = 'sh-form-status sh-mt-4';
        state.textContent = error.message || 'Something went wrong. Please try again.';
      } finally {
        button.disabled = false;
        button.textContent = original;
      }
    });
  });
})();
