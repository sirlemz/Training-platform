const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// ── My classes ───────────────────────────────────────────────
router.get('/classes', (req, res) => {
  const classes = db.prepare(`
    SELECT c.id, c.name, c.description, ct.assigned_at
    FROM class_trainees ct
    JOIN classes c ON c.id = ct.class_id
    WHERE ct.user_id = ?
    ORDER BY ct.assigned_at DESC
  `).all(req.user.id);

  const result = classes.map(c => {
    const total = db.prepare('SELECT COUNT(*) as n FROM modules WHERE class_id = ?').get(c.id).n;
    const completed = db.prepare(`
      SELECT COUNT(*) as n FROM progress p
      JOIN modules m ON m.id = p.module_id
      WHERE p.user_id = ? AND m.class_id = ? AND p.status = 'completed'
    `).get(req.user.id, c.id).n;
    return { ...c, totalModules: total, completedModules: completed };
  });

  res.json(result);
});

// ── Class detail with modules + my progress ───────────────────
router.get('/classes/:id', (req, res) => {
  const assigned = db.prepare('SELECT 1 FROM class_trainees WHERE class_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!assigned) return res.status(403).json({ error: 'Not enrolled in this class' });

  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const modules = db.prepare('SELECT * FROM modules WHERE class_id = ? ORDER BY sequence_order').all(cls.id);
  const prog = db.prepare('SELECT * FROM progress WHERE user_id = ? AND module_id IN (SELECT id FROM modules WHERE class_id = ?)').all(req.user.id, cls.id);
  const progMap = Object.fromEntries(prog.map(p => [p.module_id, p]));

  const modulesWithProgress = modules.map((m, idx) => {
    const p = progMap[m.id] || null;
    // A module is unlocked if it's the first, or the previous module is completed
    const unlocked = idx === 0 || (progMap[modules[idx - 1].id]?.status === 'completed');
    return { ...m, progress: p, unlocked };
  });

  res.json({ ...cls, modules: modulesWithProgress });
});

// ── Mark progress ────────────────────────────────────────────
router.post('/progress/:moduleId', (req, res) => {
  const { status, score, score_data } = req.body;
  const mod = db.prepare('SELECT * FROM modules WHERE id = ?').get(req.params.moduleId);
  if (!mod) return res.status(404).json({ error: 'Module not found' });

  // Verify trainee is enrolled in this module's class
  const enrolled = db.prepare('SELECT 1 FROM class_trainees WHERE class_id = ? AND user_id = ?').get(mod.class_id, req.user.id);
  if (!enrolled) return res.status(403).json({ error: 'Not enrolled' });

  // Check if already completed and retake not allowed
  const existing = db.prepare('SELECT * FROM progress WHERE user_id = ? AND module_id = ?').get(req.user.id, mod.id);
  if (existing?.status === 'completed' && !mod.allow_retake && mod.type === 'assessment') {
    return res.status(409).json({ error: 'Assessment already completed and retakes are not allowed' });
  }

  const now = status === 'completed' ? new Date().toISOString() : null;
  if (existing) {
    db.prepare(`
      UPDATE progress SET status=?, score=?, score_data=?, attempt_count=attempt_count+1, completed_at=?
      WHERE user_id=? AND module_id=?
    `).run(status, score ?? null, score_data ? JSON.stringify(score_data) : null, now, req.user.id, mod.id);
  } else {
    db.prepare(`
      INSERT INTO progress (user_id, module_id, status, score, score_data, attempt_count, completed_at)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `).run(req.user.id, mod.id, status, score ?? null, score_data ? JSON.stringify(score_data) : null, now);
  }

  res.json({ ok: true });
});

// ── Check class completion (for certificate) ──────────────────
router.get('/classes/:id/certificate', (req, res) => {
  const assigned = db.prepare('SELECT 1 FROM class_trainees WHERE class_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!assigned) return res.status(403).json({ error: 'Not enrolled' });

  const total = db.prepare('SELECT COUNT(*) as n FROM modules WHERE class_id = ?').get(req.params.id).n;
  const completed = db.prepare(`
    SELECT COUNT(*) as n FROM progress p
    JOIN modules m ON m.id = p.module_id
    WHERE p.user_id = ? AND m.class_id = ? AND p.status = 'completed'
  `).get(req.user.id, req.params.id).n;

  if (total === 0 || completed < total) {
    return res.status(400).json({ error: 'Class not yet complete' });
  }

  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  const lastCompletion = db.prepare(`
    SELECT MAX(p.completed_at) as d FROM progress p
    JOIN modules m ON m.id = p.module_id
    WHERE p.user_id = ? AND m.class_id = ?
  `).get(req.user.id, req.params.id).d;

  res.json({ eligible: true, className: cls.name, completedAt: lastCompletion, traineeName: req.user.name });
});

module.exports = router;
