const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { RevokedToken } = require('./support/fakeModels');
const { registerUser, auth, PASSWORD } = require('./support/helpers');

const me = (token) => request(app).get('/api/users/me').set(auth(token));
const logout = (token) => request(app).post('/api/auth/logout').set(auth(token));

describe('Token revocation (logout)', () => {
  let user;
  beforeEach(async () => { user = await registerUser(app, 'freelancer'); });

  test('a token works before logout and is rejected immediately after', async () => {
    expect((await me(user.token)).status).toBe(200);
    const res = await logout(user.token);
    expect(res.status).toBe(200);
    const after = await me(user.token);
    expect(after.status).toBe(401);
    expect(after.body.message).toBe('Invalid or expired token');
  });

  test('a revoked token is rejected on every protected route, not just /me', async () => {
    await logout(user.token);
    for (const [method, path] of [['get', '/api/gigs'], ['get', '/api/bookings'], ['get', '/api/income'], ['post', '/api/auth/logout']]) {
      expect({ path, status: (await request(app)[method](path).set(auth(user.token))).status }).toEqual({ path, status: 401 });
    }
  });

  test('logging out ends only that session: a second login for the same user still works', async () => {
    const second = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    await logout(user.token);
    expect((await me(second.body.data.token)).status).toBe(200);
  });

  test('only the token id and its expiry are stored - never the token itself', async () => {
    await logout(user.token);
    const { jti, exp } = jwt.decode(user.token);
    const [row] = RevokedToken.__all();
    expect(row.jti).toBe(jti);
    expect(row.expiresAt.getTime()).toBe(exp * 1000);
    expect(JSON.stringify(row)).not.toContain(user.token);
  });

  test('logout needs a valid token (401 without one) and tokens cannot be revoked by someone else', async () => {
    expect((await request(app).post('/api/auth/logout')).status).toBe(401);
    const other = await registerUser(app, 'client');
    await logout(other.token);
    expect((await me(user.token)).status).toBe(200); // unaffected
  });

  test('every issued token has its own unique jti', async () => {
    const a = jwt.decode(user.token).jti;
    const b = jwt.decode((await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD })).body.data.token).jti;
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  test('tokens without a jti, or signed with another algorithm, are refused', async () => {
    const payload = { id: user.user.id, role: 'freelancer' };
    const noJti = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const hs512 = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h', jwtid: 'x', algorithm: 'HS512' });
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ ...payload, jti: 'x' })).toString('base64url')}.`;
    for (const t of [noJti, hs512, none]) expect((await me(t)).status).toBe(401);
  });

  test('fails closed: if the denylist cannot be checked the request is refused, with no internals leaked', async () => {
    const spy = jest.spyOn(RevokedToken, 'findOne').mockImplementationOnce(() => { throw new Error('mongo timeout at 10.0.0.5'); });
    const res = await me(user.token);
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/mongo|10\.0\.0\.5/);
  });
});
