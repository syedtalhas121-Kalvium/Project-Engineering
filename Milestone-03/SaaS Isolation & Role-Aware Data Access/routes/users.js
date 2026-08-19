const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireUserContext } = require('../middleware/auth');
const { presentUser } = require('../lib/presenters');

router.use(requireUserContext);

// Admins see all users in their tenant. Managers see their project teams.
// Users can see only their own profile.
router.get('/', async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'admin') {
      query = `
        SELECT id, tenant_id, full_name, email, role, salary
        FROM users
        WHERE tenant_id = $1
        ORDER BY id`;
      params = [req.user.tenant_id];
    } else if (req.user.role === 'manager') {
      query = `
        SELECT DISTINCT u.id, u.tenant_id, u.full_name, u.email, u.role, u.salary
        FROM users u
        JOIN project_members pm
          ON pm.tenant_id = u.tenant_id AND pm.user_id = u.id
        JOIN project_members viewer_pm
          ON viewer_pm.tenant_id = pm.tenant_id
         AND viewer_pm.project_id = pm.project_id
         AND viewer_pm.user_id = $2
        WHERE u.tenant_id = $1
        ORDER BY u.id`;
      params = [req.user.tenant_id, req.user.id];
    } else {
      query = `
        SELECT id, tenant_id, full_name, email, role, salary
        FROM users
        WHERE tenant_id = $1 AND id = $2`;
      params = [req.user.tenant_id, req.user.id];
    }

    const { rows } = await db.query(query, params);
    return res.json(rows.map((row) => presentUser(row, req.user)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

router.get('/:id', async (req, res) => {
  const requestedId = Number(req.params.id);
  if (!Number.isInteger(requestedId) || requestedId < 1) {
    return res.status(400).json({ error: 'User id must be a positive integer.' });
  }

  try {
    let query;
    let params;

    if (req.user.role === 'admin') {
      query = `
        SELECT id, tenant_id, full_name, email, role, salary
        FROM users
        WHERE tenant_id = $1 AND id = $2`;
      params = [req.user.tenant_id, requestedId];
    } else if (req.user.role === 'manager') {
      query = `
        SELECT DISTINCT u.id, u.tenant_id, u.full_name, u.email, u.role, u.salary
        FROM users u
        JOIN project_members pm
          ON pm.tenant_id = u.tenant_id AND pm.user_id = u.id
        JOIN project_members viewer_pm
          ON viewer_pm.tenant_id = pm.tenant_id
         AND viewer_pm.project_id = pm.project_id
         AND viewer_pm.user_id = $2
        WHERE u.tenant_id = $1 AND u.id = $3`;
      params = [req.user.tenant_id, req.user.id, requestedId];
    } else {
      query = `
        SELECT id, tenant_id, full_name, email, role, salary
        FROM users
        WHERE tenant_id = $1 AND id = $2`;
      params = [req.user.tenant_id, req.user.id];
    }

    const { rows } = await db.query(query, params);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json(presentUser(rows[0], req.user));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to find user.' });
  }
});

module.exports = router;
