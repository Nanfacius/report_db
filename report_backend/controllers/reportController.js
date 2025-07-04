const db = require('../config/db');
const path = require('path');

// 获取所有研报
const getAllReports = async (req, res) => {
  try {
    const [reports] = await db.query('SELECT id,date,institution,title,field1,field2,content_short AS content,url,created_at,updated_at FROM reports ORDER BY date DESC');
    res.json(reports);
  } catch (error) {
    console.error('获取研报错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 创建研报
const createReport = async (req, res) => {
  const { date, institution, title, field1, field2, content } = req.body;
  const file = req.file;
  
  if (!file) {
    return res.status(400).json({ message: '请上传PDF文件' });
  }
  
  const url = `/pdfs/${file.filename}`;
  
  try {
    const [result] = await db.query(
      'INSERT INTO reports (date, institution, title, field1, field2, content, url, content_short) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [date, institution, title, field1, field2, content, url, content.substring(0,1024)]
    );
    
    res.status(201).json({
      message: '研报创建成功',
      reportId: result.insertId
    });
  } catch (error) {
    console.error('创建研报错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 更新研报
const updateReport = async (req, res) => {
  const reportId = req.params.id;
  const { date, institution, title, field1, field2, content } = req.body;
  
  try {
    const [result] = await db.query(
      `UPDATE reports 
       SET date = ?, institution = ?, title = ?, field1 = ?, field2 = ?, content = ?, content_short = ?
       WHERE id = ?`,
      [date, institution, title, field1, field2, content, reportId, content.substring(0,1024)]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '研报未找到' });
    }
    
    res.json({ message: '研报更新成功' });
  } catch (error) {
    console.error('更新研报错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 删除研报
const deleteReport = async (req, res) => {
  const reportId = req.params.id;
  
  try {
    const [result] = await db.query('DELETE FROM reports WHERE id = ?', [reportId]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: '研报未找到' });
    }
    
    res.json({ message: '研报删除成功' });
  } catch (error) {
    console.error('删除研报错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 搜索研报
const searchReports = async (req, res) => {
  const { query, institution, field1, field2, startDate, endDate } = req.query;
  
  try {
    let sql = 'SELECT * FROM reports WHERE 1=1';
    const params = [];
    
    if (query) {
      sql += ' AND (title LIKE ? OR content LIKE ?)';
      params.push(`%${query}%`, `%${query}%`);
    }
    
    if (institution) {
      sql += ' AND institution = ?';
      params.push(institution);
    }
    
    if (field1) {
      sql += ' AND field1 = ?';
      params.push(field1);
    }

    if (field2) {
      sql += ' AND field2 = ?';
      params.push(field2);
    }
    
    if (startDate) {
      sql += ' AND date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      sql += ' AND date <= ?';
      params.push(endDate);
    }
    
    sql += ' ORDER BY date DESC';

    const [reports] = await db.query(sql, params);
    res.json(reports);
  } catch (error) {
    console.error('搜索研报错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

module.exports = {
  getAllReports,
  createReport,
  updateReport,
  deleteReport,
  searchReports
};