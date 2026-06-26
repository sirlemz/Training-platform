const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Register schemas first before initializing connection string handlers
require('./models/User');
require('./models/Class');
require('./models/Module');
require('./models/Progress');

require('./db'); // init DB

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ── Video streaming with range support ───────────────────────
const UPLOADS_DIR = process.env.UPLOADS_PATH || path.join(__dirname, '../../uploads');
app.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });
    file.pipe(res);
  } else {
    res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' });
    fs.createReadStream(filePath).pipe(res);
  }
});

// ── Assessment HTML (static) ─────────────────────────────────
app.use('/assessment', express.static(path.join(__dirname, '../public')));

// ── Slide player (static) ────────────────────────────────────
app.use('/slideplayer', express.static(path.join(__dirname, '../public/slideplayer')));

// ── API routes ───────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin/assessments', require('./routes/assessments'));
app.use('/api/trainee', require('./routes/trainee'));
app.use('/api/slide-modules', require('./routes/slideModules'));

// ── Serve built client in production ────────────────────────
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, () => console.log(`TGS Training Platform running on http://localhost:${PORT}`));
