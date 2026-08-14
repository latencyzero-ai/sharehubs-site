const express = require('express');
const router = express.Router();

const renderPage = (res, view, opts = {}) => {
  const defaults = {
    title: 'Share Hubs Engineering',
    description: 'Share Hubs Engineering specializes in precision manufacturing for agriculture, automotive, medical, oil & gas, and home & office industries. Based in Lagos, Nigeria.',
    keywords: 'engineering manufacturing, 3D printing Nigeria, laser cutting Lagos, CNC fabrication, precision manufacturing',
    ogImage: 'https://sharehubseng.com/img/share-hubs-engineering.png',
  };
  res.render(view, { ...defaults, ...opts });
};

router.get('/', (req, res) => renderPage(res, 'index', {
  title: 'Share Hubs Engineering — Precision Manufacturing & Engineering Solutions',
  path: '/'
}));

router.get('/about', (req, res) => renderPage(res, 'about', {
  title: 'About Us — Share Hubs Engineering',
  description: 'Learn about Share Hubs Engineering, a Lagos-based company delivering precision manufacturing and engineering solutions since 2022.',
  path: '/about'
}));

router.get('/services', (req, res) => renderPage(res, 'services', {
  title: 'Our Services — Share Hubs Engineering',
  description: 'Manufacturing, engineering consultancy, research, and training services across agriculture, automotive, medical, oil & gas, and home & office sectors.',
  path: '/services'
}));

router.get('/industries', (req, res) => renderPage(res, 'industries', {
  title: 'Industries We Serve — Share Hubs Engineering',
  description: 'Precision manufacturing solutions for agriculture, automotive, medical, oil & gas, and home & office sectors in Nigeria.',
  path: '/industries'
}));

router.get('/contact', (req, res) => renderPage(res, 'contact', {
  title: 'Contact Us — Share Hubs Engineering',
  description: 'Get in touch with Share Hubs Engineering in Lagos, Nigeria. Request a quote, discuss your project, or schedule a consultation.',
  path: '/contact',
  success: req.query.success === '1',
  reference: req.query.reference || null
}));

router.get('/agriculture', (req, res) => renderPage(res, 'agriculture', {
  title: 'Agricultural Engineering — Share Hubs Engineering',
  description: 'Custom agricultural equipment, irrigation systems, and mechanized farming tools engineered for Nigerian agriculture.',
  path: '/agriculture'
}));

router.get('/automobile', (req, res) => renderPage(res, 'automobile', {
  title: 'Automotive Engineering — Share Hubs Engineering',
  description: 'Precision automotive parts, maintenance components, and performance enhancements manufactured in Lagos, Nigeria.',
  path: '/automobile'
}));

router.get('/medicine', (req, res) => renderPage(res, 'medicine', {
  title: 'Medical Engineering Solutions — Share Hubs Engineering',
  description: 'Custom medical devices, diagnostic equipment housings, and healthcare infrastructure components.',
  path: '/medicine'
}));

router.get('/oil-and-gas', (req, res) => renderPage(res, 'oil-and-gas', {
  title: 'Oil & Gas Engineering — Share Hubs Engineering',
  description: 'Drilling components, pipeline fittings, and field equipment fabrication for the oil and gas industry.',
  path: '/oil-and-gas'
}));

router.get('/home-and-office', (req, res) => renderPage(res, 'home-and-office', {
  title: 'Home & Office Products — Share Hubs Engineering',
  description: 'Durable furniture, ergonomic appliances, and custom fixtures for home and office environments.',
  path: '/home-and-office'
}));

router.get('/request-quote', (req, res) => renderPage(res, 'request-quote', {
  title: 'Request a Quote — Share Hubs Engineering',
  description: 'Request a tailored manufacturing quote from Share Hubs Engineering. Tell us about your project and we will respond within 24 hours.',
  path: '/request-quote',
  success: req.query.success === '1',
  reference: req.query.reference || null
}));

router.get('/request-consultation', (req, res) => renderPage(res, 'request-consultation', {
  title: 'Request a Consultation — Share Hubs Engineering',
  description: 'Schedule an engineering consultation with our experts. Discuss your project feasibility, design, and manufacturing strategy.',
  path: '/request-consultation',
  success: req.query.success === '1',
  reference: req.query.reference || null
}));

router.get('/faq', (req, res) => renderPage(res, 'faq', { path: '/faq' }));
router.get('/coming-soon', (req, res) => renderPage(res, 'coming_soon', { path: '/coming-soon' }));
router.get('/404', (req, res) => renderPage(res, '404', { title: 'Page Not Found', path: '/404' }));

router.get('/portfolio-details', (req, res) => renderPage(res, 'portfolio-details', { path: '/portfolio-details' }));
router.get('/supplier', (req, res) => renderPage(res, 'supplier', { path: '/supplier' }));


module.exports = router;
