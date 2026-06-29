/**
 * Share Hubs Engineering — site server (optimised build v2)
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

// --- Core middleware ----------------------------------------------
app.use(helmet({ contentSecurityPolicy: false })); // CSP off: site uses CDN assets
app.use(compression());                            // gzip every response
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
app.use('/js', express.static(path.join(PUB, 'js'), staticOpts));            // vendor + our scripts
app.use('/img', express.static(path.join(PUB, 'img'), staticOpts));
app.use('/fonts', express.static(path.join(PUB, 'fonts'), staticOpts));
// Pages reference these legacy paths — map them to the real folders:
app.use('/assets/css', express.static(path.join(PUB, 'css-vendor'), staticOpts));
app.use('/assets/img', express.static(path.join(PUB, 'img'), staticOpts));
app.use('/assets/fonts', express.static(path.join(PUB, 'fonts'), staticOpts));
app.use('/assets', express.static(path.join(PUB, 'assets'), staticOpts));    // /assets/style.css

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
app.use((_req, res) => res.status(404).sendFile(path.join(__dirname, '..', 'views', '404.html')));

app.listen(config.port, () => {
  console.log(`\u{1F680} Share Hubs site running on http://localhost:${config.port} [${config.env}]`);
});
