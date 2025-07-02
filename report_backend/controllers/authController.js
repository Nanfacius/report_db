const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 管理员登录
const login = async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码不能为空' });
  }

  try {
    // 实际应用中应该查询用户表
    // 这里为了简化，使用固定管理员账号
    const adminUsername = process.env.ADMIN_ACCOUNT || 'admin'; // 从环境变量获取管理员账号
    const adminPassword = process.env.ADMIN_PASSWORD || '114514'; // 实际应用中应该存储哈希值
    
    if (username !== adminUsername || password !== adminPassword) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    
    // 生成JWT
    const token = jwt.sign({ username }, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });
    
    res.json({ 
      message: '登录成功',
      token,
      user: { username }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

module.exports = { login };