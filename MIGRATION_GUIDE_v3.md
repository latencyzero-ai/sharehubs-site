# SHARE HUBS ENGINEERING — v3 MIGRATION GUIDE
## Complete UI/UX Overhaul | Industry Standard | Light Mode Default

---

## What Changed

This is a **complete rebuild** of the frontend. Everything is now:
- ✅ **Consistent** — One design system, one visual language across all pages
- ✅ **Industry standard** — Clean, professional B2B engineering aesthetic
- ✅ **Light mode default** — Dark mode available via toggle, but light is the default
- ✅ **Accessible** — Proper labels, focus states, skip links, semantic HTML
- ✅ **Fast** — No jQuery dependency for core functionality, vanilla JS only
- ✅ **Mobile-first** — Responsive from 320px to 4K

---

## Files to Replace

### 1. CSS (NEW)
```
public/css/design-system-v3.css    ← Replaces design-system.css + patches site.css
```

### 2. JS (NEW)
```
public/js/core.js                  ← Replaces jQuery for nav, theme, animations
```

### 3. Partials (NEW)
```
views/partials/head.ejs            ← Shared <head> with SEO, OG, structured data
views/partials/header.ejs          ← New modern header with mobile nav
views/partials/navbar.ejs          ← Desktop nav with dropdown
views/partials/footer.ejs          ← Clean 4-column footer
views/partials/scripts.ejs         ← Loads Bootstrap + core.js
```

### 4. Pages (ALL REPLACED)
```
views/index.ejs                    ← Complete redesign
views/about.ejs                    ← Clean, no fake certs, no Lorem ipsum
views/contact.ejs                  ← Proper labels, clean layout
views/services.ejs                 ← NEW — comprehensive services overview
views/agriculture.ejs              ← NEW — industry-specific
views/automobile.ejs               ← NEW — industry-specific
views/medicine.ejs                 ← NEW — industry-specific
views/oil-and-gas.ejs              ← NEW — industry-specific
views/home-and-office.ejs          ← NEW — industry-specific
views/request-quote.ejs            ← NEW — detailed quote form
views/request-consultation.ejs     ← NEW — consultation form
views/faq.ejs                      ← NEW — accordion FAQ
views/404.ejs                      ← NEW — clean 404
views/coming_soon.ejs              ← NEW — clean coming soon
```

### 5. Routes (REPLACE)
```
src/routes/pages-v3.js             ← Updated with SEO context for every route
```

---

## Step-by-Step Migration

### Step 1: Backup Your Current Work
```bash
cd C:\Users\DELL\Desktop\Projects\sharehubs-site
git branch backup-before-v3
git add .
git commit -m "chore: backup before v3 overhaul"
```

### Step 2: Extract the Zip
Extract `sharehubs-v3-complete.zip` into your project root. It will create:
- `public/css/design-system-v3.css`
- `public/js/core.js`
- `views/partials/` (5 files)
- `views/*.ejs` (14 page files)
- `src/routes/pages-v3.js`

### Step 3: Replace Routes
1. Delete `src/routes/pages.js`
2. Rename `src/routes/pages-v3.js` → `src/routes/pages.js`

### Step 4: Update server.js
In `src/server.js`, find the line that serves static files and make sure CSS/JS paths are correct:
```js
app.use(express.static(path.join(__dirname, '../public')));
```

Also update the 404 handler to use the new template:
```js
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found', path: '/404' });
});
```

### Step 5: Clean Up Old Files (Optional but Recommended)
Delete these to remove bloat:
```bash
# Duplicate vendor folders
rm -rf public/js-vendor/
rm -rf public/css-vendor/

# Unused future store
rm -rf views/_future_store/
rm -rf public/assets/_future_store/

# Old design system (replaced by v3)
rm public/css/design-system.css
rm public/css/design-system-v2.css

# Old theme JS (replaced by core.js)
rm public/js/theme.js
```

### Step 6: Test
```bash
npm start
# Visit http://localhost:5000
```

Check:
- [ ] Homepage loads with new hero
- [ ] Light mode is default
- [ ] Theme toggle switches to dark and persists
- [ ] Mobile menu works (hamburger → full-screen nav)
- [ ] All navigation links work
- [ ] Active page highlighted in nav
- [ ] Footer has working links (no # placeholders)
- [ ] Contact form has labels
- [ ] FAQ accordion works
- [ ] All industry pages load
- [ ] Quote form and consultation form load
- [ ] 404 page works
- [ ] No horizontal scroll on mobile

### Step 7: Commit and Push
```bash
git add .
git commit -m "feat: v3 complete UI overhaul — industry standard design, light mode default, shared partials, all pages redesigned"
git push origin main
```

---

## What Happens to Old Pages?

The following pages are NOT yet migrated to the new design system. They will still work but won't match the new visual style until you update them:
- `login.ejs`
- `profile.ejs`
- `portfolio-details.ejs`
- `supplier.ejs`

To migrate them, wrap their content with the new partials:
```ejs
<!DOCTYPE html>
<html lang="en">
<head>
<%- include('partials/head') %>
</head>
<body>
<%- include('partials/header') %>
<main id="main-content">
  <!-- old page content -->
</main>
<%- include('partials/footer') %>
<%- include('partials/scripts') %>
</body>
</html>
```

---

## Performance Checklist

After migration, verify these metrics in Chrome DevTools Lighthouse:
- [ ] Performance > 70 (target: 90+)
- [ ] Accessibility > 95
- [ ] Best Practices > 90
- [ ] SEO > 95

If Performance is low:
1. Convert PNG images to WebP
2. Add `width` and `height` to all `<img>` tags
3. Add `loading="lazy"` to below-fold images
4. Remove unused Bootstrap JS plugins
5. Compress images with TinyPNG/TinyJPG

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Light mode default** | B2B engineering clients expect professional, clean white backgrounds. Dark mode is available but not forced. |
| **No topbar** | Wastes vertical space. Contact info moved to footer and hero. |
| **Fixed header with blur** | Modern, clean, always accessible. Backdrop-filter gives glassmorphism effect. |
| **Vanilla JS core** | jQuery is 87KB + plugins. Core.js is 7KB and handles everything needed. |
| **CSS Grid + Flexbox** | Modern layout without Bootstrap dependency. Bootstrap grid still loaded for compatibility. |
| **Card-based design** | Industry standard for B2B services. Clear information hierarchy. |
| **Orange accent (#FF6B00)** | More vibrant and modern than the old #FFA500. Better contrast. |
| **Consistent section spacing** | 96px (6rem) default. Creates breathing room and professionalism. |
| **No fake certifications** | Removed ISO claims that couldn't be verified. Builds real trust. |
| **Real FAQ content** | Actual questions engineering clients ask, not placeholder text. |

---

## Troubleshooting

**"Page looks broken / styles not loading"**
→ Make sure `design-system-v3.css` is in `public/css/` and the link in `head.ejs` points to `/css/design-system-v3.css`

**"Mobile menu doesn't work"**
→ Check that `core.js` is loaded. Open DevTools console — any errors?

**"Theme toggle doesn't persist"**
→ Check that `core.js` is loaded and `localStorage` is not disabled in browser privacy settings.

**"Some pages still look old"**
→ You may have cached the old CSS. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac).

**"Login / Profile pages look different"**
→ These pages were not redesigned in v3. Migrate them using the partial wrapper shown above.
