/* =====================================================================
   Share Hubs — adaptive header
   Swaps the Logout link to "Sign in" for guests. Does not inject items
   into the main sector menu (keeps it uncluttered). "Request a Quote"
   is the hardcoded button; "Become a Partner" lives in the hero & footer.
   ===================================================================== */
(function () {
  const isLoggedIn = document.cookie.split('; ').some(c => c === 'sh_ui_logged_in=1');

  function build() {
    document.querySelectorAll('a').forEach((a) => {
      const txt = (a.textContent || '').trim().toLowerCase();
      if (txt.endsWith('logout')) {
        if (isLoggedIn) {
          a.setAttribute('href', '/logout');
          a.removeAttribute('onclick');
        } else {
          a.setAttribute('href', '/login');
          a.removeAttribute('onclick');
          a.innerHTML = a.innerHTML.replace(/Logout/i, 'Sign in');
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
