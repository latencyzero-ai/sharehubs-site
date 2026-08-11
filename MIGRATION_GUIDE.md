# SHARE HUBS ENGINEERING — MIGRATION GUIDE v2.0

## Overview

This guide walks you through applying the Phase A–D changes to your repository.

**What you are getting:**
- ✅ Unified design system with CSS custom properties
- ✅ Light + Dark mode with persistent toggle
- ✅ Shared EJS partials (head, header, footer, scripts, navbar)
- ✅ Redesigned Homepage, About, and Contact pages
- ✅ Proper SEO meta tags, Open Graph, Twitter Cards, JSON-LD
- ✅ Semantic HTML, accessibility improvements
- ✅ Clean copy (removed fake certifications, fixed Lorem ipsum)
- ✅ Clear conversion paths

**What is NOT changed (preserved):**
- ✅ Express server architecture
- ✅ Authentication system
- ✅ Database schema
- ✅ All existing routes and business logic
- ✅ Bootstrap grid (still used for compatibility)
- ✅ jQuery-based plugins (still loaded for existing pages)

---

## STEP 1 — Copy New Files into Your Repo

### A. Design System CSS
Copy `design-system-v2.css` into your repo:
```
public/css/design-system-v2.css
```

### B. Shared Partials
Copy these into your views folder:
```
views/partials/head.ejs
views/partials/header.ejs
views/partials/footer.ejs
views/partials/scripts.ejs
views/partials/navbar.ejs
```

### C. Theme Toggle JS
Copy into your public JS folder:
```
public/js/theme.js
```

### D. Redesigned Pages
Copy these alongside your existing pages (do NOT overwrite yet):
```
views/index-v2.ejs
views/about-v2.ejs
views/contact-v2.ejs
```

---

## STEP 2 — Update Your Route File

Open `src/routes/pages.js` and replace the `res.render()` calls to pass the `path` variable.

**Before:**
```js
res.render('index', { title: 'Home' });
```

**After:**
```js
res.render('index', { title: 'Home', path: '/' });
```

Do this for EVERY route. Here is the complete updated `src/routes/pages.js`:

```js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.render('index', { title: 'Home', path: '/' }));
router.get('/about', (req, res) => res.render('about', { title: 'About Us', path: '/about' }));
router.get('/services', (req, res) => res.render('services', { title: 'Services', path: '/services' }));
router.get('/contact', (req, res) => res.render('contact', { title: 'Contact', path: '/contact' }));
router.get('/agriculture', (req, res) => res.render('agriculture', { title: 'Agriculture', path: '/agriculture' }));
router.get('/automobile', (req, res) => res.render('automobile', { title: 'Automobile', path: '/automobile' }));
router.get('/medicine', (req, res) => res.render('medicine', { title: 'Medical Solutions', path: '/medicine' }));
router.get('/oil-and-gas', (req, res) => res.render('oil-and-gas', { title: 'Oil & Gas', path: '/oil-and-gas' }));
router.get('/home-and-office', (req, res) => res.render('home-and-office', { title: 'Home & Office', path: '/home-and-office' }));
router.get('/request-quote', (req, res) => res.render('request-quote', { title: 'Request a Quote', path: '/request-quote' }));
router.get('/request-consultation', (req, res) => res.render('request-consultation', { title: 'Request Consultation', path: '/request-consultation' }));
router.get('/portfolio-details', (req, res) => res.render('portfolio-details', { title: 'Portfolio', path: '/portfolio-details' }));
router.get('/supplier', (req, res) => res.render('supplier', { title: 'Supplier', path: '/supplier' }));
router.get('/coming-soon', (req, res) => res.render('coming_soon', { title: 'Coming Soon', path: '/coming-soon' }));
router.get('/faq', (req, res) => res.render('faq', { title: 'FAQ', path: '/faq' }));
router.get('/login', (req, res) => res.render('login', { title: 'Login', path: '/login' }));
router.get('/profile', (req, res) => res.render('profile', { title: 'Profile', path: '/profile' }));
router.get('/404', (req, res) => res.render('404', { title: 'Page Not Found', path: '/404' }));

module.exports = router;
```

---

## STEP 3 — Test the New Pages

Before replacing your existing pages, test the new ones by temporarily changing a route:

```js
router.get('/', (req, res) => res.render('index-v2', { title: 'Home', path: '/' }));
```

