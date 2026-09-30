const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function assertMember(groupId, userId) {
  return !!db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
}

// POST /api/events/:id/vote  body: { stars }
router.post('/events/:id/vote', (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Không tìm thấy lời rủ' });
  if (!assertMember(event.group_id, req.session.userId)) return res.status(403).json({ error: 'Không thuộc nhóm này' });
  if (!event.place_id) return res.status(400).json({ error: 'Lời rủ này chưa gắn với quán nào' });
  const stars = Number(req.body?.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: 'Số sao phải từ 1-5' });
  }
  db.prepare(
    `INSERT INTO ratings (place_id, event_id, user_id, stars) VALUES (?, ?, ?, ?)
     ON CONFLICT(event_id, user_id) DO UPDATE SET stars = excluded.stars`
  ).run(event.place_id, event.id, req.session.userId, stars);

  const votes = db
    .prepare(
      `SELECT u.display_name, r.stars FROM ratings r JOIN users u ON u.id = r.user_id WHERE r.event_id = ?`
    )
    .all(event.id);
  const avg = db.prepare('SELECT ROUND(AVG(stars),1) as avg FROM ratings WHERE place_id = ?').get(event.place_id);
  res.json({ votes, avg_rating: avg.avg, my_stars: stars });
});

// POST /api/blacklist  body: { place_id }
router.post('/blacklist', (req, res) => {
  const placeId = Number(req.body?.place_id);
  const place = db.prepare('SELECT * FROM places WHERE id = ?').get(placeId);
  if (!place) return res.status(404).json({ error: 'Không tìm thấy quán' });
  if (!assertMember(place.group_id, req.session.userId)) return res.status(403).json({ error: 'Không thuộc nhóm này' });
  db.prepare('INSERT OR IGNORE INTO blacklist (user_id, place_id) VALUES (?, ?)').run(req.session.userId, placeId);
  res.json({ ok: true, place_id: placeId, blacklisted: true });
});

// DELETE /api/blacklist/:placeId
router.delete('/blacklist/:placeId', (req, res) => {
  db.prepare('DELETE FROM blacklist WHERE user_id = ? AND place_id = ?').run(
    req.session.userId,
    req.params.placeId
  );
  res.json({ ok: true, place_id: Number(req.params.placeId), blacklisted: false });
});

module.exports = router;
