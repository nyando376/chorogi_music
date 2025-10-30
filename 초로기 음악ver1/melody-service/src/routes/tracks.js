// 트랙 라우트 (파일 업로드 포함)
import express from 'express';
import fileUpload from 'express-fileupload';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { pool } from '../db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// 이 라우터에서만 파일업로드 사용
router.use(fileUpload());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const UPLOAD_DIR = path.resolve(ROOT_DIR, 'uploads');

// 업로드 디렉터리 보장
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// POST /api/tracks (관리자만)
// form-data: audio(file), album_id(optional), artist_id, title, duration_sec(optional), mime_type(optional), bitrate_kbps(optional), isrc(optional)
router.post('/', authRequired, adminOnly, async (req, res) => {
  try {
    const audio = req.files?.audio;
    if (!audio) {
      return res.status(400).json({ error: 'audio 파일이 필요합니다. (form-data: audio)' });
    }

    const {
      album_id,
      artist_id,
      title,
      duration_sec,
      bitrate_kbps,
      isrc
    } = req.body || {};

    if (!artist_id || !title) {
      return res.status(400).json({ error: 'artist_id와 title이 필요합니다.' });
    }

    const timestamp = Date.now();
    const safeOriginal = String(audio.name || 'audio').replace(/\s+/g, '_');
    const filename = `${timestamp}_${safeOriginal}`;
    const relStoragePath = path.posix.join('uploads', filename); // DB에는 상대 경로로 저장
    const absStoragePath = path.resolve(UPLOAD_DIR, filename);

    // 파일 저장
    await audio.mv(absStoragePath);

    // tracks INSERT
    const [trackResult] = await pool.query(
      `INSERT INTO tracks (artist_id, album_id, title, duration_sec, isrc)
       VALUES (?, ?, ?, ?, ?)`,
      [
        Number(artist_id),
        album_id ? Number(album_id) : null,
        title,
        duration_sec ? Number(duration_sec) : null,
        isrc || null
      ]
    );
    const trackId = trackResult.insertId;

    // track_files INSERT
    const mimeType = audio.mimetype || req.body?.mime_type || null;
    const bitrate = bitrate_kbps ? Number(bitrate_kbps) : null;

    await pool.query(
      `INSERT INTO track_files (track_id, storage_path, mime_type, bitrate_kbps)
       VALUES (?, ?, ?, ?)`,
      [trackId, relStoragePath, mimeType, bitrate]
    );

    return res.status(201).json({
      id: trackId,
      artist_id: Number(artist_id),
      album_id: album_id ? Number(album_id) : null,
      title,
      duration_sec: duration_sec ? Number(duration_sec) : null,
      isrc: isrc || null,
      file: {
        storage_path: relStoragePath,
        mime_type: mimeType,
        bitrate_kbps: bitrate
      }
    });
  } catch (err) {
    return res.status(500).json({ error: '서버 오류', detail: err.message });
  }
});

// GET /api/tracks (아티스트/앨범 조인)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         t.id, t.title, t.duration_sec, t.isrc, t.artist_id, t.album_id, t.created_at,
         a.name AS artist_name,
         al.title AS album_title
       FROM tracks t
       JOIN artists a ON a.id = t.artist_id
       LEFT JOIN albums al ON al.id = t.album_id
       ORDER BY t.id DESC`
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: '서버 오류', detail: err.message });
  }
});

export default router;

