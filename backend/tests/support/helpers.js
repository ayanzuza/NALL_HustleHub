const request = require('supertest');
const bcrypt = require('bcryptjs');

let counter = 0;
const PASSWORD = 'StrongPass1!';
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const gigPayload = (over = {}) => ({
  title: 'Logo design',
  description: 'I will design a modern logo for your business.',
  category: 'design',
  price: 500,
  ...over,
});

async function registerUser(app, role = 'client') {
  const email = `${role}${Date.now()}${counter++}@example.com`;
  const res = await request(app).post('/api/auth/register').send({ name: 'Test User', email, password: PASSWORD, role });
  return { email, password: PASSWORD, token: res.body.data.token, user: res.body.data.user };
}

async function createAdmin(app) {
  const { User } = require('./fakeModels');
  const email = `admin${Date.now()}${counter++}@example.com`;
  await User.create({ name: 'Admin User', email, passwordHash: await bcrypt.hash('AdminPass1!', 4), role: 'admin' });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'AdminPass1!' });
  return { token: res.body.data.token, user: res.body.data.user };
}

async function createGig(app, token, over) {
  const res = await request(app).post('/api/gigs').set(auth(token)).send(gigPayload(over));
  return res.body.data.gig;
}

module.exports = { auth, gigPayload, registerUser, createAdmin, createGig, PASSWORD };
