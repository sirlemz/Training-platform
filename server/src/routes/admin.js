const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

router.use(requireAdmin);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../uploads');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 * 1024 } });

// ── Stats ────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const trainees = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='trainee'").get().c;
  const classes = db.prepare('SELECT COUNT(*) as c FROM classes').get().c;
  const completions = db.prepare(`
    SELECT COUNT(DISTINCT ct.user_id || '-' || ct.class_id) as c
    FROM class_trainees ct
    JOIN modules m ON m.class_id = ct.class_id
    LEFT JOIN progress p ON p.module_id = m.id AND p.user_id = ct.user_id
    GROUP BY ct.class_id, ct.user_id
    HAVING COUNT(m.id) > 0 AND COUNT(CASE WHEN p.status='completed' THEN 1 END) = COUNT(m.id)
  `).all().length;
  res.json({ trainees, classes, completions });
});

// ── Trainees ─────────────────────────────────────────────────
router.get('/trainees', (req, res) => {
  const trainees = db.prepare("SELECT id, name, email, created_at FROM users WHERE role='trainee' ORDER BY name").all();
  res.json(trainees);
});

router.post('/trainees', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(name, email.toLowerCase().trim(), hash, 'trainee');
    res.status(201).json({ id: result.lastInsertRowid, name, email: email.toLowerCase().trim() });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Email already exists' });
    throw e;
  }
});

router.put('/trainees/:id', (req, res) => {
  const { name, email, password } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE id = ? AND role = ?').get(req.params.id, 'trainee');
  if (!user) return res.status(404).json({ error: 'Trainee not found' });
  if (password) {
    db.prepare('UPDATE users SET name=?, email=?, password_hash=? WHERE id=?').run(name, email.toLowerCase().trim(), bcrypt.hashSync(password, 10), user.id);
  } else {
    db.prepare('UPDATE users SET name=?, email=? WHERE id=?').run(name, email.toLowerCase().trim(), user.id);
  }
  res.json({ ok: true });
});

router.delete('/trainees/:id', (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ? AND role = ?').run(req.params.id, 'trainee');
  res.json({ ok: true });
});

// ── Classes ──────────────────────────────────────────────────
router.get('/classes', (req, res) => {
  const classes = db.prepare('SELECT * FROM classes ORDER BY created_at DESC').all();
  const result = classes.map(c => {
    const moduleCount = db.prepare('SELECT COUNT(*) as c FROM modules WHERE class_id = ?').get(c.id).c;
    const traineeCount = db.prepare('SELECT COUNT(*) as c FROM class_trainees WHERE class_id = ?').get(c.id).c;
    return { ...c, moduleCount, traineeCount };
  });
  res.json(result);
});

router.post('/classes', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const result = db.prepare('INSERT INTO classes (name, description) VALUES (?, ?)').run(name, description || '');
  res.status(201).json({ id: result.lastInsertRowid, name, description });
});

router.get('/classes/:id', (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const modules = db.prepare('SELECT * FROM modules WHERE class_id = ? ORDER BY sequence_order').all(cls.id);

  const trainees = db.prepare(`
    SELECT u.id, u.name, u.email, ct.assigned_at
    FROM class_trainees ct
    JOIN users u ON u.id = ct.user_id
    WHERE ct.class_id = ?
    ORDER BY u.name
  `).all(cls.id);

  // Progress per trainee
  const traineeProgress = trainees.map(t => {
    const completed = db.prepare(`
      SELECT COUNT(*) as c FROM progress
      WHERE user_id = ? AND module_id IN (SELECT id FROM modules WHERE class_id = ?) AND status = 'completed'
    `).get(t.id, cls.id).c;
    return { ...t, completedModules: completed, totalModules: modules.length };
  });

  res.json({ ...cls, modules, trainees: traineeProgress });
});

router.put('/classes/:id', (req, res) => {
  const { name, description } = req.body;
  db.prepare('UPDATE classes SET name=?, description=? WHERE id=?').run(name, description, req.params.id);
  res.json({ ok: true });
});

