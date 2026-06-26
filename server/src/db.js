const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('CRITICAL: MONGODB_URI environment variable is missing!');
  process.exit(1);
}

// Connect to MongoDB Atlas
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB Atlas successfully!');
    await seedAdmin();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// Seed default admin account if collections are completely new
async function seedAdmin() {
  try {
    const User = mongoose.model('User');
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      const hash = bcrypt.hashSync('Admin@123', 10);
      await User.create({
        name: 'Administrator',
        email: 'admin@tgsbpo.com',
        password_hash: hash,
        role: 'admin'
      });
      console.log('Default admin initialized: admin@tgsbpo.com / Admin@123');
    }
  } catch (error) {
    console.error('Error seeding default administrator:', error);
  }
}

module.exports = mongoose.connection;
