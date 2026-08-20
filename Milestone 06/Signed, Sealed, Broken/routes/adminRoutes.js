const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const requireAdmin = authMiddleware.requireAdmin;
const { getAllUsers, deleteUser } = require('../controllers/adminController');

router.get('/admin/users', authMiddleware, requireAdmin, getAllUsers);
router.delete('/admin/users/:id', authMiddleware, requireAdmin, deleteUser);

module.exports = router;
