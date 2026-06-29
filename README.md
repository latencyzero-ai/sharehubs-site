# Share Hubs Engineering — Website

The Share Hubs Engineering corporate website with user authentication.
Optimised build: hardened backend, faster assets, clean routing, and a
structure ready for the e-commerce store to be switched on later.

Built by **LatencyZero**.

---

## What this is

A Node.js/Express site serving the company's pages (home, about, contact,
sector pages, portfolio, profile, supplier) behind email-verified login.
The e-commerce store is included but **parked as a future feature** — it
ships disabled and turns on with a single environment flag.

---

## Stack

| Layer    | Technology                                          |
| -------- | --------------------------------------------------- |
| Backend  | Node.js + Express                                   |
| Database | MySQL                                               |
| Auth     | Session-based (express-session), bcrypt, email verify |
| Email    | cPanel SMTP (Nodemailer)                             |
| Security | Helmet, rate limiting, validation, secure cookies   |
| Design   | Shared design system (design-system.css) — one source of truth |
| Perf     | gzip compression, optimised images, asset caching   |

---

## Structure

```
sharehubs-site/
├── src/
│   ├── server.js            # entry point
│   ├── config/              # env, db pool, mailer
│   ├── middleware/          # route protection
│   └── routes/
│       ├── auth.js          # register / verify / login / logout
│       └── pages.js         # all site pages (one-line to add more)
├── views/                   # the site's HTML pages
│   ├── index.html, about.html, contact.html, ...
│   ├── _future_store/       # ← e-commerce store, parked (see below)
│   └── _review_medicine_toplevel.html   # a stray duplicate, kept for your review
├── public/
│   ├── css/  css-vendor/    # your styles + vendor (bootstrap etc.)
│   ├── js/   js-vendor/     # vendor scripts (jquery, owl-carousel...)
│   ├── fonts/               # fontawesome, icofont
│   └── img/                 # optimised images (was 77MB → 32MB)
├── docs/                    # CHANGELOG, DEPLOYMENT, DESIGN-SYSTEM
├── schema.sql
└── .env.example
```

---

## Quick start

```bash
mysql -u root -p < schema.sql        # create the database
cp .env.example .env                 # fill in your values
npm install
npm start                            # http://localhost:5000
```

Generate a session secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Routes

The site is **open to browse** — every informational page is public so it ranks in search and welcomes new visitors. Login only guards personal areas and the *submission* of quote/partner forms (you can fill them as a guest, sign-up to send).


| Route              | Access     | Page                |
| ------------------ | ---------- | ------------------- |
| `/`                | public        | Homepage                          |
| `/about`           | public        | About                             |
| `/contact`         | public        | Contact                           |
| `/agriculture`     | public        | Agriculture sector                |
| `/automobile`      | public        | Automobile sector                 |
| `/medicine`        | public        | Medicine sector                   |
| `/oil-and-gas`     | public        | Oil & Gas sector                  |
| `/home-and-office` | public        | Home & Office sector              |
| `/portfolio`       | public        | Portfolio                         |
| `/coming-soon`     | public        | Coming soon                       |
| `/login`           | public        | Sign in / create account          |
| `/request-quote`   | public view   | Quote form; sign-up to submit     |
| `/become-partner`  | public view   | Partner form; sign-up to submit   |
| `/profile`         | protected     | Personal profile (login required) |
| `/store`           | flagged       | E-commerce (future, STORE_ENABLED)|

---

## The e-commerce store (future feature)

The full store template lives in `views/_future_store/` — intact, just not
wired into the live site yet. To launch it later:

1. Set `STORE_ENABLED=true` in `.env`.
2. Restart the server.
3. The store appears at `/store`.

This keeps it out of the way now while preserving every file for when you
build it out. See `docs/CHANGELOG.md` for the reasoning.

---

## Deployment & contributing

See `docs/DEPLOYMENT.md` (Railway + GitHub) and `docs/CHANGELOG.md`
(everything that changed in this optimisation and why).

---

## Documentation

- `docs/DESIGN-SYSTEM.md` — the shared design tokens and components
- `docs/CHANGELOG.md` — every change across versions, with rationale
- `docs/DEPLOYMENT.md` — Railway + GitHub deployment and the commit convention
