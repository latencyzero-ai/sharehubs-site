/**
 * Share Hubs Engineering — Theme Toggle
 * Vanilla JS, no dependencies. Respects prefers-reduced-motion.
 */
(function() {
  'use strict';

  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;

  const sunIcon = toggleBtn.querySelector('.sun-icon');
  const moonIcon = toggleBtn.querySelector('.moon-icon');
  const html = document.documentElement;

  function getCurrentTheme() {
    return html.getAttribute('data-theme') || 'light';
  }

  function setIcon(theme) {
    if (!sunIcon || !moonIcon) return;
    if (theme === 'dark') {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
  }

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('sh-theme', theme);
    setIcon(theme);
  }

  // Initialize icon on load
  setIcon(getCurrentTheme());

  // Toggle handler
  toggleBtn.addEventListener('click', function() {
    const current = getCurrentTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  // Listen for system preference changes (only if no explicit choice saved)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    if (!localStorage.getItem('sh-theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
})();