router.delete('/classes/:id', (req, res) => {
  db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── Class trainees ───────────────────────────────────────────
router.post('/classes/:id/trainees', (req, res) => {
  const { userId } = req.body;
  try {
    db.prepare('INSERT INTO class_trainees (class_id, user_id) VALUES (?, ?)').run(req.params.id, userId);
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Already assigned' });
    throw e;
  }
});

router.delete('/classes/:id/trainees/:userId', (req, res) => {
  db.prepare('DELETE FROM class_trainees WHERE class_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
  res.json({ ok: true });
});

// ── Modules ──────────────────────────────────────────────────
router.post('/classes/:id/modules', upload.single('video'), (req, res) => {
  const { title, type, description, allow_retake } = req.body;
  if (!title || !type) return res.status(400).json({ error: 'title and type required' });

  let content = req.body.content || '';
  if (type === 'video' && req.file) {
    content = req.file.filename;
  }

  const maxOrder = db.prepare('SELECT MAX(sequence_order) as m FROM modules WHERE class_id = ?').get(req.params.id).m || 0;
  const result = db.prepare(
    'INSERT INTO modules (class_id, title, type, content, description, sequence_order, allow_retake) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(req.params.id, title, type, content, description || '', maxOrder + 1, allow_retake === 'true' || allow_retake === true ? 1 : 0);

  res.status(201).json({ id: result.lastInsertRowid, title, type, content, description, sequence_order: maxOrder + 1 });
});

router.put('/modules/:id', upload.single('video'), (req, res) => {
  const { title, description, allow_retake } = req.body;
  const mod = db.prepare('SELECT * FROM modules WHERE id = ?').get(req.params.id);
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  let content = mod.content;
  if (req.file) {
    // Delete old file if it was a video
    if (mod.type === 'video' && mod.content) {
      const oldPath = path.join(__dirname, '../../../uploads', mod.content);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    content = req.file.filename;
  } else if (req.body.content !== undefined) {
    content = req.body.content;
  }

  db.prepare('UPDATE modules SET title=?, content=?, description=?, allow_retake=? WHERE id=?').run(
    title || mod.title, content, description ?? mod.description, allow_retake === 'true' || allow_retake === true ? 1 : 0, mod.id
  );
  res.json({ ok: true });
});

router.delete('/modules/:id', (req, res) => {
  const mod = db.prepare('SELECT * FROM modules WHERE id = ?').get(req.params.id);
  if (mod?.type === 'video' && mod.content) {
    const filePath = path.join(__dirname, '../../../uploads', mod.content);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.prepare('DELETE FROM modules WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.put('/modules/reorder', (req, res) => {
  const { order } = req.body; // array of { id, sequence_order }
  const stmt = db.prepare('UPDATE modules SET sequence_order = ? WHERE id = ?');
  const txn = db.transaction(() => order.forEach(({ id, sequence_order }) => stmt.run(sequence_order, id)));
  txn();
  res.json({ ok: true });
});

// ── Progress overview ─────────────────────────────────────────
router.get('/classes/:id/progress', (req, res) => {
  const modules = db.prepare('SELECT id, title, type, sequence_order FROM modules WHERE class_id = ? ORDER BY sequence_order').all(req.params.id);
  const trainees = db.prepare(`
    SELECT u.id, u.name FROM class_trainees ct JOIN users u ON u.id = ct.user_id WHERE ct.class_id = ?
  `).all(req.params.id);

  const grid = trainees.map(t => {
    const prog = db.prepare('SELECT module_id, status, score, completed_at FROM progress WHERE user_id = ? AND module_id IN (SELECT id FROM modules WHERE class_id = ?)').all(t.id, req.params.id);
    const progMap = Object.fromEntries(prog.map(p => [p.module_id, p]));
    return { ...t, modules: modules.map(m => ({ ...m, progress: progMap[m.id] || null })) };
  });

  res.json({ modules, trainees: grid });
});

module.exports = router;
