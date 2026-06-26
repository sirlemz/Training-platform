const router = require('express').Router();
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');

// Reference Mongoose Models
const Class = mongoose.model('Class');
const Module = mongoose.model('Module');
const Progress = mongoose.model('Progress');

router.use(requireAuth);

// ── My classes ───────────────────────────────────────────────
router.get('/classes', async (req, res) => {
  try {
    // Find all classes where the trainees array contains the current user's ID
    const classes = await Class.find({ trainees: req.user.id }).sort({ created_at: -1 });

    const result = await Promise.all(classes.map(async c => {
      const total = await Module.countDocuments({ class_id: c._id });
      
      // Get all module IDs belonging to this class to evaluate progress records
      const moduleIds = await Module.find({ class_id: c._id }).distinct('_id');
      
      const completed = await Progress.countDocuments({
        user_id: req.user.id,
        module_id: { $in: moduleIds },
        status: 'completed'
      });

      return {
        id: c._id,
        name: c.name,
        description: c.description,
        created_at: c.created_at,
        totalModules: total,
        completedModules: completed
      };
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Class detail with modules + my progress ───────────────────
router.get('/classes/:id', async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });
    
    // Verify user enrollment clearance
    if (!cls.trainees.includes(req.user.id)) {
      return res.status(403).json({ error: 'Not enrolled in this class' });
    }

    const modules = await Module.find({ class_id: cls._id }).sort({ sequence_order: 1 });
    const moduleIds = modules.map(m => m._id);

    // Pull matching student progress history
    const prog = await Progress.find({ user_id: req.user.id, module_id: { $in: moduleIds } });
    const progMap = {};
    prog.forEach(p => {
      progMap[p.module_id.toString()] = p;
    });

    // Determine lock/unlock states sequentially
    const modulesWithProgress = modules.map((m, idx) => {
      const p = progMap[m._id.toString()] || null;
      
      // A module is unlocked if it's the first one, or if the previous module's status is 'completed'
      const unlocked = idx === 0 || (progMap[modules[idx - 1]._id.toString()]?.status === 'completed');
      
      return {
        ...m.toObject(),
        id: m._id,
        progress: p ? { ...p.toObject(), id: p._id } : null,
        unlocked
      };
    });

    res.json({
      id: cls._id,
      name: cls.name,
      description: cls.description,
      created_at: cls.created_at,
      modules: modulesWithProgress
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Mark progress ────────────────────────────────────────────
router.post('/progress/:moduleId', async (req, res) => {
  const { status, score, score_data } = req.body;
  
  try {
    const mod = await Module.findById(req.params.moduleId);
    if (!mod) return res.status(404).json({ error: 'Module not found' });

    // Verify trainee is assigned to this module's parent course container
    const cls = await Class.findById(mod.class_id);
    if (!cls || !cls.trainees.includes(req.user.id)) {
      return res.status(403).json({ error: 'Not enrolled' });
    }

    // Block modification conditions if retaking is restricted
    const existing = await Progress.findOne({ user_id: req.user.id, module_id: mod._id });
    if (existing?.status === 'completed' && !mod.allow_retake && mod.type === 'assessment') {
      return res.status(409).json({ error: 'Assessment already completed and retakes are not allowed' });
    }

    const now = status === 'completed' ? new Date() : null;
    const stringifiedScoreData = score_data ? JSON.stringify(score_data) : null;

    if (existing) {
      existing.status = status;
      existing.score = score !== undefined ? score : existing.score;
      existing.score_data = stringifiedScoreData !== null ? stringifiedScoreData : existing.score_data;
      existing.attempt_count += 1;
      if (now) existing.completed_at = now;
      
      await existing.save();
    } else {
      await Progress.create({
        user_id: req.user.id,
        module_id: mod._id,
        status,
        score: score ?? null,
        score_data: stringifiedScoreData,
        attempt_count: 1,
        completed_at: now
      });
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Check class completion (for certificate generation) ──────
router.get('/classes/:id/certificate', async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls || !cls.trainees.includes(req.user.id)) {
      return res.status(403).json({ error: 'Not enrolled' });
    }

    const total = await Module.countDocuments({ class_id: cls._id });
    const moduleIds = await Module.find({ class_id: cls._id }).distinct('_id');
    
    const completed = await Progress.countDocuments({
      user_id: req.user.id,
      module_id: { $in: moduleIds },
      status: 'completed'
    });

    if (total === 0 || completed < total) {
      return res.status(400).json({ error: 'Class not yet complete' });
    }

    // Locate the latest completion timestamp across module metrics
    const latestProgressRecord = await Progress.find({
      user_id: req.user.id,
      module_id: { $in: moduleIds },
      status: 'completed'
    }).sort({ completed_at: -1 }).limit(1);

    const lastCompletion = latestProgressRecord.length > 0 ? latestProgressRecord[0].completed_at : null;

    res.json({
      eligible: true,
      className: cls.name,
      completedAt: lastCompletion,
      traineeName: req.user.name
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
