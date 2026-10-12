const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { User } = require('./support/fakeModels');
const { registerUser, auth, PASSWORD } = require('./support/helpers');

describe('Authentication', () => {
  test('registration issues a JWT containing only id and role, and never returns the hash', async () => {
    const { token, user } = await registerUser(app, 'freelancer');
    const payload = jwt.decode(token);
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'id', 'role']);
    expect(payload.role).toBe('freelancer');
    expect(payload.exp - payload.iat).toBe(3600);
    expect(JSON.stringify(user)).not.toMatch(/passwordHash|StrongPass1/);
  });

  test('passwords are stored as bcrypt hashes, never plain text', async () => {
    await registerUser(app);
    const stored = User.__all()[0].passwordHash;
    expect(stored).not.toBe(PASSWORD);
    expect(stored).toMatch(/^\$2[aby]\$12\$/);
  });

  test('duplicate email -> 409', async () => {
    const { email } = await registerUser(app);
    const res = await request(app).post('/api/auth/register').send({ name: 'Other', email, password: PASSWORD });
    expect(res.status).toBe(409);
  });

  test('admin cannot be self-assigned at registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Evil', email: 'evil@example.com', password: PASSWORD, role: 'admin' });
    expect(res.status).toBe(400);
    expect(User.__all()).toHaveLength(0);
  });

  test('weak password and missing fields -> 400 with field errors', async () => {
    const weak = await request(app).post('/api/auth/register').send({ name: 'A B', email: 'a@b.com', password: 'weak' });
    expect(weak.status).toBe(400);
    expect(weak.body.errors.length).toBeGreaterThan(0);
    const missing = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });
    expect(missing.status).toBe(400);
  });

  test('script injection in name is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: '<script>alert(1)</script>', email: 'x@example.com', password: PASSWORD });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/invalid characters/);
  });

  test('NoSQL operator payload on login -> 400, never reaches the database', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400);
  });

  test('login: wrong password and unknown email give the identical generic 401', async () => {
    const { email } = await registerUser(app);
    const wrong = await request(app).post('/api/auth/login').send({ email, password: 'WrongPass1!' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: PASSWORD });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  test('protected route: valid token 200; missing / garbage / tampered token 401', async () => {
    const { token, email } = await registerUser(app);
    const ok = await request(app).get('/api/users/me').set(auth(token));
    expect(ok.status).toBe(200);
    expect(ok.body.data.user.email).toBe(email.toLowerCase());
    expect((await request(app).get('/api/users/me')).status).toBe(401);
    expect((await request(app).get('/api/users/me').set(auth('garbage.token.value'))).status).toBe(401);
    const forged = jwt.sign({ id: ok.body.data.user.id, role: 'admin' }, 'wrong-secret');
    const tampered = await request(app).get('/api/users/me').set(auth(forged));
    expect(tampered.status).toBe(401);
    expect(tampered.body.message).toBe('Invalid or expired token');
  });

  test('expired token -> 401', async () => {
    const expired = jwt.sign({ id: 'abc', role: 'client' }, process.env.JWT_SECRET, { expiresIn: -10 });
    expect((await request(app).get('/api/users/me').set(auth(expired))).status).toBe(401);
  });
});
