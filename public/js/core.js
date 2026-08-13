(function() {
  'use strict';

  /* ================================================================
     THEME
     ================================================================ */
  const ThemeManager = {
    init() {
      const saved = localStorage.getItem('sh-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (saved === 'dark') { this.set('dark'); }
      else if (saved === 'light') { this.set('light'); }
      else if (prefersDark) { this.set('dark'); }
      else { this.set('light'); }
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
      if (btn) btn.addEventListener('click', () => this.toggle());
    },
    listenSystem() {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('sh-theme')) this.set(e.matches ? 'dark' : 'light');
      });
    }
  };

  /* ================================================================
     HERO SLIDER
     ================================================================ */
  const HeroSlider = {
    init() {
      this.slides = document.querySelectorAll('.sh-hero__slide');
      this.contents = document.querySelectorAll('.sh-hero__content');
      this.dots = document.querySelectorAll('.sh-hero__dot');
      if (!this.slides.length) return;
      this.current = 0;
      this.total = this.slides.length;
      this.interval = null;
      this.startAuto();
      this.bindDots();
    },
    goTo(index) {
      this.slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
      this.contents.forEach((c, i) => c.classList.toggle('is-active', i === index));
      this.dots.forEach((d, i) => d.classList.toggle('is-active', i === index));
      this.current = index;
    },
    next() {
      this.goTo((this.current + 1) % this.total);
    },
    startAuto() {
      this.interval = setInterval(() => this.next(), 6000);
    },
    bindDots() {
      this.dots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
          clearInterval(this.interval);
          this.goTo(i);
          this.startAuto();
        });
      });
    }
  };

  /* ================================================================
     MOBILE NAV
     ================================================================ */
  const MobileNav = {
    init() {
      this.toggle = document.getElementById('menu-toggle');
      this.panel = document.getElementById('mobile-nav');
      this.body = document.body;
      if (!this.toggle || !this.panel) return;
      this.toggle.addEventListener('click', () => this.toggleMenu());
      this.panel.querySelectorAll('a').forEach(link => link.addEventListener('click', () => this.close()));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.isOpen()) this.close(); });
      document.addEventListener('click', (e) => {
        if (this.isOpen() && !this.panel.contains(e.target) && !this.toggle.contains(e.target)) this.close();
      });
      this.initMobileDropdown();
    },
    isOpen() { return this.panel.classList.contains('is-open'); },
    toggleMenu() { this.isOpen() ? this.close() : this.open(); },
    open() { this.panel.classList.add('is-open'); this.toggle.setAttribute('aria-expanded', 'true'); this.body.style.overflow = 'hidden'; },
    close() { this.panel.classList.remove('is-open'); this.toggle.setAttribute('aria-expanded', 'false'); this.body.style.overflow = ''; },
    initMobileDropdown() {
      const btn = document.getElementById('mobile-industries-toggle');
      const menu = document.getElementById('mobile-industries-menu');
      if (!btn || !menu) return;
      btn.addEventListener('click', () => {
        const isOpen = menu.classList.contains('is-open');
        menu.classList.toggle('is-open', !isOpen);
        btn.setAttribute('aria-expanded', !isOpen);
        menu.setAttribute('aria-hidden', isOpen);
      });
    }
  };

  /* ================================================================
     DESKTOP DROPDOWN
     ================================================================ */
  const DesktopDropdown = {
    init() {
      document.querySelectorAll('.sh-nav__item--has-dropdown').forEach(item => {
        const toggle = item.querySelector('.sh-nav__dropdown-toggle');
        const dropdown = item.querySelector('.sh-nav__dropdown');
        if (!toggle || !dropdown) return;

        // Click to toggle
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = item.classList.contains('is-open');
          this.closeAll();
          if (!isOpen) {
            item.classList.add('is-open');
            toggle.setAttribute('aria-expanded', 'true');
          }
        });

        // Hover support (desktop only)
        item.addEventListener('mouseenter', () => {
          if (window.innerWidth > 1100) {
            item.classList.add('is-open');
            toggle.setAttribute('aria-expanded', 'true');
          }
        });
        item.addEventListener('mouseleave', () => {
          if (window.innerWidth > 1100) {
            item.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
          }
        });
      });

      // Close all on outside click
      document.addEventListener('click', () => this.closeAll());
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeAll();
      });
    },
    closeAll() {
      document.querySelectorAll('.sh-nav__item--has-dropdown.is-open').forEach(item => {
        item.classList.remove('is-open');
        const toggle = item.querySelector('.sh-nav__dropdown-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      });
    }
  };

  /* ================================================================
     HEADER SCROLL
     ================================================================ */
  const HeaderScroll = {
    init() {
      this.header = document.getElementById('sh-header');
      if (!this.header) return;
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(() => { this.update(); ticking = false; });
          ticking = true;
        }
      });
    },
    update() { this.header.classList.toggle('is-scrolled', window.scrollY > 20); }
  };

  /* ================================================================
     SMOOTH SCROLL
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
            const offset = target.getBoundingClientRect().top + window.pageYOffset - 80;
            window.scrollTo({ top: offset, behavior: 'smooth' });
          }
        });
      });
    }
  };

  /* ================================================================
     SCROLL ANIMATIONS
     ================================================================ */
  const ScrollAnimations = {
    init() {
      const els = document.querySelectorAll('.sh-animate');
      if (!els.length) return;
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
      }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
      els.forEach(el => observer.observe(el));
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
          document.querySelectorAll('.sh-faq-item.is-open').forEach(openItem => { if (openItem !== item) openItem.classList.remove('is-open'); });
          item.classList.toggle('is-open', !isOpen);
          btn.setAttribute('aria-expanded', !isOpen);
        });
      });
    }
  };

  /* ================================================================
     CURRENT YEAR
     ================================================================ */
  const CurrentYear = {
    init() {
      document.querySelectorAll('[data-current-year]').forEach(el => el.textContent = new Date().getFullYear());
    }
  };

  /* ================================================================
     INIT
     ================================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    HeroSlider.init();
    MobileNav.init();
    DesktopDropdown.init();
    HeaderScroll.init();
    SmoothScroll.init();
    ScrollAnimations.init();
    FAQAccordion.init();
    CurrentYear.init();
  });
})();
