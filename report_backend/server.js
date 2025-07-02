require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 提供PDF文件访问
app.use('/pdfs', express.static(path.join(__dirname, 'uploads')));
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));  // 你的HTML文件
});

// 路由
const authRoutes = require('./routes/authRoutes');
const reportRoutes = require('./routes/reportRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: '文件上传错误: ' + err.message });
  } else if (err) {
    return res.status(500).json({ message: '服务器错误' });
  }
  
  next();
});

// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  
  // 测试数据库连接
  const db = require('./config/db');
  db.query('SELECT 1')
    .then(() => console.log('数据库连接成功'))
    .catch(err => console.error('数据库连接失败:', err));
});