const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function assertMember(groupId, userId) {
  return !!db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
}

// GET /api/groups/:groupId/places?excludeBlacklist=1
router.get('/groups/:groupId/places', (req, res) => {
  const groupId = Number(req.params.groupId);
  if (!assertMember(groupId, req.session.userId)) return res.status(403).json({ error: 'Không thuộc nhóm này' });

  const rows = db
    .prepare(
      `SELECT p.*,
        (SELECT ROUND(AVG(stars), 1) FROM ratings r WHERE r.place_id = p.id) AS avg_rating,
        (SELECT COUNT(*) FROM ratings r WHERE r.place_id = p.id) AS rating_count,
        EXISTS(SELECT 1 FROM blacklist b WHERE b.place_id = p.id AND b.user_id = ?) AS is_blacklisted
       FROM places p WHERE p.group_id = ? ORDER BY p.created_at DESC`
    )
    .all(req.session.userId, groupId);

  if (req.query.excludeBlacklist) {
    return res.json(rows.filter((r) => !r.is_blacklisted));
  }
  res.json(rows);
});

module.exports = router;
