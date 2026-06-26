const router = require('express').Router();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Reference Mongoose Models
const User = mongoose.model('User');
const Class = mongoose.model('Class');
const Module = mongoose.model('Module');
const Progress = mongoose.model('Progress');

router.use(requireAdmin);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.UPLOADS_PATH || path.join(__dirname, '../../../uploads');
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
router.get('/stats', async (req, res) => {
  try {
    const trainees = await User.countDocuments({ role: 'trainee' });
    const classes = await Class.countDocuments({});

    // Compute course completion status dynamically across classes
    const allClasses = await Class.find({});
    let completions = 0;

    for (const cls of allClasses) {
      const moduleIds = await Module.find({ class_id: cls._id }).distinct('_id');
      if (moduleIds.length === 0) continue;

      for (const traineeId of cls.trainees) {
        const completedCount = await Progress.countDocuments({
          user_id: traineeId,
          module_id: { $in: moduleIds },
          status: 'completed'
        });
        if (completedCount === moduleIds.length) {
          completions++;
        }
      }
    }

    res.json({ trainees, classes, completions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Trainees ─────────────────────────────────────────────────
router.get('/trainees', async (req, res) => {
  try {
    const trainees = await User.find({ role: 'trainee' }).sort({ name: 1 });
    res.json(trainees.map(t => ({ id: t._id, name: t.name, email: t.email, created_at: t.created_at })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/trainees', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
  
  try {
    const hash = bcrypt.hashSync(password, 10);
    const cleanEmail = email.toLowerCase().trim();
    
    const newUser = await User.create({
      name,
      email: cleanEmail,
      password_hash: hash,
      role: 'trainee'
    });
    
    res.status(201).json({ id: newUser._id, name, email: cleanEmail });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/trainees/:id', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const user = await User.findOne({ _id: req.params.id, role: 'trainee' });
    if (!user) return res.status(404).json({ error: 'Trainee not found' });

    user.name = name || user.name;
    user.email = email ? email.toLowerCase().trim() : user.email;
    if (password) {
      user.password_hash = bcrypt.hashSync(password, 10);
    }

    await user.save();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/trainees/:id', async (req, res) => {
  try {
    await User.deleteOne({ _id: req.params.id, role: 'trainee' });
    // Pull the deleted user out of any classes they were assigned to
    await Class.updateMany({}, { $pull: { trainees: req.params.id } });
    // Clear out their progress records
    await Progress.deleteMany({ user_id: req.params.id });
    
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Classes ──────────────────────────────────────────────────
router.get('/classes', async (req, res) => {
  try {
    const classes = await Class.find({}).sort({ created_at: -1 });
    const result = await Promise.all(classes.map(async c => {
      const moduleCount = await Module.countDocuments({ class_id: c._id });
      const traineeCount = c.trainees.length;
      return {
        id: c._id,
        name: c.name,
        description: c.description,
        created_at: c.created_at,
        moduleCount,
        traineeCount
      };
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/classes', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const newClass = await Class.create({ name, description: description || '' });
    res.status(201).json({ id: newClass._id, name, description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/classes/:id', async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id).populate('trainees', 'name email created_at');
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    const modules = await Module.find({ class_id: cls._id }).sort({ sequence_order: 1 });
    const moduleIds = modules.map(m => m._id);

    const traineeProgress = await Promise.all(cls.trainees.map(async t => {
      const completed = await Progress.countDocuments({
        user_id: t._id,
        module_id: { $in: moduleIds },
        status: 'completed'
      });
      return {
        id: t._id,
        name: t.name,
        email: t.email,
        created_at: t.created_at,
        completedModules: completed,
        totalModules: modules.length
      };
    }));

    res.json({
      id: cls._id,
      name: cls.name,
      description: cls.description,
      created_at: cls.created_at,
      modules: modules.map(m => ({ ...m.toObject(), id: m._id })),
      trainees: traineeProgress
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/classes/:id', async (req, res) => {
  const { name, description } = req.body;
  try {
    await Class.findByIdAndUpdate(req.params.id, { name, description });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/classes/:id', async (req, res) => {
  try {
    await Class.findByIdAndDelete(req.params.id);
    const classModules = await Module.find({ class_id: req.params.id });
    const classModuleIds = classModules.map(m => m._id);
    
    // Clean up local video storage files
    for (const mod of classModules) {
      if (mod.type === 'video' && mod.content) {
        const filePath = path.join(__dirname, '../../../uploads', mod.content);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }

    await Module.deleteMany({ class_id: req.params.id });
    await Progress.deleteMany({ module_id: { $in: classModuleIds } });
    
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Class trainees ───────────────────────────────────────────
router.post('/classes/:id/trainees', async (req, res) => {
  const { userId } = req.body;
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    if (cls.trainees.includes(userId)) {
      return res.status(409).json({ error: 'Already assigned' });
    }

    cls.trainees.push(userId);
    await cls.save();
    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/classes/:id/trainees/:userId', async (req, res) => {
  try {
    await Class.findByIdAndUpdate(req.params.id, { $pull: { trainees: req.params.userId } });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Modules ──────────────────────────────────────────────────
router.post('/classes/:id/modules', upload.single('video'), async (req, res) => {
  const { title, type, description, allow_retake } = req.body;
  if (!title || !type) return res.status(400).json({ error: 'title and type required' });

  try {
    let content = req.body.content || '';
    if (type === 'video' && req.file) {
      content = req.file.filename;
    }

    const lastModule = await Module.findOne({ class_id: req.params.id }).sort({ sequence_order: -1 });
    const maxOrder = lastModule ? lastModule.sequence_order : 0;

    const newModule = await Module.create({
      class_id: req.params.id,
      title,
      type,
      content,
      description: description || '',
      sequence_order: maxOrder + 1,
      allow_retake: allow_retake === 'true' || allow_retake === true ? 1 : 0
    });

    res.status(201).json({
      id: newModule._id,
      title,
      type,
      content,
      description,
      sequence_order: maxOrder + 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/modules/:id', upload.single('video'), async (req, res) => {
  const { title, description, allow_retake } = req.body;
  try {
    const mod = await Module.findById(req.params.id);
    if (!mod) return res.status(404).json({ error: 'Module not found' });

    let content = mod.content;
    if (req.file) {
      if (mod.type === 'video' && mod.content) {
        const oldPath = path.join(__dirname, '../../../uploads', mod.content);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      content = req.file.filename;
    } else if (req.body.content !== undefined) {
      content = req.body.content;
    }

    mod.title = title || mod.title;
    mod.content = content;
    mod.description = description !== undefined ? description : mod.description;
    mod.allow_retake = allow_retake === 'true' || allow_retake === true ? 1 : 0;

    await mod.save();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/modules/:id', async (req, res) => {
  try {
    const mod = await Module.findById(req.params.id);
    if (mod && mod.type === 'video' && mod.content) {
      const filePath = path.join(__dirname, '../../../uploads', mod.content);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    
    await Module.findByIdAndDelete(req.params.id);
    await Progress.deleteMany({ module_id: req.params.id });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/modules/reorder', async (req, res) => {
  const { order } = req.body; // array of { id, sequence_order }
  try {
    await Promise.all(order.map(({ id, sequence_order }) => 
      Module.findByIdAndUpdate(id, { sequence_order })
    ));
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Progress overview ─────────────────────────────────────────
router.get('/classes/:id/progress', async (req, res) => {
  try {
    const modules = await Module.find({ class_id: req.params.id }).sort({ sequence_order: 1 });
    const cls = await Class.findById(req.params.id).populate('trainees', 'name');
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    const moduleIds = modules.map(m => m._id);

    const grid = await Promise.all(cls.trainees.map(async t => {
      const prog = await Progress.find({
        user_id: t._id,
        module_id: { $in: moduleIds }
      });
      
      const progMap = {};
      prog.forEach(p => {
        progMap[p.module_id.toString()] = {
          module_id: p.module_id,
          status: p.status,
          score: p.score,
          completed_at: p.completed_at
        };
      });

      return {
        id: t._id,
        name: t.name,
        modules: modules.map(m => ({
          id: m._id,
          title: m.title,
          type: m.type,
          sequence_order: m.sequence_order,
          progress: progMap[m._id.toString()] || null
        }))
      };
    }));

    res.json({
      modules: modules.map(m => ({ id: m._id, title: m.title, type: m.type, sequence_order: m.sequence_order })),
      trainees: grid
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
