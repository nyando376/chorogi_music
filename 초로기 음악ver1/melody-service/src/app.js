// 앱 초기화 및 라우터 연결
import express from 'express';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// 라우터
import authRouter from './routes/auth.js';
import artistsRouter from './routes/artists.js';
import albumsRouter from './routes/albums.js';
import tracksRouter from './routes/tracks.js';
import playlistsRouter from './routes/playlists.js';
import streamRouter from './routes/stream.js';

dotenv.config();

const app = express();
const { PORT = 3000 } = process.env;

// 경로 계산
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const UPLOAD_DIR = path.resolve(ROOT_DIR, 'uploads');
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'public');

// uploads 폴더 자동 생성
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 미들웨어
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 제공 (테스트용)
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(PUBLIC_DIR));

// 라우터 등록
app.use('/api/auth', authRouter);
app.use('/api/artists', artistsRouter);
app.use('/api/albums', albumsRouter);
app.use('/api/tracks', tracksRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/stream', streamRouter);

// 헬스체크 API
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'melody-service' });
});

// 서버 시작
app.listen(Number(PORT), () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${PORT}`);
});
