'use strict';

// === Modal ===
const modal = document.querySelector('[data-modal]');
const modalCloseBtn = document.querySelector('[data-modal-close]');
const modalCloseOverlay = document.querySelector('[data-modal-overlay]');

if (modal && modalCloseBtn && modalCloseOverlay) {
  const modalCloseFunc = () => modal.classList.add('closed');
  modalCloseOverlay.addEventListener('click', modalCloseFunc);
  modalCloseBtn.addEventListener('click', modalCloseFunc);
}

// === Notification Toast ===
const notificationToast = document.querySelector('[data-toast]');
const toastCloseBtn = document.querySelector('[data-toast-close]');

if (toastCloseBtn && notificationToast) {
  toastCloseBtn.addEventListener('click', () => {
    notificationToast.classList.add('closed');
  });
}

// === Mobile Menu ===
const openBtns = document.querySelectorAll('[data-mobile-menu-open-btn]');
const closeBtns = document.querySelectorAll('[data-mobile-menu-close-btn]');
const overlay = document.querySelector('[data-overlay]');
const mobileMenu = document.querySelector('[data-mobile-menu]');

if (overlay && mobileMenu) {
  const openMenu = () => {
    mobileMenu.classList.add('active');
    overlay.classList.add('active');
  };

  const closeMenu = () => {
    mobileMenu.classList.remove('active');
    overlay.classList.remove('active');
  };

  openBtns.forEach(btn => btn.addEventListener('click', openMenu));
  closeBtns.forEach(btn => btn.addEventListener('click', closeMenu));
  overlay.addEventListener('click', closeMenu);
}

// === Accordion ===
const accordionBtn = document.querySelectorAll('[data-accordion-btn]');
const accordion = document.querySelectorAll('[data-accordion]');

if (accordionBtn.length && accordion.length) {
  accordionBtn.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const clicked = btn.nextElementSibling.classList.contains('active');

      accordion.forEach((acc, j) => {
        if (!clicked && acc.classList.contains('active')) {
          acc.classList.remove('active');
          accordionBtn[j].classList.remove('active');
        }
      });

      btn.nextElementSibling.classList.toggle('active');
      btn.classList.toggle('active');
    });
  });
}
