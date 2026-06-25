const router = require('express').Router();
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/slide-modules/:id — any authenticated user
router.get('/:id', requireAuth, (req, res) => {
  const mod = db.prepare('SELECT id, title, type, content FROM modules WHERE id = ?').get(req.params.id);
  if (!mod) return res.status(404).json({ error: 'Module not found' });
  if (mod.type !== 'slide_deck') return res.status(400).json({ error: 'Not a slide deck module' });

  let content = null;
  if (mod.content) {
    try { content = JSON.parse(mod.content); } catch (e) { content = null; }
  }

  // If requester is a trainee, also attach their current progress
  let progress = null;
  if (req.user.role === 'trainee') {
    progress = db.prepare('SELECT status, score, score_data FROM progress WHERE user_id = ? AND module_id = ?')
      .get(req.user.id, req.params.id);
  }

  res.json({ id: mod.id, title: mod.title, content, progress });
});

// PUT /api/slide-modules/:id — admin only: save slide content
router.put('/:id', requireAdmin, (req, res) => {
  const mod = db.prepare('SELECT id, type FROM modules WHERE id = ?').get(req.params.id);
  if (!mod) return res.status(404).json({ error: 'Module not found' });
  if (mod.type !== 'slide_deck') return res.status(400).json({ error: 'Not a slide deck module' });

  // Body can be the raw content object OR { content: ... }
  const content = req.body.content !== undefined ? req.body.content : req.body;
  db.prepare('UPDATE modules SET content = ? WHERE id = ?').run(JSON.stringify(content), mod.id);
  res.json({ ok: true });
});

module.exports = router;
