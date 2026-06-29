/**
 * Exposes login state to the static pages via a readable (non-httpOnly)
 * cookie that header-auth.js reads. The SESSION cookie stays httpOnly and
 * secure; this is only a UI hint, never used for authorization.
 */
function loginFlag(req, res, next) {
  const flag = req.session && req.session.userId ? '1' : '0';
  res.cookie('sh_ui_logged_in', flag, { httpOnly: false, sameSite: 'lax' });
  next();
}
module.exports = { loginFlag };
