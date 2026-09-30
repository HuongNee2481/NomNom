const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/users/me/history
router.get('/me/history', (req, res) => {
  const userId = req.session.userId;
  const rows = db
    .prepare(
      `SELECT e.id, e.title, e.type, e.event_time, e.status, e.created_at,
        (SELECT SUM(price) FROM bill_items bi WHERE bi.event_id = e.id AND bi.person_name = u.display_name) AS paid
       FROM event_participants ep
       JOIN events e ON e.id = ep.event_id
       JOIN users u ON u.id = ep.user_id AND u.id = ?
       WHERE ep.user_id = ?
       ORDER BY e.created_at DESC`
    )
    .all(userId, userId);
  res.json(rows);
});

// GET /api/users/me/stats
router.get('/me/stats', (req, res) => {
  const userId = req.session.userId;
  const eatCount = db
    .prepare('SELECT COUNT(*) as c FROM event_participants WHERE user_id = ?')
    .get(userId).c;
  const favCount = db
    .prepare(
      `SELECT COUNT(DISTINCT p.id) as c
       FROM ratings r JOIN places p ON p.id = r.place_id
       WHERE r.user_id = ? AND r.stars >= 4`
    )
    .get(userId).c;
  res.json({ eat_count: eatCount, favorite_count: favCount });
});

module.exports = router;
