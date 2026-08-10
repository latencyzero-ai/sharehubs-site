# deploy.ps1 — One-command migration: static HTML → EJS with shared navbar
# Run this from the sharehubs-site repo root in PowerShell

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Share Hubs — EJS Migration Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 0. Verify we're in the right place
if (-not (Test-Path "src/server.js") -or -not (Test-Path "views")) {
    Write-Host "❌ Error: Run this script from the sharehubs-site repo root." -ForegroundColor Red
    Write-Host "   (where src/server.js and views/ exist)" -ForegroundColor Red
    exit 1
}

# 1. Install EJS dependency
Write-Host "📦 Installing EJS..." -ForegroundColor Yellow
npm install

# 2. Create partials folder
Write-Host "📁 Creating views/partials/..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "views/partials" | Out-Null

# 3. Create the navbar partial
Write-Host "🧩 Writing views/partials/navbar.ejs..." -ForegroundColor Yellow
$navbar = @'
<!-- Shared navbar partial — one source of truth for all pages -->
<!-- Usage: <%- include('partials/navbar') %> -->
<% const items = [
  { path: '/agriculture',    label: 'Agriculture' },
  { path: '/automobile',      label: 'Automobile' },
  { path: '/medicine',        label: 'Medical Solutions' },
  { path: '/oil-and-gas',     label: 'Oil & Gas' },
  { path: '/home-and-office', label: 'Home & Offices' },
]; %>
<ul class="nav menu">
  <% items.forEach(item => { %>
    <li class="<%= path === item.path ? 'active' : '' %>">
      <a href="<%= item.path %>"><%= item.label %></a>
    </li>
  <% }); %>
</ul>
'@
$navbar | Out-File -Encoding utf8 "views/partials/navbar.ejs"

# 4. Overwrite server.js
Write-Host "🖥️  Updating src/server.js..." -ForegroundColor Yellow
$server = @'
/**
 * Share Hubs Engineering — site server (EJS + shared partials)
 */
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config/env');
const authRoutes = require('./routes/auth');
const pageRoutes = require('./routes/pages');

const app = express();
app.set('trust proxy', 1);

// --- EJS view engine ------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// --- Core middleware ----------------------------------------------
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.env === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600 * 1000,
    },
  })
);

const { loginFlag } = require('./middleware/loginflag');
app.use(loginFlag);

// --- Static assets (long cache) -----------------------------------
const staticOpts = { maxAge: config.env === 'production' ? '7d' : 0, etag: true };
const PUB = path.join(__dirname, '..', 'public');
app.use('/css', express.static(path.join(PUB, 'css'), staticOpts));
app.use('/js', express.static(path.join(PUB, 'js'), staticOpts));
app.use('/img', express.static(path.join(PUB, 'img'), staticOpts));
app.use('/fonts', express.static(path.join(PUB, 'fonts'), staticOpts));
app.use('/assets/css', express.static(path.join(PUB, 'css-vendor'), staticOpts));
app.use('/assets/img', express.static(path.join(PUB, 'img'), staticOpts));
app.use('/assets/fonts', express.static(path.join(PUB, 'fonts'), staticOpts));
app.use('/assets', express.static(path.join(PUB, 'assets'), staticOpts));

// --- Rate limiting on auth ----------------------------------------
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);

// --- Routes -------------------------------------------------------
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'sharehubs-site', time: new Date().toISOString() }));
app.use('/auth', authRoutes);
app.use('/', pageRoutes);

// --- 404 ----------------------------------------------------------
app.use((_req, res) => res.status(404).render('404', { title: 'Page Not Found', path: '/404' }));

app.listen(config.port, () => {
  console.log(`🚀 Share Hubs site running on http://localhost:${config.port} [${config.env}]`);
});
'@
$server | Out-File -Encoding utf8 "src/server.js"

# 5. Overwrite pages.js
Write-Host "🗺️  Updating src/routes/pages.js..." -ForegroundColor Yellow
$pages = @'
/**
 * Page routes — EJS res.render() with shared partials.
 *
 * Every page gets:
 *   - title:   for <title> tag
 *   - path:    current URL path (so navbar can highlight active page)
 *   - user:    { isLoggedIn, username } from attachUser middleware
 */
const express = require('express');
const path = require('path');
const { protect, attachUser } = require('../middleware/auth');

const router = express.Router();

router.use(attachUser);

// Helper: render a page with title + path + user context
const page = (view, title) => (req, res) =>
  res.render(view, { title, path: req.path, user: res.locals });

// --- PUBLIC informational pages (no login) ------------------------
router.get('/',            page('index',           'Share Hubs Engineering'));
router.get('/about',       page('about',           'About Us | Share Hubs Engineering'));
router.get('/contact',     page('contact',         'Contact | Share Hubs Engineering'));
router.get('/agriculture', page('agriculture',     'Agriculture | Share Hubs Engineering'));
router.get('/automobile',  page('automobile',      'Automobile | Share Hubs Engineering'));
router.get('/medicine',    page('medicine',        'Medical Solutions | Share Hubs Engineering'));
router.get('/oil-and-gas', page('oil-and-gas',     'Oil & Gas | Share Hubs Engineering'));
router.get('/home-and-office', page('home-and-office', 'Home & Office | Share Hubs Engineering'));
router.get('/portfolio',   page('portfolio-details', 'Portfolio | Share Hubs Engineering'));
router.get('/coming-soon', page('coming_soon',     'Coming Soon | Share Hubs Engineering'));
router.get('/login',       page('login',           'Login | Share Hubs Engineering'));

