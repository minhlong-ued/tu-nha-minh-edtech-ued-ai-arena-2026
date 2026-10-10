import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API: Upload asset to shared project storage (/public and /dist)
  app.post('/api/upload-shared', (req, res) => {
    try {
      const { filename, base64Data } = req.body;
      if (!filename || !base64Data) {
        return res.status(400).json({ error: 'Thiếu tên tệp hoặc dữ liệu base64' });
      }

      const safeFilename = path.basename(filename);
      const data = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(data, 'base64');

      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      const publicFilePath = path.join(publicDir, safeFilename);
      fs.writeFileSync(publicFilePath, buffer);

      const distDir = path.resolve(__dirname, 'dist');
      if (fs.existsSync(distDir)) {
        const distFilePath = path.join(distDir, safeFilename);
        fs.writeFileSync(distFilePath, buffer);
      }

      console.log(`[SHARED ASSET] Saved shared asset: ${safeFilename} (${buffer.length} bytes)`);
      return res.json({
        success: true,
        filename: safeFilename,
        url: `/${encodeURI(safeFilename)}`,
        bytes: buffer.length,
      });
    } catch (err: any) {
      console.error('[SHARED ASSET ERROR]', err);
      return res.status(500).json({ error: err.message || 'Lỗi lưu tệp trên máy chủ' });
    }
  });

  // API: Get status of shared demo assets
  app.get('/api/shared-assets-status', (_req, res) => {
    try {
      const publicDir = path.resolve(__dirname, 'public');
      const files: Record<string, { size: number; exists: boolean }> = {};
      const expected = [
        'bg_room_original.png',
        'Gemini_Generated_Image_4q18ep4q18ep4q18.png',
        'Nhân vật pixel chính diện toàn thân.png',
        'Nhân vật pixel áo dài xanh ngọc-3.png',
        'aodai_look2.png',
        'Nhân vật pixel áo tứ thân chính diện-1.png',
        'tuthan_look2.png',
        'Nhân vật pixel áo ngũ thân-2.png',
        'nguthan_look2.png',
        'bg_ngayhoitruong.png',
        'npc_truyenthong.png',
        'npc_thoanh.png',
        'mg1_sketch.png',
        'mg1_line.png',
        'mg2_mannequins.png',
      ];

      for (const f of expected) {
        const p = path.join(publicDir, f);
        if (fs.existsSync(p)) {
          files[f] = { size: fs.statSync(p).size, exists: true };
        } else {
          files[f] = { size: 0, exists: false };
        }
      }

      return res.json({
        success: true,
        totalConfigured: expected.length,
        readyCount: Object.values(files).filter((x) => x.exists).length,
        assets: files,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer();
