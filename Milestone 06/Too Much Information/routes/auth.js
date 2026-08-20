import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pg from 'pg';
import authenticate from '../middleware/authenticate.js';
import { toAuthUser, toProfileUser } from '../response-mappers.js';

const router = express.Router();
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

// SIGNUP ROUTE
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, verification_token)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, hash, verificationToken]
    );

    res.status(201).json({ user: toAuthUser(result.rows[0]) });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// LOGIN ROUTE
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    // The password hash is selected only because credential verification needs it.
    // It is never passed to a response mapper or returned to the client.
    const result = await pool.query(
      `SELECT id, name, email, password_hash, role, created_at
       FROM users
       WHERE email = $1`,
      [email]
    );
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: toAuthUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET ME ROUTE
router.get('/me', authenticate, async (req, res) => {
  try {
    // Only non-sensitive profile context is selected for the response.
    const result = await pool.query(
      `SELECT id, name, email, role, subscription_plan, created_at
       FROM users
       WHERE id = $1`,
      [req.user.userId]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: toProfileUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
