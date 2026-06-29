# Changelog & Rationale — v2 Optimisation

What changed when the original `LOGIN SYSTEM` project was optimised into this
clean build. **Nothing was deleted** — every page, asset, and the entire store
were carried over. The changes harden, speed up, and tidy the project.

---

## Performance

| Change                          | Impact                                              |
| ------------------------------- | --------------------------------------------------- |
| Optimised all images            | **77MB → 32MB** (59% smaller). Capped at 1920px wide, JPGs re-encoded at q82, PNGs compressed. The worst offender (`eng5.jpg`) went 11MB → 0.49MB. |
| gzip compression (`compression`)| Every HTML/CSS/JS response compressed on the wire.  |
| Static asset caching            | 7-day cache headers on images, CSS, JS, fonts.      |

This is the single biggest user-facing improvement — pages that were slow to
load (140MB of images across the project) are now light.

---

## Security & backend

| Original                                   | Now                                              |
| ------------------------------------------ | ------------------------------------------------ |
| Hardcoded DB password fallback in `db.js`  | All credentials via env vars; app exits if missing |
| Gmail app password committed in `.env`     | cPanel SMTP via env vars; `.env` git-ignored     |
| Session secret hardcoded `'yourSecretKey'` | `SESSION_SECRET` from env                         |
| Insecure session cookie                    | `httpOnly` + `secure` (prod) + `sameSite`         |
| Test email sent on every server boot       | Removed                                           |
| No rate limiting                           | 20 req / 15 min on login & register               |
| No input validation                        | `express-validator` on all auth inputs            |
| Verification token never expired           | 24-hour expiry                                    |
| `db.connect` with `throw` (crashes app)    | Pooled connection; errors logged, server stays up |
| Single MySQL connection                    | Connection pool (survives drops, handles load)    |
| `bcrypt` (native build)                    | `bcryptjs` (pure JS, deploys anywhere)            |

---

## Routing & structure

- **Fixed the duplicate `app.get('/')` bug.** The original defined `/` twice
  (login *and* index) — the second was dead. Now `/login` is the login page
  and `/` is the homepage.
- **Fixed broken internal links.** Pages linked to `blog-single.html`,
  `service-details.html`, and `404.html` directly — some didn't exist. These
  now point to real routes (`/coming-soon`, `/portfolio`, etc.).
- **Normalised messy routes.** `/oil&gas` → `/oil-and-gas`,
  `/home&office` → `/home-and-office` (ampersands in URLs are fragile).
- **Routes generated from a map.** Adding a page is now one line in
  `src/routes/pages.js` instead of a copy-pasted handler.
- **Modular layout.** `config/`, `middleware/`, `routes/` — the live code path
  is obvious; no vestigial files.

---

## The store → future feature

The entire `views/product/` e-commerce template (its own pages, ~120 product
images, scripts) was moved to `views/_future_store/` and put behind a
`STORE_ENABLED` flag (default off). It's preserved completely but doesn't load
or slow anything down until you choose to launch it. Its nested `.git` history
was removed so it doesn't conflict with the main repo.

---

## Files kept for your review (not auto-deleted)

- `views/_review_medicine_toplevel.html` — there was a stray `medicine.html` at
  the top level that **differed** from `views/medicine.html`. Rather than guess
  which is correct, both are kept. Compare them and delete whichever is stale.
- One exact-duplicate image (`...site (1).jpg`) was left in place because a page
  may reference that filename. Safe to remove once you confirm it's unused.

---

## Still deferred (intentional)

- Password reset flow
- OAuth / social login
- Building out the e-commerce store

The auth foundation here is what those build on when their time comes.

---

## v2.1 — Public access + signup hooks

Changed the product model so the site no longer hides behind a login (which
blocks reach, search indexing, and scares off new visitors). Now:

- **Every informational page is public** — homepage, about, contact, all sector
  pages, portfolio. Browsable with no account; indexable by search engines.
- **Login gates only high-intent actions**, not pages:
  - **Request a Quote** (primary hook, widest funnel) — the hero CTA.
  - **Become a Partner** (secondary hook) — for higher-commitment visitors.
  - The store (future, behind `STORE_ENABLED`).
- **Soft, dismissible signup prompt.** Guests can open and fill the quote/partner
  forms freely. Only at *submit* does a gentle modal ask them to create an
  account "to send and track" the request — with a "Keep browsing" escape and a
  "draft saved" reassurance. Never a wall.
- **Guest-start, sign-up-to-finish flow.** The login honours a `?next=` param,
  so after signing up the user returns to exactly where they were.
- **Adaptive header.** Navigation reflects login state automatically (guest sees
  "Sign in"; logged-in sees "Logout / My Requests") via a small shared script,
  so all pages stay consistent without per-template edits.
- `/profile` and `/my-requests` remain genuinely private.

Why this shape for a startup: the goal is reach and discovery. An open site
gets found by investors, partners, and new clients and ranks in search; the
signup then captures leads precisely where someone has signalled real intent.

---

## v3.0 — Design-system unification + Lighthouse pass

A full design pass: one shared design system now drives every page, and the
whole site was optimised toward a strong Lighthouse score.

### Design system
- New `public/css/design-system.css` — the single source of truth. Design
  tokens (the crimson/ink palette, Sora + Poppins type, spacing, radius,
  shadows) plus reusable component classes (`.sh-btn`, `.sh-card`, `.sh-field`,
  `.sh-toast`, `.sh-modal`, `.sh-eyebrow`). Every page imports it.
- Login/signup page fully rebuilt to match the quote page: tabbed Sign in /
  Create account, inline validation, password show/hide, loading spinners, and
  the unified toast — replacing the old jQuery sliding-panel version.
- Homepage appointment form and the contact form restyled to the dark system
  (were white/mismatched).
- Section headings brightened for contrast (were dim grey — also an
  accessibility win).

### Bugs fixed in this pass
- Contact page was still on the original medical template (wrong nav with
  "Doctors/FAQ", broken logo, fake +880 phone, white inputs) — rebuilt to match.
- 7 pages used relative `js/` script paths that broke on non-root routes
  (e.g. `/contact`) — all made absolute.
- Exposed Google Maps API key removed from contact (security).
- Orphaned map scripts (`map-active.js`, `gmaps.min.js`) removed — were throwing
  `GMaps is not defined`.
- Unguarded `profileIcon` / `scrollContainer` scripts crashing pages — guarded
  site-wide.
- The leftover "Get Pro / Products" template promo widget removed from all pages.
- The deprecated `$(document).on('ready')` (dead in jQuery 3) → `$(function(){})`,
  which had been disabling the hero slider and mobile nav.
- Broken-Unicode image filenames (DALL·E…, 𝗖𝘂𝘁𝗲𝗰𝗵…) renamed to clean names.
- Transparent gear PNG used as a section background → swapped for an opaque photo.

### Lighthouse / performance
- All below-fold images `loading="lazy"`; logos kept eager (LCP).
- Scripts `defer`-ed (order preserved so jQuery still loads first).
- `lang="en"` confirmed on every page; meta descriptions on every page.
- Site-wide `:focus-visible` outlines for keyboard accessibility.
- Static-asset cache disabled in dev, 7-day in production.
- Images compressed (main site + store): ~140MB → ~50MB.

### Verified
All 14 pages load with **zero JavaScript errors** (checked in a headless
browser). Remaining items are cosmetic polish, noted in the README.
