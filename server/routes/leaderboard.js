const express = require('express');
const router = express.Router();

function auth() {
  return (req, res, next) => req.app.locals.authenticateJWT(req, res, next);
}
function roles(r) {
  return (req, res, next) => req.app.locals.requireRoles(r)(req, res, next);
}

// GET /api/leaderboard
router.get('/', auth(), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const limit = parseInt(req.query.limit) || 50;

    const [rows] = await db.query(
      `SELECT p.id, p.full_name, p.avatar_url, p.role, p.about, p.created_at,
              (
                (SELECT COUNT(*) FROM notes n WHERE n.uploader_id = p.id) * 10
                +
                (SELECT COALESCE(SUM(downloads), 0) FROM notes n WHERE n.uploader_id = p.id) * 2
                +
                (SELECT COUNT(*) FROM note_ratings nr JOIN notes n ON nr.note_id = n.id WHERE n.uploader_id = p.id AND nr.rating >= 4 AND nr.user_id != p.id) * 5
                +
                (SELECT COALESCE(SUM(points), 0) FROM leaderboard_points lp WHERE lp.user_id = p.id AND lp.reason = 'admin_bonus')
                -
                (SELECT COALESCE(SUM(ABS(points)), 0) FROM leaderboard_points lp WHERE lp.user_id = p.id AND lp.reason = 'penalty')
              ) AS dynamic_points
       FROM profiles p
       WHERE p.role = 'student' AND p.is_banned = 0
       ORDER BY dynamic_points DESC
       LIMIT ?`,
      [limit]
    );

    const getTier = (points) => {
      if (points >= 3000) return 'Elite';
      if (points >= 2000) return 'Gold';
      if (points >= 1000) return 'Silver';
      return 'Bronze';
    };

    const leaderboard = rows.map((row, i) => ({
      id: row.id,
      name: row.full_name || 'Unknown',
      avatar: row.avatar_url,
      score: row.dynamic_points || 0,
      points: row.dynamic_points || 0,
      role: row.role,
      about: row.about || '',
      tier: getTier(row.dynamic_points || 0),
      rank: i + 1,
      uploads: 0,
      downloads: 0,
      joinedAt: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '',
    }));

    res.json(leaderboard);
  } catch (err) {
    console.error('Fetch leaderboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/leaderboard/:userId/history
router.get('/:userId/history', auth(), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [rows] = await db.query(
      'SELECT * FROM leaderboard_points WHERE user_id = ? ORDER BY created_at DESC',
      [req.params.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Fetch point history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/leaderboard/points — award/deduct points (faculty, superadmin)
router.post('/points', auth(), roles(['superadmin', 'faculty']), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { studentId, points, reason } = req.body;
    
    if (!studentId || !points || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { v4: uuidv4 } = require('uuid');
    const id = uuidv4();

    // The ENUM for reason in DB only supports: 'note_upload','note_download','login_streak','admin_bonus','penalty'
    // Map reason text to closest valid ENUM, or just use admin_bonus/penalty
    const dbReason = points > 0 ? 'admin_bonus' : 'penalty';

    await db.query(
      'INSERT INTO leaderboard_points (id, user_id, points, reason, reference_id) VALUES (?, ?, ?, ?, ?)',
      [id, studentId, points, dbReason, req.user.id]
    );

    await db.query('UPDATE profiles SET points = points + ? WHERE id = ?', [points, studentId]);
    
    res.json({ success: true, id, points });
  } catch (err) {
    console.error('Update points error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
