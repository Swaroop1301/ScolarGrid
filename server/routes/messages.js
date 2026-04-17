const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

function auth() {
  return (req, res, next) => req.app.locals.authenticateJWT(req, res, next);
}

// GET /api/messages/:groupId
router.get('/:groupId', auth(), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { groupId } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    const [rows] = await db.query(
      `SELECT m.*, p.full_name AS sender_name, p.avatar_url AS sender_avatar
       FROM messages m
       LEFT JOIN profiles p ON m.sender_id = p.id
       WHERE m.group_id = ?
       ORDER BY m.created_at ASC
       LIMIT ?`,
      [groupId, limit]
    );

    res.json(rows.map(mapMessage));
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/:groupId — send text message
router.post('/:groupId', auth(), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { groupId } = req.params;
    const { content } = req.body;
    const id = uuidv4();

    await db.query(
      'INSERT INTO messages (id, group_id, sender_id, content) VALUES (?, ?, ?, ?)',
      [id, groupId, req.user.id, content]
    );

    const [rows] = await db.query(
      `SELECT m.*, p.full_name AS sender_name, p.avatar_url AS sender_avatar
       FROM messages m LEFT JOIN profiles p ON m.sender_id = p.id
       WHERE m.id = ?`,
      [id]
    );

    const msg = mapMessage(rows[0]);

    // Broadcast to WebSocket room
    req.app.locals.broadcastToRoom(groupId, msg);

    res.status(201).json(msg);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/:groupId/file — send file message
router.post('/:groupId/file', auth(), (req, res, next) => {
  req.app.locals.upload.single('chatFile')(req, res, next);
}, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { groupId } = req.params;
    const id = uuidv4();

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const fileUrl = `/uploads/chat/${req.file.filename}`;

    await db.query(
      `INSERT INTO messages (id, group_id, sender_id, content, file_url, file_name, file_type)
       VALUES (?, ?, ?, NULL, ?, ?, ?)`,
      [id, groupId, req.user.id, fileUrl, req.file.originalname, req.file.mimetype]
    );

    const [rows] = await db.query(
      `SELECT m.*, p.full_name AS sender_name, p.avatar_url AS sender_avatar
       FROM messages m LEFT JOIN profiles p ON m.sender_id = p.id
       WHERE m.id = ?`,
      [id]
    );

    const msg = mapMessage(rows[0]);
    req.app.locals.broadcastToRoom(groupId, msg);

    res.status(201).json(msg);
  } catch (err) {
    console.error('Send file message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/messages/delete/:id — moderate message (admin/faculty)
router.delete('/delete/:id', auth(), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id } = req.params;

    // Only faculty and superadmin can delete any message
    if (!['superadmin', 'faculty'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only faculty/admin can delete messages' });
    }

    const [rows] = await db.query('SELECT group_id FROM messages WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Message not found' });
    
    const groupId = rows[0].group_id;

    await db.query('DELETE FROM messages WHERE id = ?', [id]);

    // Broadcast deletion
    req.app.locals.broadcastToRoom(groupId, { type: 'message_deleted', payload: { messageId: id } });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function mapMessage(row) {
  return {
    id: row.id,
    groupId: row.group_id,
    senderId: row.sender_id,
    senderName: row.sender_name || 'Unknown',
    content: row.file_name || row.content || '',
    timestamp: row.created_at,
    type: row.file_url ? 'file' : 'text',
    fileUrl: row.file_url || null,
    fileName: row.file_name || null,
    fileType: row.file_type || null,
    fileSize: '',
  };
}

module.exports = router;
