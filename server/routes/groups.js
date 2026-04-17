const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

function auth() {
  return (req, res, next) => req.app.locals.authenticateJWT(req, res, next);
}
function superadmin() {
  return (req, res, next) => req.app.locals.requireSuperAdmin(req, res, next);
}
function roles(r) {
  return (req, res, next) => req.app.locals.requireRoles(r)(req, res, next);
}

// GET /api/groups — user's groups or all (admin)
router.get('/', auth(), async (req, res) => {
  try {
    const db = req.app.locals.db;
    let rows;

    if (req.user.role === 'superadmin') {
      [rows] = await db.query('SELECT * FROM `groups` ORDER BY created_at DESC');
    } else {
      [rows] = await db.query(
        `SELECT g.* FROM \`groups\` g
         INNER JOIN group_members gm ON g.id = gm.group_id
         WHERE gm.user_id = ?
         ORDER BY g.created_at DESC`,
        [req.user.id]
      );
    }

    // Enrich with member counts and last messages
    const groups = await Promise.all(rows.map(async (g) => {
      const [[{ cnt }]] = await db.query(
        'SELECT COUNT(*) AS cnt FROM group_members WHERE group_id = ?', [g.id]
      );
      const [msgs] = await db.query(
        'SELECT content, created_at FROM messages WHERE group_id = ? ORDER BY created_at DESC LIMIT 1', [g.id]
      );
      return mapGroup(g, cnt, msgs[0] || null);
    }));

    res.json(groups);
  } catch (err) {
    console.error('Fetch groups error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups — create group (superadmin or faculty)
router.post('/', auth(), roles(['superadmin', 'faculty']), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { name, description } = req.body;
    const id = uuidv4();
    const joinCode = generateJoinCode();

    await db.query(
      'INSERT INTO `groups` (id, name, description, join_code, created_by) VALUES (?, ?, ?, ?, ?)',
      [id, name, description || null, joinCode, req.user.id]
    );

    // Auto-add creator as member
    await db.query(
      'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
      [id, req.user.id]
    );

    const [rows] = await db.query('SELECT * FROM `groups` WHERE id = ?', [id]);
    res.status(201).json(mapGroup(rows[0], 1, null));
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/groups/:id (superadmin or faculty)
router.delete('/:id', auth(), roles(['superadmin', 'faculty']), async (req, res) => {
  try {
    const db = req.app.locals.db;
    await db.query('DELETE FROM `groups` WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete group error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups/join — join by code
router.post('/join', auth(), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { joinCode } = req.body;

    const [groups] = await db.query(
      'SELECT id, name FROM `groups` WHERE join_code = ?',
      [joinCode.trim().toUpperCase()]
    );
    if (groups.length === 0) {
      return res.status(404).json({ error: 'Invalid join code. Group not found.' });
    }

    const group = groups[0];

    // Check if already a member
    const [existing] = await db.query(
      'SELECT group_id FROM group_members WHERE group_id = ? AND user_id = ?',
      [group.id, req.user.id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'You are already a member of this group.' });
    }

    await db.query(
      'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
      [group.id, req.user.id]
    );

    res.json(group);
  } catch (err) {
    console.error('Join group error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/groups/:id/members — add member (admin/faculty)
router.post('/:id/members', auth(), roles(['superadmin', 'faculty']), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { userId } = req.body;
    const { id } = req.params;

    const [existing] = await db.query(
      'SELECT group_id FROM group_members WHERE group_id = ? AND user_id = ?',
      [id, userId]
    );
    if (existing.length > 0) return res.status(409).json({ error: 'Already a member' });

    await db.query(
      'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
      [id, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/groups/:id/members/:userId — remove member (admin/faculty)
router.delete('/:id/members/:userId', auth(), roles(['superadmin', 'faculty']), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { id, userId } = req.params;
    await db.query(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
      [id, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Remove member error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const prefixes = ['GRP', 'STD', 'DSC'];
  const pfx = prefixes[Math.floor(Math.random() * prefixes.length)];
  let code = '';
  for (let i = 0; i < 3; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${pfx}-2026-${code}`;
}

function mapGroup(g, memberCount, lastMsg) {
  return {
    id: g.id,
    name: g.name,
    description: g.description || '',
    joinCode: g.join_code,
    members: memberCount,
    createdBy: g.created_by,
    createdAt: g.created_at ? new Date(g.created_at).toISOString().split('T')[0] : '',
    lastMessage: lastMsg?.content || 'No messages yet',
    lastMessageAt: lastMsg?.created_at || g.created_at,
  };
}

module.exports = router;
