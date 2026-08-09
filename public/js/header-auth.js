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

/* =====================================================================
   Mobile nav close UX
   The hamburger button already toggles the dropdown correctly (that's
   Slicknav's own behavior) — but nothing signals it's now a close
   button, and tapping outside the menu does nothing. This adds:
   - hamburger icon animates into an X while the menu is open
   - tapping anywhere outside the menu (including the dimmed backdrop)
     closes it, without triggering whatever's underneath
   - Escape key closes it
   ===================================================================== */
(function () {
  function init() {
    const btn = document.querySelector('.slicknav_btn');
    const menu = document.querySelector('.slicknav_menu');
    if (!btn || !menu) return; // pages without the Slicknav mobile nav

    // Slicknav already adds/removes this class itself — use it as the source
    // of truth instead of tracking our own state.
    function isOpen() {
      return btn.classList.contains('slicknav_open');
    }

    // .slicknav_nav is position:absolute, so it doesn't contribute to
    // .slicknav_menu's own bounding box — check the button and (when open)
    // the dropdown's own box explicitly, rather than relying on menu's rect.
    function isInsideMenu(x, y) {
      const nav = menu.querySelector('.slicknav_nav');
      const boxes = [btn.getBoundingClientRect()];
      if (nav && getComputedStyle(nav).display !== 'none') boxes.push(nav.getBoundingClientRect());
      return boxes.some(r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom);
    }

    document.addEventListener('click', (e) => {
      if (!e.isTrusted) return; // ignore our own synthetic btn.click() calls below —
                                 // without this, this listener intercepts them too
                                 // (their clientX/Y default to 0,0) and blocks Slicknav's
                                 // real handler from ever running via stopPropagation
      if (!isOpen()) return;
      // menu.contains() isn't enough: the dimmed backdrop is a ::after
      // pseudo-element of .slicknav_nav, so clicks anywhere on it report
      // .slicknav_nav as the target — technically "inside" the menu in the
      // DOM, even though visually it's the backdrop. Check real screen
      // position instead.
      if (isInsideMenu(e.clientX, e.clientY)) return;
      e.preventDefault();
      e.stopPropagation();
      btn.click(); // reuse Slicknav's own toggle so its internal state stays in sync
    }, true);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) btn.click();
    });
  }

  if (window.jQuery) {
    window.jQuery(init); // jQuery ready — fires after main.js's own ready callback
                          // (which creates the Slicknav elements), since jQuery
                          // runs ready callbacks in registration order and
                          // main.js loads before this script
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();