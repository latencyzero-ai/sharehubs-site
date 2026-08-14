/**
 * Share Hubs Engineering — site server
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
const adminRoutes = require('./routes/admin');
const pageRoutes = require('./routes/pages');
const { ensureAdminSchema } = require('./config/admin-schema');

const app = express();
app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: config.env === 'production', sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 },
}));

const { loginFlag } = require('./middleware/loginflag');
app.use(loginFlag);

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

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Please try again in a few minutes.' } });
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'sharehubs-site', time: new Date().toISOString() }));
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes.router);
app.use('/', pageRoutes);

app.use((req, res) => res.status(404).render('404', { title: 'Page Not Found', path: '/404' }));

(async () => {
  try {
    await ensureAdminSchema();
    app.listen(config.port, () => console.log(`🚀 Share Hubs site running on http://localhost:${config.port} [${config.env}]`));
  } catch (error) {
    console.error('Failed to initialize admin schema:', error.message);
    process.exit(1);
  }
})();
