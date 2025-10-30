// 스트리밍 토큰 서명/검증 유틸
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const { STREAM_SECRET } = process.env;

// 5분짜리 스트리밍 토큰 생성
export function signStreamToken(trackId, userId) {
  const payload = { track_id: Number(trackId), user_id: userId ? Number(userId) : null };
  return jwt.sign(payload, STREAM_SECRET, { expiresIn: '5m' });
}

// 토큰 검증
export function verifyStreamToken(token) {
  return jwt.verify(token, STREAM_SECRET);
}

