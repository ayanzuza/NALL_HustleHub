/**
 * Creates the first admin account. Admins cannot self-register through the
 * API (registration only allows client/freelancer), so this is the only way.
 * Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='LongPassw0rd!' npm run seed:admin
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDb } = require('../config/db');
const User = require('../models/User');

(async () => {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || password.length < 12) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (min 12 characters) before running.');
    process.exit(1);
  }
  await connectDb();
  if (await User.findOne({ email })) {
    console.log('Admin already exists - nothing to do.');
  } else {
    await User.create({ name: 'Platform Admin', email, passwordHash: await bcrypt.hash(password, 12), role: 'admin' });
    console.log(`Admin created: ${email}`);
  }
  await mongoose.disconnect();
})().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
