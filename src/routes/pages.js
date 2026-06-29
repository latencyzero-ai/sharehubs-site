/**
 * Page routes.
 *
 * PRODUCT MODEL: open shop window.
 * Every informational page is PUBLIC — browsable with no account, and
 * indexable by search engines (critical for a startup's reach). The login
 * only guards high-intent ACTIONS, not pages:
 *   - Request a quote  (primary hook — widest funnel)
 *   - Become a partner (secondary hook — narrower, higher-commitment)
 *   - The store        (future feature, behind STORE_ENABLED)
 *
 * Guests can OPEN the quote/partner forms and start filling them. The signup
 * ask comes softly at submit time ("create an account to send & track this"),
 * which converts far better than a wall at the door.
 */
const express = require('express');
const path = require('path');
const { protect, attachUser } = require('../middleware/auth');

const router = express.Router();
const VIEWS = path.join(__dirname, '..', '..', 'views');
const send = (file) => (_req, res) => res.sendFile(path.join(VIEWS, file));

router.use(attachUser);

router.get('/login', send('login.html'));

// --- PUBLIC informational pages (no login) ------------------------
const publicPages = {
  '/': 'index.html',
  '/about': 'about.html',
  '/contact': 'contact.html',
  '/agriculture': 'agriculture.html',
  '/automobile': 'automobile.html',
  '/medicine': 'medicine.html',
  '/oil-and-gas': 'oil&gas.html',
  '/home-and-office': 'home-and-office.html',
  '/portfolio': 'portfolio-details.html',
  '/coming-soon': 'coming_soon.html',
};
for (const [route, file] of Object.entries(publicPages)) {
  router.get(route, send(file));
}

// --- GATED ACTION PAGES (guest can view & start; submit needs auth) ---
router.get('/request-quote', send('request-quote.html'));
router.get('/become-partner', send('supplier.html'));

// Genuinely private area
router.get('/profile', protect, send('profile.html'));
router.get('/my-requests', protect, send('my-requests.html'));

// --- Gated submit endpoints (auth required to actually send) -------
router.post('/request-quote', protect, (req, res) => {
  res.json({ message: "Your quote request has been received. We'll be in touch shortly." });
});
router.post('/become-partner', protect, (req, res) => {
  res.json({ message: 'Your partnership application has been received. Our team will review it.' });
});

// --- Future feature: the store ------------------------------------
if (process.env.STORE_ENABLED === 'true') {
  router.use('/store/assets', express.static(path.join(VIEWS, '_future_store', 'assets')));
  router.get('/store', protect, send(path.join('_future_store', 'product.html')));
}

module.exports = router;
