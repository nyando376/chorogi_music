// 회원가입/로그인 라우트
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { pool } from '../db.js';

dotenv.config();

const router = express.Router();
const { JWT_SECRET } = process.env;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, display_name } = req.body || {};
    if (!email || !password || !display_name) {
      return res.status(400).json({ error: 'email, password, display_name가 필요합니다.' });
    }

    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length > 0) {
      return res.status(400).json({ error: '이미 등록된 이메일입니다.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)',
      [email, password_hash, display_name, 'user']
    );

    return res.status(201).json({
      id: result.insertId,
      email,
      display_name,
      role: 'user'
    });
  } catch (err) {
    return res.status(500).json({ error: '서버 오류', detail: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email, password가 필요합니다.' });
    }

    const [rows] = await pool.query('SELECT id, email, password_hash, display_name, role FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const payload = { id: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ error: '서버 오류', detail: err.message });
  }
});

export default router;

