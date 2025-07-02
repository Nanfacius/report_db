const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 管理员登录
router.post('/login', authController.login);

module.exports = router;