Visit `http://localhost:3000` and verify:
1. ✅ Page loads without errors
2. ✅ Theme toggle works (bottom-right corner)
3. ✅ Light/dark mode persists across reloads
4. ✅ Navigation highlights the active page
5. ✅ All links work
6. ✅ Mobile responsive

---

## STEP 4 — Replace Existing Pages

Once tested, rename the v2 files to overwrite the originals:

```bash
cd views
mv index-v2.ejs index.ejs
mv about-v2.ejs about.ejs
mv contact-v2.ejs contact.ejs
```

Update your routes back to normal names:
```js
router.get('/', (req, res) => res.render('index', { title: 'Home', path: '/' }));
```

---

## STEP 5 — Migrate Remaining Pages (Optional but Recommended)

The remaining pages (agriculture, automobile, medicine, oil-and-gas, home-and-office, request-quote, request-consultation, login, profile, etc.) still use the old inline structure.

For each remaining page, replace the top and bottom boilerplate with the partials:

**Old pattern (each page):**
```ejs
<!DOCTYPE html>
<html class="no-js" lang="en">
<head>
  <meta charset="utf-8">
  ... 50 lines of meta, links, scripts ...
</head>
<body class="sh">
  <div class="preloader">...</div>
  <header class="header">...</header>
  <!-- page content -->
  <footer class="footer">...</footer>
  <script src="/js/jquery.min.js"></script>
  ... 15 more scripts ...
</body>
</html>
```

**New pattern:**
```ejs
<!DOCTYPE html>
<html lang="en">
<head>
<%- include('partials/head') %>
<!-- page-specific styles -->
</head>
<body>
<%- include('partials/header') %>
<main id="main-content">
  <!-- page content -->
</main>
<%- include('partials/footer') %>
<%- include('partials/scripts') %>
</body>
</html>
```

This removes ~200 lines of duplicated boilerplate per page.

---

## STEP 6 — Performance Cleanup (High Impact)

### A. Remove Duplicate Vendor Files

You have identical files in TWO folders. Delete the duplicates:

```bash
# These are exact duplicates of /public/js/ files
rm -rf public/js-vendor/

# These are exact duplicates of /public/css/ files
rm -rf public/css-vendor/

# This is identical to public/css/site.css
rm public/assets/style.css
```

**Verify nothing breaks** by checking that all pages still reference `/js/` and `/css/` paths, not `/js-vendor/` or `/css-vendor/`.

### B. Remove Dead Code

```bash
# Future store is unused and bloats the repo by ~500KB
rm -rf views/_future_store/
rm -rf public/assets/_future_store/
```

### C. Remove Template Contamination from site.css

In `public/css/site.css`, delete these CSS blocks (search and remove):
- `.pro-features` and `.get-pro` (template purchase promo)
- `.color-plate` and `.color-plate-icon` (theme picker widget)
- `.news-single` sidebar styles (unused blog pages)
- `.mail-success` styles (unused)
- `.doctor-calendar` styles (unused medical template artifact)
- `.error-page` styles (already in 404 page)

### D. Fix Google Maps

In `public/js/main.js`, find the GMaps initialization and update it to Lagos:

```js
var map = new GMaps({
  el: '#map',
  lat: 6.5244,
  lng: 3.3792,
  scrollwheel: false,
});
map.addMarker({
  lat: 6.5244,
  lng: 3.3792,
  title: 'Share Hubs Engineering',
  infoWindow: {
    content: '<p><strong>Share Hubs Engineering</strong><br>Lagos, Nigeria<br>+234 913 511 6716</p>'
  }
});
```

---

## STEP 7 — Image Optimization (Critical for Performance)

Your images are 25MB+. Do this ASAP:

1. **Convert PNGs to WebP** using an online converter or CLI tool:
   ```bash
   # Install cwebp if needed
   cwebp -q 80 engine.png -o engine.webp
   cwebp -q 80 GEAR_1.png -o GEAR_1.webp
   # ... do this for all large images
   ```

2. **Add width/height attributes** to ALL `<img>` tags to prevent CLS:
   ```html
   <img src="/img/engine.webp" alt="Engineering equipment" width="800" height="600" loading="lazy">
   ```

3. **Add lazy loading** to below-the-fold images:
   ```html
   <img src="..." loading="lazy" width="400" height="300" alt="...">
   ```

4. **Compress existing JPGs** using TinyJPG or similar.

