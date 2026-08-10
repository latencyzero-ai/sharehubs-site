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
router.get('/request-quote',        page('request-quote',        'Request a Quote | Share Hubs Engineering'));
router.get('/request-consultation', page('request-consultation', 'Request a Consultation | Share Hubs Engineering'));
router.get('/become-partner',       page('coming_soon',          'Become a Partner | Share Hubs Engineering'));

// Genuinely private area
router.get('/profile',     protect, page('profile',     'My Profile | Share Hubs Engineering'));
router.get('/my-requests', protect, page('my-requests', 'My Requests | Share Hubs Engineering'));

// --- Gated submit endpoints (auth required to actually send) -------
router.post('/request-quote', protect, (req, res) => {
  res.json({ message: "Your quote request has been received. We'll be in touch shortly." });
});
router.post('/request-consultation', protect, (req, res) => {
  res.json({ message: "Your consultation request has been received. We'll be in touch shortly." });
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