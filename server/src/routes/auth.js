const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

// Reference the registered Mongoose Model
const User = mongoose.model('User');

// ── User Login ───────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    // Look up user by lowercase email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Sign authentication token using user properties
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({ 
      token, 
      user: { id: user._id, name: user.name, email: user.email, role: user.role } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Get Current Profile Details ───────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Update Password ───────────────────────────────────────────
router.put('/me/password', requireAuth, async (req, res) => {
  const { current, next: newPassword } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!bcrypt.compareSync(current, user.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Update password hash safely
    user.password_hash = bcrypt.hashSync(newPassword, 10);
    await user.save();

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
