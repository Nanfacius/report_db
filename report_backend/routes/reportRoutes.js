const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/auth');
const reportController = require('../controllers/reportController');
const upload = require('../utils/upload');

// 获取所有研报 (需要认证)
router.get('/', authenticate, reportController.getAllReports);

// 创建研报 (需要认证 + 文件上传)
router.post('/', authenticate, upload.single('pdf'), reportController.createReport);

// 更新研报 (需要认证)
router.put('/:id', authenticate, reportController.updateReport);

// 删除研报 (需要认证)
router.delete('/:id', authenticate, reportController.deleteReport);

// 搜索研报 (公开接口)
router.get('/search', reportController.searchReports);

module.exports = router;