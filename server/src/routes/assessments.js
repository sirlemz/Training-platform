const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAdmin } = require('../middleware/auth');

const ASSESSMENTS_DIR = path.join(__dirname, '../../public/assessments');
fs.mkdirSync(ASSESSMENTS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ASSESSMENTS_DIR),
  filename: (req, file, cb) => {
    // Sanitize filename, keep extension
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Avoid overwriting — prefix with timestamp if name exists
    const dest = path.join(ASSESSMENTS_DIR, safe);
    const final = fs.existsSync(dest) ? Date.now() + '_' + safe : safe;
    cb(null, final);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.html?$/i)) {
      return cb(new Error('Only HTML files are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB max
});

router.use(requireAdmin);

// List all uploaded assessment files
router.get('/', (req, res) => {
  try {
    const files = fs.readdirSync(ASSESSMENTS_DIR)
      .filter(f => f.match(/\.html?$/i))
      .map(f => {
        const stat = fs.statSync(path.join(ASSESSMENTS_DIR, f));
        return { filename: f, size: stat.size, uploadedAt: stat.mtime };
      })
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload a new assessment HTML file
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.status(201).json({ filename: req.file.filename });
});

// Delete an assessment file
router.delete('/:filename', (req, res) => {
  try {
    const filename = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = path.join(ASSESSMENTS_DIR, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
