const request = require('supertest');
const app = require('../src/app');
const { User } = require('./support/fakeModels');
const { registerUser, auth, PASSWORD } = require('./support/helpers');

// bcrypt at cost 12 is deliberately slow, and these tests make many logins.
jest.setTimeout(60000);

const MIN = 60 * 1000;
const login = (email, password) => request(app).post('/api/auth/login').send({ email, password });
const fail = async (email, times) => { for (let i = 0; i < times; i += 1) await login(email, 'WrongPass1!'); };
const stored = (email) => User.__all().find((u) => u.email === email.toLowerCase());
const expire = (email) => { stored(email).lockUntil = new Date(Date.now() - 1000); };

describe('Account lockout with exponential backoff', () => {
  let user;
  beforeEach(async () => { user = await registerUser(app, 'client'); });

  test('4 failures do not lock the account; the correct password still works and resets the counter', async () => {
    await fail(user.email, 4);
    expect(stored(user.email).failedLoginAttempts).toBe(4);
    expect((await login(user.email, PASSWORD)).status).toBe(200);
    expect(stored(user.email).failedLoginAttempts).toBe(0);
    await fail(user.email, 4); // counter restarted, so still not locked
    expect(stored(user.email).lockUntil).toBeUndefined();
  });

  test('the 5th consecutive failure locks the account for 15 minutes - even the correct password is refused', async () => {
    await fail(user.email, 5);
    const lock = stored(user.email).lockUntil.getTime() - Date.now();
    expect(lock).toBeGreaterThan(14 * MIN);
    expect(lock).toBeLessThanOrEqual(15 * MIN);
    const res = await login(user.email, PASSWORD);
    expect(res.status).toBe(401);
    expect(res.body.data).toBeUndefined();
  });

  test('a locked account, an unknown account and a wrong password all look identical to the caller', async () => {
    await fail(user.email, 5);
    const locked = await login(user.email, PASSWORD);
    const unknown = await login('nobody@example.com', PASSWORD);
    const other = await registerUser(app, 'client');
    const wrong = await login(other.email, 'WrongPass1!');
    for (const r of [locked, unknown, wrong]) {
      expect(r.status).toBe(401);
      expect(r.body).toEqual({ success: false, message: 'Invalid email or password' });
    }
  });

  test('once the lock expires the correct password works again and all lock state is cleared', async () => {
    await fail(user.email, 5);
    expire(user.email);
    expect((await login(user.email, PASSWORD)).status).toBe(200);
    expect(stored(user.email)).toMatchObject({ failedLoginAttempts: 0, lockCount: 0 });
    expect(stored(user.email).lockUntil).toBeUndefined();
  });

  test('backoff: a repeat lock lasts twice as long (30 min), then 60 min', async () => {
    await fail(user.email, 5);
    expect(stored(user.email).lockCount).toBe(1);
    expire(user.email);
    await fail(user.email, 5);
    expect(stored(user.email).lockCount).toBe(2);
    const second = stored(user.email).lockUntil.getTime() - Date.now();
    expect(second).toBeGreaterThan(29 * MIN);
    expect(second).toBeLessThanOrEqual(30 * MIN);
  });

  test('the lock duration is capped at 24 hours', async () => {
    stored(user.email).lockCount = 20; // would be 15 min x 2^20 without a cap
    await fail(user.email, 5);
    const lock = stored(user.email).lockUntil.getTime() - Date.now();
    expect(lock).toBeLessThanOrEqual(24 * 60 * MIN);
    expect(lock).toBeGreaterThan(23 * 60 * MIN);
  });

  test('locking one account does not affect anyone else', async () => {
    const bystander = await registerUser(app, 'freelancer');
    await fail(user.email, 5);
    expect((await login(bystander.email, PASSWORD)).status).toBe(200);
  });

  test('failed attempts while locked do not extend the lock', async () => {
    await fail(user.email, 5);
    const before = stored(user.email).lockUntil.getTime();
    await fail(user.email, 3);
    expect(stored(user.email).lockUntil.getTime()).toBe(before);
    expect(stored(user.email).lockCount).toBe(1);
  });

  test('lockout fields are never exposed in any API response', async () => {
    await fail(user.email, 2);
    const ok = await login(user.email, PASSWORD);
    const me = await request(app).get('/api/users/me').set(auth(ok.body.data.token));
    for (const body of [ok.body, me.body]) {
      expect(JSON.stringify(body)).not.toMatch(/failedLoginAttempts|lockCount|lockUntil/);
    }
  });

  test('parallel guesses cannot slip past the counter (atomic increment)', async () => {
    await Promise.all(Array.from({ length: 5 }, () => login(user.email, 'WrongPass1!')));
    expect(stored(user.email).lockUntil).toBeDefined();
  });
});
