const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireUserContext } = require('../middleware/auth');
const { presentProject } = require('../lib/presenters');

router.use(requireUserContext);

router.get('/', async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'admin') {
      query = `
        SELECT p.id, p.tenant_id, p.name, p.description, p.status, p.budget, p.owner_id
        FROM projects p
        WHERE p.tenant_id = $1
        ORDER BY p.id`;
      params = [req.user.tenant_id];
    } else {
      query = `
        SELECT DISTINCT p.id, p.tenant_id, p.name, p.description, p.status, p.budget, p.owner_id
        FROM projects p
        JOIN project_members pm
          ON pm.tenant_id = p.tenant_id AND pm.project_id = p.id
        WHERE p.tenant_id = $1 AND pm.user_id = $2
        ORDER BY p.id`;
      params = [req.user.tenant_id, req.user.id];
    }

    const { rows } = await db.query(query, params);
    return res.json(rows.map((row) => presentProject(row, req.user)));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to find projects.' });
  }
});

router.get('/:id', async (req, res) => {
  const projectId = Number(req.params.id);
  if (!Number.isInteger(projectId) || projectId < 1) {
    return res.status(400).json({ error: 'Project id must be a positive integer.' });
  }

  try {
    let query;
    let params;

    if (req.user.role === 'admin') {
      query = `
        SELECT p.id, p.tenant_id, p.name, p.description, p.status, p.budget, p.owner_id
        FROM projects p
        WHERE p.tenant_id = $1 AND p.id = $2`;
      params = [req.user.tenant_id, projectId];
    } else {
      query = `
        SELECT p.id, p.tenant_id, p.name, p.description, p.status, p.budget, p.owner_id
        FROM projects p
        JOIN project_members pm
          ON pm.tenant_id = p.tenant_id AND pm.project_id = p.id
        WHERE p.tenant_id = $1 AND p.id = $2 AND pm.user_id = $3`;
      params = [req.user.tenant_id, projectId, req.user.id];
    }

    const { rows } = await db.query(query, params);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    return res.json(presentProject(rows[0], req.user));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to retrieve project info.' });
  }
});

module.exports = router;
