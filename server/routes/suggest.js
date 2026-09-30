const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function assertMember(groupId, userId) {
  return !!db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// POST /api/groups/:groupId/suggest
router.post('/groups/:groupId/suggest', (req, res) => {
  const groupId = Number(req.params.groupId);
  if (!assertMember(groupId, req.session.userId)) return res.status(403).json({ error: 'Không thuộc nhóm này' });

  const places = db
    .prepare(
      `SELECT * FROM (
        SELECT p.id, p.name, p.address,
          (SELECT ROUND(AVG(stars),1) FROM ratings r WHERE r.place_id = p.id) AS avg_rating
        FROM places p
        WHERE p.group_id = ?
          AND p.id NOT IN (SELECT place_id FROM blacklist WHERE user_id = ?)
      ) WHERE avg_rating > 4`
    )
    .all(groupId, req.session.userId);

  if (places.length === 0) {
    return res.json({ picks: [], note: 'Nhóm chưa có quán nào được đánh giá trên 4 sao. Ăn thêm vài lần rồi quay lại nhé!' });
  }

  const picks = shuffle(places).slice(0, Math.min(3, places.length));
  res.json({ picks });
});

module.exports = router;
