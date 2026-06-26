const router = require('express').Router();
const mongoose = require('mongoose');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Reference Mongoose Models
const Module = mongoose.model('Module');
const Progress = mongoose.model('Progress');

// ── GET /api/slide-modules/:id — Accessible by any authenticated user ──
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const mod = await Module.findById(req.params.id);
    if (!mod) return res.status(404).json({ error: 'Module not found' });
    if (mod.type !== 'slide_deck') return res.status(400).json({ error: 'Not a slide deck module' });

    // Safely parse JSON slide structure if it exists
    let content = null;
    if (mod.content) {
      try { 
        content = JSON.parse(mod.content); 
      } catch (e) { 
        content = null; 
      }
    }

    // If the requester is a trainee, fetch their matching progress record
    let progress = null;
    if (req.user.role === 'trainee') {
      const record = await Progress.findOne({ 
        user_id: req.user.id, 
        module_id: req.params.id 
      });
      
      if (record) {
        progress = {
          status: record.status,
          score: record.score,
          score_data: record.score_data
        };
      }
    }

    res.json({ 
      id: mod._id, 
      title: mod.title, 
      content, 
      progress 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── PUT /api/slide-modules/:id — Admin only: Save slide content updates ──
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const mod = await Module.findById(req.params.id);
    if (!mod) return res.status(404).json({ error: 'Module not found' });
    if (mod.type !== 'slide_deck') return res.status(400).json({ error: 'Not a slide deck module' });

    // Body can arrive as the raw content object OR wrapped as { content: ... }
    const contentData = req.body.content !== undefined ? req.body.content : req.body;
    
    // Save slide layout object back to a MongoDB string string safely
    mod.content = JSON.stringify(contentData);
    await mod.save();

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
