document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form[action="/contact"]');

  if (!form) return;

  const button = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', () => {
    if (!button) return;

    button.disabled = true;
    button.textContent = 'Sending…';
  });
});