// 플레이리스트 라우트
import express from 'express';
import { pool } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

// POST /api/playlists (로그인 필요)
router.post('/', authRequired, async (req, res) => {
  try {
    const { name, is_public } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: 'name이 필요합니다.' });
    }
    const isPublic = ['1', 'true', 'on', true, 1].includes(is_public) ? 1 : 0;
    const [result] = await pool.query(
      'INSERT INTO playlists (user_id, name, is_public) VALUES (?, ?, ?)',
      [req.user.id, name, isPublic]
    );
    return res.status(201).json({
      id: result.insertId,
      user_id: req.user.id,
      name,
      is_public: !!isPublic
    });
  } catch (err) {
    return res.status(500).json({ error: '서버 오류', detail: err.message });
  }
});

// POST /api/playlists/:playlistId/tracks (로그인 필요, 본인 소유 검사)
router.post('/:playlistId/tracks', authRequired, async (req, res) => {
  try {
    const playlistId = Number(req.params.playlistId);
    const { track_id } = req.body || {};
    if (!track_id) {
      return res.status(400).json({ error: 'track_id가 필요합니다.' });
    }

    const [owners] = await pool.query('SELECT user_id FROM playlists WHERE id = ?', [playlistId]);
    if (owners.length === 0) {
      return res.status(404).json({ error: '플레이리스트를 찾을 수 없습니다.' });
    }
    if (owners[0].user_id !== req.user.id) {
      return res.status(403).json({ error: '본인 플레이리스트가 아닙니다.' });
    }

    await pool.query(
      'INSERT IGNORE INTO playlist_tracks (playlist_id, track_id) VALUES (?, ?)',
      [playlistId, Number(track_id)]
    );

    return res.status(201).json({ playlist_id: playlistId, track_id: Number(track_id) });
  } catch (err) {
    return res.status(500).json({ error: '서버 오류', detail: err.message });
  }
});

// GET /api/playlists/me (로그인 필요)
router.get('/me', authRequired, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, user_id, name, is_public, created_at
       FROM playlists
       WHERE user_id = ?
       ORDER BY id DESC`,
      [req.user.id]
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: '서버 오류', detail: err.message });
  }
});

// GET /api/playlists/:playlistId (공개/비공개 무관, 상세 + 트랙 목록)
router.get('/:playlistId', async (req, res) => {
  try {
    const playlistId = Number(req.params.playlistId);

    const [[playlist]] = await pool.query(
      `SELECT id, user_id, name, is_public, created_at
       FROM playlists WHERE id = ?`,
      [playlistId]
    );

    if (!playlist) {
      return res.status(404).json({ error: '플레이리스트를 찾을 수 없습니다.' });
    }

    const [tracks] = await pool.query(
      `SELECT
         t.id, t.title, t.duration_sec, t.artist_id, t.album_id,
         a.name AS artist_name,
         al.title AS album_title
       FROM playlist_tracks pt
       JOIN tracks t ON t.id = pt.track_id
       JOIN artists a ON a.id = t.artist_id
       LEFT JOIN albums al ON al.id = t.album_id
       WHERE pt.playlist_id = ?
       ORDER BY t.id ASC`,
      [playlistId]
    );

    return res.json({ playlist, tracks });
  } catch (err) {
    return res.status(500).json({ error: '서버 오류', detail: err.message });
  }
});

export default router;

