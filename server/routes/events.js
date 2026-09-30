const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

function assertMember(groupId, userId) {
  return !!db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?').get(groupId, userId);
}

function upsertPlace(groupId, title, address, eventId) {
  const existing = db.prepare('SELECT id FROM places WHERE group_id = ? AND name = ?').get(groupId, title);
  if (existing) return existing.id;
  const info = db
    .prepare('INSERT INTO places (group_id, name, address, source_event_id) VALUES (?, ?, ?, ?)')
    .run(groupId, title, address || null, eventId);
  return info.lastInsertRowid;
}

function eventWithCounts(eventRow) {
  const participants = db
    .prepare(
      `SELECT u.id, u.username, u.display_name FROM event_participants ep
       JOIN users u ON u.id = ep.user_id WHERE ep.event_id = ?`
    )
    .all(eventRow.id);
  const creator = db.prepare('SELECT display_name FROM users WHERE id = ?').get(eventRow.created_by);
  return {
    ...eventRow,
    participants,
    participant_count: participants.length,
    creator_name: creator ? creator.display_name : '',
  };
}

// GET /api/groups/:groupId/events
router.get('/groups/:groupId/events', (req, res) => {
  const groupId = Number(req.params.groupId);
  if (!assertMember(groupId, req.session.userId)) return res.status(403).json({ error: 'Không thuộc nhóm này' });
  const rows = db
    .prepare('SELECT * FROM events WHERE group_id = ? ORDER BY created_at DESC')
    .all(groupId);
  res.json(rows.map(eventWithCounts));
});

// POST /api/groups/:groupId/events
router.post('/groups/:groupId/events', (req, res) => {
  const groupId = Number(req.params.groupId);
  if (!assertMember(groupId, req.session.userId)) return res.status(403).json({ error: 'Không thuộc nhóm này' });
  const { type, title, event_time, address, map_link, order_link, note } = req.body || {};
  if (!type || !['out', 'order'].includes(type)) return res.status(400).json({ error: 'Loại lời rủ không hợp lệ' });
  if (!title) return res.status(400).json({ error: 'Thiếu tên quán / hoạt động' });

  const info = db
    .prepare(
      `INSERT INTO events (group_id, type, title, event_time, address, map_link, order_link, note, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      groupId,
      type,
      title,
      type === 'out' ? event_time || null : null,
      type === 'out' ? address || null : null,
      type === 'out' ? map_link || null : null,
      type === 'order' ? order_link || null : null,
      note || null,
      req.session.userId
    );
  const eventId = info.lastInsertRowid;

  const placeId = upsertPlace(groupId, title, type === 'out' ? address : null, eventId);
  db.prepare('UPDATE events SET place_id = ? WHERE id = ?').run(placeId, eventId);

  // Người tạo tự động tham gia lời rủ của chính mình
  db.prepare('INSERT INTO event_participants (event_id, user_id) VALUES (?, ?)').run(eventId, req.session.userId);

  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  res.json(eventWithCounts(row));
});

// GET /api/events/:id
router.get('/events/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Không tìm thấy lời rủ' });
  if (!assertMember(row.group_id, req.session.userId)) return res.status(403).json({ error: 'Không thuộc nhóm này' });
  const bill = db.prepare('SELECT * FROM bill_items WHERE event_id = ?').all(row.id);
  res.json({ ...eventWithCounts(row), bill });
});

// POST /api/events/:id/join
router.post('/events/:id/join', (req, res) => {
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Không tìm thấy lời rủ' });
  if (!assertMember(row.group_id, req.session.userId)) return res.status(403).json({ error: 'Không thuộc nhóm này' });
  const already = db
    .prepare('SELECT 1 FROM event_participants WHERE event_id = ? AND user_id = ?')
    .get(row.id, req.session.userId);
  if (!already) {
    db.prepare('INSERT INTO event_participants (event_id, user_id) VALUES (?, ?)').run(row.id, req.session.userId);
  }
  res.json(eventWithCounts(db.prepare('SELECT * FROM events WHERE id = ?').get(row.id)));
});

// PUT /api/events/:id/bill  body: { items: [{person_name, item_name, price}] }
router.put('/events/:id/bill', (req, res) => {
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Không tìm thấy lời rủ' });
  if (!assertMember(row.group_id, req.session.userId)) return res.status(403).json({ error: 'Không thuộc nhóm này' });
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const del = db.prepare('DELETE FROM bill_items WHERE event_id = ?');
  const ins = db.prepare('INSERT INTO bill_items (event_id, person_name, item_name, price) VALUES (?, ?, ?, ?)');
  const tx = db.transaction((rows) => {
    del.run(row.id);
    for (const it of rows) {
      ins.run(row.id, it.person_name || '', it.item_name || '', Number(it.price) || 0);
    }
  });
  tx(items);
  const bill = db.prepare('SELECT * FROM bill_items WHERE event_id = ?').all(row.id);
  const total = bill.reduce((s, i) => s + i.price, 0);
  res.json({ bill, total });
});

// PUT /api/events/:id/status  body: { status: 'done' }
router.put('/events/:id/status', (req, res) => {
  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Không tìm thấy lời rủ' });
  if (!assertMember(row.group_id, req.session.userId)) return res.status(403).json({ error: 'Không thuộc nhóm này' });
  const status = req.body?.status === 'done' ? 'done' : 'open';
  db.prepare('UPDATE events SET status = ? WHERE id = ?').run(status, row.id);
  res.json({ id: row.id, status });
});

module.exports = router;
