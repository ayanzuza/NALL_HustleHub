/**
 * Role-based access control. Must run AFTER authenticate (needs req.user).
 * Usage: router.post('/', authenticate, authorize('freelancer'), handler)
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action',
      });
    }
    return next();
  };
}

module.exports = authorize;
