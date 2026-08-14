/**
 * Share Hubs Engineering — site server (EJS + shared partials)
 */
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const config = require('./config/env');

const pageRoutes = require('./routes/pages');
const communicationRoutes = require('./routes/communications');
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



// --- Routes -------------------------------------------------------
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'sharehubs-site', time: new Date().toISOString() }));

app.use('/', communicationRoutes);
app.use('/', pageRoutes);

// --- 404 ----------------------------------------------------------
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found', path: '/404' });
});

app.listen(config.port, () => {
  console.log(`🚀 Share Hubs site running on http://localhost:${config.port} [${config.env}]`);
});