5. **Remove unused images** from the repo:
   - `GEAR_1.png` (3.5MB) — verify if used anywhere
   - `GEAR_2.png` (3.2MB) — verify if used anywhere
   - `ChatGPT Image` (2.1MB) — likely unused

---

## STEP 8 — SEO Enhancements

1. **Create `public/robots.txt`:**
   ```
   User-agent: *
   Allow: /
   Sitemap: https://sharehubseng.com/sitemap.xml
   ```

2. **Create `public/sitemap.xml`:**
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url><loc>https://sharehubseng.com/</loc><priority>1.0</priority></url>
     <url><loc>https://sharehubseng.com/about</loc><priority>0.8</priority></url>
     <url><loc>https://sharehubseng.com/services</loc><priority>0.8</priority></url>
     <url><loc>https://sharehubseng.com/contact</loc><priority>0.8</priority></url>
     <url><loc>https://sharehubseng.com/agriculture</loc><priority>0.7</priority></url>
     <url><loc>https://sharehubseng.com/automobile</loc><priority>0.7</priority></url>
     <url><loc>https://sharehubseng.com/medicine</loc><priority>0.7</priority></url>
     <url><loc>https://sharehubseng.com/oil-and-gas</loc><priority>0.7</priority></url>
     <url><loc>https://sharehubseng.com/home-and-office</loc><priority>0.7</priority></url>
     <url><loc>https://sharehubseng.com/request-quote</loc><priority>0.9</priority></url>
   </urlset>
   ```

3. **Enable CSP in server.js** (currently disabled):
   ```js
   // Change this:
   // contentSecurityPolicy: false,
   // To this:
   contentSecurityPolicy: {
     directives: {
       defaultSrc: ["'self'"],
       styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
       fontSrc: ["'self'", "https://fonts.gstatic.com"],
       scriptSrc: ["'self'"],
       imgSrc: ["'self'", "data:", "https:"],
     }
   }
   ```

---

## STEP 9 — Verify Checklist

After applying all changes, verify:

- [ ] Homepage loads, hero is clear, CTA is obvious
- [ ] Theme toggle works, persists, respects system preference
- [ ] No flash of wrong theme on reload
- [ ] All navigation links work
- [ ] Active page highlighted in nav
- [ ] Mobile nav works
- [ ] Footer links all valid (no `#` placeholders)
- [ ] Contact form has labels
- [ ] All images have alt text
- [ ] No horizontal scroll on mobile
- [ ] Lighthouse Performance > 60 (target: 80+)
- [ ] Lighthouse Accessibility > 90
- [ ] Lighthouse SEO > 90
- [ ] Lighthouse Best Practices > 90

---

## Files Summary

| File | Destination | Purpose |
|------|-------------|---------|
| `design-system-v2.css` | `public/css/design-system-v2.css` | Unified design tokens, dark mode, button system, card system, form system, accessibility utilities |
| `theme.js` | `public/js/theme.js` | Theme toggle logic (vanilla JS) |
| `head.ejs` | `views/partials/head.ejs` | Shared `<head>` with SEO, OG, Twitter Cards, JSON-LD, theme init |
| `header.ejs` | `views/partials/header.ejs` | Shared header with topbar, logo, nav, CTA button |
| `footer.ejs` | `views/partials/footer.ejs` | Shared footer with links, newsletter, copyright, theme toggle button |
| `scripts.ejs` | `views/partials/scripts.ejs` | Shared script tags with deferred loading |
| `navbar.ejs` | `views/partials/navbar.ejs` | Navigation with active state, ARIA roles |
| `index-v2.ejs` | `views/index.ejs` | Redesigned homepage |
| `about-v2.ejs` | `views/about.ejs` | Redesigned about page (cleaned) |
| `contact-v2.ejs` | `views/contact.ejs` | Redesigned contact page |

---

## Next Phases (After Migration)

**Phase E — Performance:**
- Remove unused jQuery plugins (Counter Up, ScrollUp, Stellar, GMaps if unused)
- Defer non-critical JS
- Implement image lazy loading across all pages
- Add `loading="lazy"` and `width`/`height` to all images
- Convert large PNGs to WebP

**Phase F — Remaining Pages:**
- Migrate agriculture, automobile, medicine, oil-and-gas, home-and-office to new partials
- Add proper meta descriptions to each page
- Standardize page structure

**Phase G — Final QA:**
- Cross-browser testing
- Mobile testing (iOS Safari, Android Chrome)
- Lighthouse audit on every page
- Accessibility audit with axe or WAVE