// --- GATED ACTION PAGES (guest can view & start; submit needs auth) ---
router.get('/request-quote',  page('request-quote', 'Request a Quote | Share Hubs Engineering'));
router.get('/become-partner', page('coming_soon',   'Become a Partner | Share Hubs Engineering'));

// Genuinely private area
router.get('/profile',     protect, page('profile',     'My Profile | Share Hubs Engineering'));
router.get('/my-requests', protect, page('my-requests', 'My Requests | Share Hubs Engineering'));

// --- Gated submit endpoints (auth required to actually send) -------
router.post('/request-quote', protect, (req, res) => {
  res.json({ message: "Your quote request has been received. We'll be in touch shortly." });
});
router.post('/become-partner', protect, (req, res) => {
  res.json({ message: 'Your partnership application has been received. Our team will review it.' });
});

// --- Future feature: the store ------------------------------------
if (process.env.STORE_ENABLED === 'true') {
  router.use('/store/assets', express.static(path.join(__dirname, '..', '..', 'views', '_future_store', 'assets')));
  router.get('/store', protect, page(path.join('_future_store', 'product'), 'Store | Share Hubs Engineering'));
}

module.exports = router;
'@
$pages | Out-File -Encoding utf8 "src/routes/pages.js"

# 6. Update package.json
Write-Host "📋 Updating package.json..." -ForegroundColor Yellow
$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
if (-not $pkg.dependencies.ejs) {
    $pkg.dependencies | Add-Member -NotePropertyName "ejs" -NotePropertyValue "^3.1.10" -Force
    $pkg | ConvertTo-Json -Depth 10 | Out-File -Encoding utf8 "package.json"
    Write-Host "   Added ejs to dependencies" -ForegroundColor Green
} else {
    Write-Host "   ejs already present" -ForegroundColor Green
}

# 7. Append active-state CSS
Write-Host "🎨 Appending active-state CSS..." -ForegroundColor Yellow
$css = @"

/* ==========================================================================
   Active nav state — highlights current page in navbar
   ========================================================================== */
.nav.menu li.active a {
  color: var(--red-500);
  font-weight: 600;
  position: relative;
}
.nav.menu li.active a::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--red-500);
  border-radius: 1px;
}
.nav.menu li.active a {
  pointer-events: none;
}
"@
Add-Content -Path "public/css/design-system.css" -Value $css

# 8. Run HTML → EJS migration
Write-Host "🔄 Running HTML → EJS migration..." -ForegroundColor Yellow
node -e @"
const fs = require('fs');
const path = require('path');
const VIEWS_DIR = path.join(__dirname, 'views');
const RENAME_MAP = { 'oil&gas.html': 'oil-and-gas' };

function findNavBlock(html) {
  const startMarker = '<ul class=\"nav menu\">';
  let start = html.indexOf(startMarker);
  if (start === -1) return null;
  let idx = start + startMarker.length;
  let nest = 1;
  while (nest > 0 && idx < html.length) {
    const nextUl = html.indexOf('<ul', idx);
    const nextClose = html.indexOf('</ul>', idx);
    if (nextClose === -1) return null;
    if (nextUl !== -1 && nextUl < nextClose) {
      nest++;
      idx = nextUl + 3;
    } else {
      nest--;
      idx = nextClose + 5;
    }
  }
  return { start, end: idx };
}

function processFile(filename) {
  const oldPath = path.join(VIEWS_DIR, filename);
  if (!fs.existsSync(oldPath) || !fs.statSync(oldPath).isFile()) {
    return { status: 'skipped', old: filename, reason: 'not found' };
  }
  let html = fs.readFileSync(oldPath, 'utf-8');
  let newName = RENAME_MAP[filename]
    ? RENAME_MAP[filename] + '.ejs'
    : filename.replace(/\.html$/i, '.ejs');
  const newPath = path.join(VIEWS_DIR, newName);
  const nav = findNavBlock(html);
  if (nav) {
    const before = html.slice(0, nav.start);
    const lineStart = before.lastIndexOf('\n') + 1;
    const indent = (before.slice(lineStart).match(/^[\t ]*/) || [''])[0];
    const replacement = indent + "<%- include('partials/navbar') %>";
    html = before.slice(0, lineStart) + replacement + '\n' + html.slice(nav.end);
  }
  fs.writeFileSync(newPath, html);
  return { status: nav ? 'converted+nav' : 'converted', old: filename, new: newName, navReplaced: Boolean(nav) };
}

const files = fs.readdirSync(VIEWS_DIR).filter(f => f.endsWith('.html'));
const results = [];
for (const file of files) results.push(processFile(file));

console.log('\n=== Migration Results ===');
for (const r of results) {
  const icon = r.navReplaced ? '✅' : (r.status === 'converted' ? '⚠️' : '⏭️');
  console.log(icon + '  ' + r.old + '  →  ' + r.new + (r.navReplaced ? '  (nav replaced)' : ''));
}
console.log('\nTotal: ' + results.length + ' files processed.');
"@

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ Migration Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Test:  npm start" -ForegroundColor Cyan
Write-Host "  2. Visit: http://localhost:5000/about" -ForegroundColor Cyan
Write-Host "  3. Check: Automobile should appear in nav" -ForegroundColor Cyan
Write-Host "  4. Check: Active page should be highlighted in crimson" -ForegroundColor Cyan
Write-Host ""
Write-Host "Once verified, clean up old files:" -ForegroundColor White
Write-Host "  Remove-Item views/*.html" -ForegroundColor Yellow
Write-Host ""
