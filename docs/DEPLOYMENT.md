# Deployment & GitHub Guide

## GitHub — fresh repository

You asked to treat this as a new project in a clean repo. From inside
`sharehubs-site/`:

```bash
git init
git add .
git commit -m "feat: optimised Share Hubs site (v2) — hardened backend, optimised assets, clean routing"
git branch -M main
git remote add origin https://github.com/latencyzero-ai/sharehubs-site.git
git push -u origin main
```

`.env` and `node_modules/` are git-ignored, so no secrets or bulk get pushed.

### Commit convention (document as you go)

- `feat:` new feature       · `fix:` bug fix      · `perf:` performance
- `docs:` documentation     · `style:` UI/visual  · `chore:` config/tooling
- `refactor:` restructuring without behaviour change

Example: `perf: lazy-load sector page hero images`.

---

## Deploying the backend (Railway)

This is a stateful Express app with sessions, so it wants a persistent host
like Railway (not serverless).

1. **Railway → New Project → Deploy from GitHub repo.**
2. **Add MySQL:** New → Database → MySQL.
3. **Variables** (use Railway's MySQL references):
   ```
   NODE_ENV=production
   PORT=5000
   BASE_URL=https://<your-app>.up.railway.app
   STORE_ENABLED=false
   DB_HOST=${{MySQL.MYSQLHOST}}
   DB_USER=${{MySQL.MYSQLUSER}}
   DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
   DB_NAME=${{MySQL.MYSQLDATABASE}}
   DB_PORT=${{MySQL.MYSQLPORT}}
   SESSION_SECRET=<node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
   SMTP_HOST=mail.yourdomain.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=no-reply@yourdomain.com
   SMTP_PASS=<mailbox password>
   MAIL_FROM=Share Hubs Engineering <no-reply@yourdomain.com>
   ```
4. **Create tables:** run `schema.sql` against the MySQL plugin.
5. Railway gives you a live URL. Visit `/health` to confirm it's up, then
   `/login` to see the site.

> Note: because the whole site sits behind login, the shareable link people
> will test is `…/login` — they register, verify by email, then browse.

---

## End-to-end test

1. Open `…/login`, register with a real email.
2. Receive the cPanel verification mail, click the link.
3. Redirected to login with a success flag → sign in.
4. Land on the homepage; click through the sector pages.
5. `/logout` ends the session.

---

## Launching the store later

When you're ready to build out e-commerce:

1. `STORE_ENABLED=true` in Railway variables.
2. Redeploy.
3. `/store` goes live. Then iterate on `views/_future_store/`.

---

## Troubleshooting

| Symptom                     | Fix                                                       |
| --------------------------- | -------------------------------------------------------- |
| Logged out on every refresh | Confirm `NODE_ENV=production` and HTTPS (secure cookie).  |
| No verification email       | Check `SMTP_*`; try port 587 with `SMTP_SECURE=false`.    |
| `/health` 502               | Check Railway logs — a missing env var exits loudly with its name. |
| Images 404                  | Pages reference `/img/...` and legacy `/assets/img/...`; both are served. |
