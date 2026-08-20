const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
    getTasks, 
    createTask, 
    getTaskById, 
    updateTask, 
    deleteTask 
} = require('../controllers/taskController');

router.get('/tasks', authMiddleware, getTasks);
router.post('/tasks', authMiddleware, createTask);
router.put('/tasks/:id', authMiddleware, updateTask);
router.get('/tasks/:id', authMiddleware, getTaskById);
router.delete('/tasks/:id', authMiddleware, deleteTask);

module.exports = router;
