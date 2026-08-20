const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const validateUser = require('../middleware/validateUser.middleware');

router.post('/', validateUser, userController.createUser);

module.exports = router;