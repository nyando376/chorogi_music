// 아티스트 라우트
import express from 'express';
import { pool } from '../db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// POST /api/artists (관리자만)
router.post('/', authRequired, adminOnly, async (req, res) => {
  try {
    const { name, bio } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: 'name이 필요합니다.' });
    }
    const [result] = await pool.query(
      'INSERT INTO artists (name, bio) VALUES (?, ?)',
      [name, bio || null]
    );
    return res.status(201).json({ id: result.insertId, name, bio: bio || null });
  } catch (err) {
    return res.status(500).json({ error: '서버 오류', detail: err.message });
  }
});

// GET /api/artists (모두)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, bio, created_at FROM artists ORDER BY id DESC'
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: '서버 오류', detail: err.message });
  }
});

export default router;

