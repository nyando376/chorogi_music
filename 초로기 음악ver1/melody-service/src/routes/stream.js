// 스트리밍 라우트 (토큰 제한)
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { pool } from '../db.js';
import { authRequired } from '../middleware/auth.js';
import { signStreamToken, verifyStreamToken } from '../utils/signUrl.js';

dotenv.config();

const router = express.Router();

const { BASE_STREAM_URL = 'http://localhost:3000/api/stream/play' } = process.env;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

// POST /api/stream/request (로그인 필요)
router.post('/request', authRequired, async (req, res) => {
  try {
    const { track_id } = req.body || {};
    if (!track_id) {
      return res.status(400).json({ error: 'track_id가 필요합니다.' });
    }

    // 트랙 존재 여부 간단 확인
    const [rows] = await pool.query('SELECT id FROM tracks WHERE id = ?', [Number(track_id)]);
    if (rows.length === 0) {
      return res.status(404).json({ error: '트랙을 찾을 수 없습니다.' });
    }

    const token = signStreamToken(Number(track_id), req.user?.id || null);
    const url = `${BASE_STREAM_URL}?token=${encodeURIComponent(token)}`;
    return res.json({ url, token, expires_in: 300 });
  } catch (err) {
    return res.status(500).json({ error: '서버 오류', detail: err.message });
  }
});

// GET /api/stream/play?token=...
router.get('/play', async (req, res) => {
  try {
    const { token } = req.query || {};
    if (!token) {
      return res.status(400).json({ error: 'token이 필요합니다.' });
    }

    let payload;
    try {
      payload = verifyStreamToken(String(token));
    } catch (e) {
      return res.status(401).json({ error: '유효하지 않거나 만료된 토큰입니다.' });
    }

    const trackId = Number(payload.track_id);
    const userId = payload.user_id ? Number(payload.user_id) : null;

    const [files] = await pool.query(
      `SELECT storage_path, mime_type
       FROM track_files
       WHERE track_id = ?
       ORDER BY id ASC
       LIMIT 1`,
      [trackId]
    );
    if (files.length === 0) {
      return res.status(404).json({ error: '해당 트랙의 파일이 없습니다.' });
    }

    const { storage_path, mime_type } = files[0];
    const absPath = path.resolve(ROOT_DIR, storage_path);

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: '오디오 파일을 찾을 수 없습니다.' });
    }

    // 간단 스트리밍 (Range 미구현, MVP)
    const stat = fs.statSync(absPath);
    const fileSize = stat.size;

    res.writeHead(200, {
      'Content-Type': mime_type || 'audio/mpeg',
      'Content-Length': fileSize
    });

    const readStream = fs.createReadStream(absPath);
    readStream.pipe(res);

    // 재생 로그 (MVP: played_ms = 0)
    const client_ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().slice(0, 45);
    pool.query(
      `INSERT INTO streams (user_id, track_id, played_ms, client_ip)
       VALUES (?, ?, ?, ?)`,
      [userId || null, trackId, 0, client_ip]
    ).catch(() => { /* 로깅 실패는 무시 */ });

  } catch (err) {
    return res.status(500).json({ error: '서버 오류', detail: err.message });
  }
});

export default router;

