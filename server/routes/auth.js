const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password, display_name } = req.body || {};
  if (!username || !password || !display_name) {
    return res.status(400).json({ error: 'Thiếu tên đăng nhập, mật khẩu hoặc tên hiển thị' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });
  }
  const hash = await bcrypt.hash(password, 10);
  const info = db
    .prepare('INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)')
    .run(username, hash, display_name);
  req.session.userId = info.lastInsertRowid;
  res.json({ id: info.lastInsertRowid, username, display_name });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Thiếu tên đăng nhập hoặc mật khẩu' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
  }
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
  }
  req.session.userId = user.id;
  res.json({ id: user.id, username: user.username, display_name: user.display_name });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db
    .prepare('SELECT id, username, display_name FROM users WHERE id = ?')
    .get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  const groups = db
    .prepare(
      `SELECT g.id, g.name, g.description
       FROM groups g JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = ? ORDER BY g.created_at ASC`
    )
    .all(user.id);
  res.json({ ...user, groups });
});

module.exports = router;
