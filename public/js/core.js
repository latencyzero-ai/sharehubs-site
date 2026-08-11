/**
 * Share Hubs Engineering — Core JavaScript v3.0
 * Vanilla JS. No jQuery required for core functionality.
 * Handles: theme, mobile nav, header scroll, smooth scroll, animations.
 */

(function() {
  'use strict';

  /* ================================================================
     THEME MANAGER — Light default, dark optional
     ================================================================ */
  const ThemeManager = {
    init() {
      const saved = localStorage.getItem('sh-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      // DEFAULT: light mode. Only go dark if explicitly saved or system prefers AND no saved preference
      if (saved === 'dark') {
        this.set('dark');
      } else if (saved === 'light') {
        this.set('light');
      } else if (prefersDark) {
        this.set('dark');
      } else {
        this.set('light');
      }

      this.bindToggle();
      this.listenSystem();
    },

    set(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('sh-theme', theme);
      this.updateIcon(theme);
    },

    toggle() {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      this.set(current === 'dark' ? 'light' : 'dark');
    },

    updateIcon(theme) {
      const btn = document.getElementById('theme-toggle');
      if (!btn) return;
      const sun = btn.querySelector('.sh-icon-sun');
      const moon = btn.querySelector('.sh-icon-moon');
      if (sun && moon) {
        sun.style.display = theme === 'dark' ? 'none' : 'block';
        moon.style.display = theme === 'dark' ? 'block' : 'none';
      }
    },

    bindToggle() {
      const btn = document.getElementById('theme-toggle');
      if (btn) {
        btn.addEventListener('click', () => this.toggle());
      }
    },

    listenSystem() {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // Only auto-switch if user hasn't manually set a preference
        if (!localStorage.getItem('sh-theme')) {
          this.set(e.matches ? 'dark' : 'light');
        }
      });
    }
  };

  /* ================================================================
     MOBILE NAVIGATION
     ================================================================ */
  const MobileNav = {
    init() {
      this.toggle = document.getElementById('menu-toggle');
      this.panel = document.getElementById('mobile-nav');
      this.body = document.body;

      if (!this.toggle || !this.panel) return;

      this.toggle.addEventListener('click', () => this.toggleMenu());

      // Close on link click
      this.panel.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => this.close());
      });

      // Close on Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen()) this.close();
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (this.isOpen() && !this.panel.contains(e.target) && !this.toggle.contains(e.target)) {
          this.close();
        }
      });
    },

    isOpen() {
      return this.panel.classList.contains('is-open');
    },

    toggleMenu() {
      this.isOpen() ? this.close() : this.open();
    },

    open() {
      this.panel.classList.add('is-open');
      this.toggle.setAttribute('aria-expanded', 'true');
      this.body.style.overflow = 'hidden';
    },

    close() {
      this.panel.classList.remove('is-open');
      this.toggle.setAttribute('aria-expanded', 'false');
      this.body.style.overflow = '';
    }
  };

  /* ================================================================
     HEADER SCROLL BEHAVIOR
     ================================================================ */
  const HeaderScroll = {
    init() {
      this.header = document.getElementById('sh-header');
      if (!this.header) return;

      let ticking = false;
      window.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            this.update();
            ticking = false;
          });
          ticking = true;
        }
      });
    },

    update() {
      const scrolled = window.scrollY > 20;
      this.header.classList.toggle('is-scrolled', scrolled);
    }
  };

  /* ================================================================
     SMOOTH SCROLL FOR ANCHOR LINKS
     ================================================================ */
  const SmoothScroll = {
    init() {
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
          const targetId = anchor.getAttribute('href');
          if (targetId === '#') return;

          const target = document.querySelector(targetId);
          if (target) {
            e.preventDefault();
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }
        });
      });
    }
  };

  /* ================================================================
     SCROLL ANIMATIONS (IntersectionObserver)
     ================================================================ */
  const ScrollAnimations = {
    init() {
      const elements = document.querySelectorAll('.sh-animate');
      if (!elements.length) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      });

      elements.forEach(el => observer.observe(el));
    }
  };

  /* ================================================================
     FAQ ACCORDION
     ================================================================ */
  const FAQAccordion = {
    init() {
      document.querySelectorAll('.sh-faq-item__question').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = btn.closest('.sh-faq-item');
          const isOpen = item.classList.contains('is-open');

          // Close all others (optional — remove this loop for multi-open)
          document.querySelectorAll('.sh-faq-item.is-open').forEach(openItem => {
            if (openItem !== item) openItem.classList.remove('is-open');
          });

          item.classList.toggle('is-open', !isOpen);
        });
      });
    }
  };

  /* ================================================================
     CURRENT YEAR IN FOOTER
     ================================================================ */
  const CurrentYear = {
    init() {
      const els = document.querySelectorAll('[data-current-year]');
      els.forEach(el => el.textContent = new Date().getFullYear());
    }
  };

  /* ================================================================
     INITIALIZE EVERYTHING
     ================================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    MobileNav.init();
    HeaderScroll.init();
    SmoothScroll.init();
    ScrollAnimations.init();
    FAQAccordion.init();
    CurrentYear.init();
  });

})();
