# MIGRATION GUIDE v4.0
## Brand-Strict | 3-Slide Hero | No Dropdown | Realistic Certs | Preloader

### What Changed
- **Strict brand colors only**: #800000, #000000, #1C1C1C, offwhite. No navy blue anywhere.
- **3-slide hero carousel**: Left-aligned text, auto-rotating every 6 seconds, original 3 images retained.
- **Preloader**: Clean logo + progress bar on every page load.
- **No dropdown nav**: All industries visible in navbar + login button.
- **Realistic certifications**: CAC Registered, MAN Member, Quality Assured, Safety Compliant, Made in Nigeria. No fake ISO numbers.
- **Aggressive mobile optimization**: Full-screen mobile nav, touch-friendly targets, responsive grids.
- **Light mode default**: Dark mode available via toggle.
- **Lazy loading**: All below-fold images use loading="lazy".

### Files (23 total)
- public/css/design-system-v4.css
- public/js/core.js
- views/partials/head.ejs, header.ejs, navbar.ejs, footer.ejs, scripts.ejs
- views/index.ejs, about.ejs, contact.ejs, services.ejs
- views/agriculture.ejs, automobile.ejs, medicine.ejs, oil-and-gas.ejs, home-and-office.ejs
- views/request-quote.ejs, request-consultation.ejs, faq.ejs, 404.ejs, coming_soon.ejs
- src/routes/pages-v4.js

### Steps
1. Backup: `git branch backup-before-v4 && git add . && git commit -m backup`
2. Extract zip into project root
3. Delete `src/routes/pages.js`, rename `pages-v4.js` → `pages.js`
4. In `server.js`, update 404 handler: `res.status(404).render('404', { title: 'Page Not Found', path: '/404' });`
5. `npm start` → test at http://localhost:5000
6. `git add . && git commit -m "feat: v4 brand-strict overhaul" && git push origin main`

### Cleanup (after verify)
```bash
rm -rf public/js-vendor/ public/css-vendor/
rm -rf views/_future_store/ public/assets/_future_store/
rm public/css/design-system.css public/css/design-system-v2.css public/css/design-system-v3.css
rm public/js/theme.js
```
