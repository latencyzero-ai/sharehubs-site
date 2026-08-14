const express = require('express');
const router = express.Router();

const renderPage = (res, view, opts = {}) => {
  const defaults = {
    title: 'Share Hubs Engineering',
    description: 'Share Hubs Engineering specializes in precision manufacturing for agriculture, automotive, medical, oil & gas, and home & office industries. Based in Lagos, Nigeria.',
    keywords: 'engineering manufacturing, 3D printing Nigeria, laser cutting Lagos, CNC fabrication, precision manufacturing',
    ogImage: 'https://sharehubseng.com/img/share-hubs-engineering.png',
    path: res.req.path,
  };
  res.render(view, { ...defaults, ...opts });
};

router.get('/', (req, res) => renderPage(res, 'index', { title: 'Share Hubs Engineering — Precision Manufacturing & Engineering Solutions', path: '/' }));
router.get('/about', (req, res) => renderPage(res, 'about', { title: 'About Us — Share Hubs Engineering', path: '/about' }));
router.get('/services', (req, res) => renderPage(res, 'services', { title: 'Our Services — Share Hubs Engineering', path: '/services' }));
router.get('/industries', (req, res) => renderPage(res, 'industries', { title: 'Industries We Serve — Share Hubs Engineering', path: '/industries' }));
router.get('/contact', (req, res) => renderPage(res, 'contact', { title: 'Contact Us — Share Hubs Engineering', path: '/contact' }));
router.get('/agriculture', (req, res) => renderPage(res, 'agriculture', { title: 'Agricultural Engineering — Share Hubs Engineering', path: '/agriculture' }));
router.get('/automobile', (req, res) => renderPage(res, 'automobile', { title: 'Automotive Engineering — Share Hubs Engineering', path: '/automobile' }));
router.get('/medicine', (req, res) => renderPage(res, 'medicine', { title: 'Medical Engineering Solutions — Share Hubs Engineering', path: '/medicine' }));
router.get('/oil-and-gas', (req, res) => renderPage(res, 'oil-and-gas', { title: 'Oil & Gas Engineering — Share Hubs Engineering', path: '/oil-and-gas' }));
router.get('/home-and-office', (req, res) => renderPage(res, 'home-and-office', { title: 'Home & Office Products — Share Hubs Engineering', path: '/home-and-office' }));
router.get('/request-quote', (req, res) => renderPage(res, 'request-quote', { title: 'Request a Quote — Share Hubs Engineering', path: '/request-quote' }));
router.get('/request-consultation', (req, res) => renderPage(res, 'request-consultation', { title: 'Request a Consultation — Share Hubs Engineering', path: '/request-consultation' }));
router.get('/submission-success', (req, res) => renderPage(res, 'submission-success', { title: 'Submission Received — Share Hubs Engineering', path: '/submission-success' }));
router.get('/faq', (req, res) => renderPage(res, 'faq', { path: '/faq' }));
router.get('/coming-soon', (req, res) => renderPage(res, 'coming_soon', { path: '/coming-soon' }));
router.get('/404', (req, res) => renderPage(res, '404', { title: 'Page Not Found', path: '/404' }));
router.get('/login', (req, res) => renderPage(res, 'login', { path: '/login' }));
router.get('/profile', (req, res) => renderPage(res, 'profile', { path: '/profile' }));
router.get('/portfolio-details', (req, res) => renderPage(res, 'portfolio-details', { path: '/portfolio-details' }));
router.get('/supplier', (req, res) => renderPage(res, 'supplier', { path: '/supplier' }));

module.exports = router;
