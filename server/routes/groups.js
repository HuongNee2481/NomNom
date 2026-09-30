const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function genInviteCode() {
  return crypto.randomBytes(4).toString('hex');
}

function assertMember(groupId, userId) {
  const m = db
    .prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?')
    .get(groupId, userId);
  return !!m;
}

router.post('/', (req, res) => {
  const { name, description } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Thiếu tên nhóm' });
  const code = genInviteCode();
  const info = db
    .prepare('INSERT INTO groups (name, description, invite_code, created_by) VALUES (?, ?, ?, ?)')
    .run(name, description || null, code, req.session.userId);
  db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(
    info.lastInsertRowid,
    req.session.userId,
    'admin'
  );
  res.json({ id: info.lastInsertRowid, name, description, invite_code: code });
});

router.post('/join/:code', (req, res) => {
  const group = db.prepare('SELECT * FROM groups WHERE invite_code = ?').get(req.params.code);
  if (!group) return res.status(404).json({ error: 'Link mời không hợp lệ' });
  const already = assertMember(group.id, req.session.userId);
  if (!already) {
    db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').run(
      group.id,
      req.session.userId,
      'member'
    );
  }
  res.json({ id: group.id, name: group.name, description: group.description });
});

router.get('/:id/invite', (req, res) => {
  const groupId = Number(req.params.id);
  if (!assertMember(groupId, req.session.userId)) return res.status(403).json({ error: 'Không thuộc nhóm này' });
  const group = db.prepare('SELECT invite_code FROM groups WHERE id = ?').get(groupId);
  if (!group) return res.status(404).json({ error: 'Không tìm thấy nhóm' });
  res.json({ invite_code: group.invite_code });
});

router.get('/:id/members', (req, res) => {
  const groupId = Number(req.params.id);
  if (!assertMember(groupId, req.session.userId)) return res.status(403).json({ error: 'Không thuộc nhóm này' });
  const members = db
    .prepare(
      `SELECT u.id, u.username, u.display_name, gm.role
       FROM group_members gm JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = ? ORDER BY gm.joined_at ASC`
    )
    .all(groupId);
  res.json(members);
});

module.exports = router;
