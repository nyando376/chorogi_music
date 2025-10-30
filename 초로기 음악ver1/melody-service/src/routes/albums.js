// 앨범 라우트
import express from 'express';
import { pool } from '../db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// POST /api/albums (관리자만)
router.post('/', authRequired, adminOnly, async (req, res) => {
  try {
    const { artist_id, title, cover_url, release_date } = req.body || {};
    if (!artist_id || !title) {
      return res.status(400).json({ error: 'artist_id와 title이 필요합니다.' });
    }
    const [result] = await pool.query(
      'INSERT INTO albums (artist_id, title, cover_url, release_date) VALUES (?, ?, ?, ?)',
      [Number(artist_id), title, cover_url || null, release_date || null]
    );
    return res.status(201).json({
      id: result.insertId,
      artist_id: Number(artist_id),
      title,
      cover_url: cover_url || null,
      release_date: release_date || null
    });
  } catch (err) {
    return res.status(500).json({ error: '서버 오류', detail: err.message });
  }
});

// GET /api/albums (아티스트 이름 조인)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT al.id, al.artist_id, ar.name AS artist_name, al.title, al.cover_url, al.release_date, al.created_at
       FROM albums al
       JOIN artists ar ON ar.id = al.artist_id
       ORDER BY al.id DESC`
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: '서버 오류', detail: err.message });
  }
});

export default router;

