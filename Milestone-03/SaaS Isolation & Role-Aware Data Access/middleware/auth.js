const db = require('../db');

function parsePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Resolve the authenticated user within the requested tenant.
 *
 * The challenge uses headers as a small stand-in for a decoded session/JWT:
 * production authentication must establish these values from a trusted token,
 * never from client-controlled identity fields.
 */
async function requireUserContext(req, res, next) {
  const tenantId = parsePositiveInteger(req.get('x-tenant-id'));
  const userId = parsePositiveInteger(req.get('x-user-id'));

  if (!tenantId || !userId) {
    return res.status(400).json({
      error: 'x-tenant-id and x-user-id headers are required.'
    });
  }

  try {
    const { rows } = await db.query(
      `SELECT id, tenant_id, full_name, email, role
       FROM users
       WHERE id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: 'User is not a member of this tenant.' });
    }

    req.user = rows[0];
    return next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to establish request context.' });
  }
}

module.exports = { requireUserContext };
