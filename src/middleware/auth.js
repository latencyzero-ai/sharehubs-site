/** Auth middleware. */

// Hard gate — for genuinely private pages/actions.
function protect(req, res, next) {
  if (!req.session.userId) {
    // For API/POST, return 401 so the frontend can show a soft prompt.
    if (req.method === 'POST' || req.xhr || (req.headers.accept || '').includes('application/json')) {
      return res.status(401).json({ error: 'signup_required', redirect: '/login' });
    }
    // For page GETs, send them to login with a return path.
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  next();
}

// Soft — attaches login state to res.locals so pages/headers can adapt.
// Never blocks.
function attachUser(req, res, next) {
  res.locals.isLoggedIn = Boolean(req.session.userId);
  res.locals.username = req.session.username || null;
  next();
}

module.exports = { protect, attachUser };
