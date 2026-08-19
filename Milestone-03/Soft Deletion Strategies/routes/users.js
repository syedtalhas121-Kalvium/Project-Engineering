const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all active users in the system
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE deleted_at IS NULL');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database execution error' });
  }
});

// GET deleted users for audit and recovery workflows
router.get('/audit/deleted', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database audit retrieval error' });
  }
});

// GET single active user details by ID
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Database retrieval error' });
  }
});

// CREATE a new user
router.post('/', async (req, res) => {
  const { name, email } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'User creation failed' });
  }
});

// Soft-delete a user while preserving the record for audit and recovery
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'UPDATE users SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User soft-deleted from active LedgerApp records' });
  } catch (err) {
    res.status(500).json({ error: 'Delete operation failed' });
  }
});

module.exports = router;
