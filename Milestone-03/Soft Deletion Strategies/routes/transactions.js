const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all active transactions in the system
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM transactions WHERE deleted_at IS NULL');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database execution error' });
  }
});

// GET deleted transactions for audit and recovery workflows
router.get('/audit/deleted', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM transactions WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database audit retrieval error' });
  }
});

// GET active transactions by account_id
router.get('/account/:accountId', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM transactions WHERE account_id = $1 AND deleted_at IS NULL',
      [req.params.accountId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database retrieval error' });
  }
});

// CREATE a new transaction event
router.post('/', async (req, res) => {
  const { account_id, amount, type, description } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO transactions (account_id, amount, type, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [account_id, amount, type, description]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Transaction record creation failed' });
  }
});

// Soft-delete a transaction while preserving the financial record
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'UPDATE transactions SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL',
      [req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Transaction ID not found' });
    }

    res.json({ message: 'Transaction soft-deleted from active LedgerApp records' });
  } catch (err) {
    res.status(500).json({ error: 'Delete operation failed' });
  }
});

module.exports = router;
