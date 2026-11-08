jest.setTimeout(30000);

const { Writable } = require('stream');
const winston = require('winston');
const request = require('supertest');
const app = require('../src/app');
const { logger, redact, fingerprint } = require('../src/utils/logger');
const { Transaction } = require('./support/fakeModels');
const { registerUser, createGig, auth, PASSWORD } = require('./support/helpers');

// Every event Winston was asked to write: [{ level, event, ...meta }]
let spy;
beforeEach(() => { spy = jest.spyOn(logger, 'log'); });
afterEach(() => { spy.mockRestore(); });
const events = () => spy.mock.calls.map(([level, event, meta]) => ({ level, event, ...meta }));
const find = (name) => events().filter((e) => e.event === name);

describe('redaction', () => {
  test('sensitive keys are masked at any depth; ordinary values are untouched', () => {
    const out = redact({
      password: 'hunter2', newPassword: 'x', token: 't', authorization: 'Bearer abc', jwtSecret: 's',
      passwordHash: '$2a$12$abc', cookie: 'c',
      nested: { accessToken: 'a', ok: 'fine', deeper: [{ Password: 'p', keep: 1 }] },
      amount: 42,
    });
    expect(out.password).toBe('[REDACTED]');
    expect(out.newPassword).toBe('[REDACTED]');
    expect(out.token).toBe('[REDACTED]');
    expect(out.authorization).toBe('[REDACTED]');
    expect(out.jwtSecret).toBe('[REDACTED]');
    expect(out.passwordHash).toBe('[REDACTED]');
    expect(out.cookie).toBe('[REDACTED]');
    expect(out.nested.accessToken).toBe('[REDACTED]');
    expect(out.nested.ok).toBe('fine');
    expect(out.nested.deeper[0]).toEqual({ Password: '[REDACTED]', keep: 1 });
    expect(out.amount).toBe(42);
  });

  test('the real Winston pipeline applies redaction and writes one JSON object', () => {
    const info = logger.format.transform({ level: 'info', message: 'x', event: 'e', password: 'hunter2', token: 'abc.def' }, logger.format.options);
    const line = info[Symbol.for('message')];
    expect(line).not.toMatch(/hunter2|abc\.def/);
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({ event: 'e', level: 'info', password: '[REDACTED]'});
    expect(parsed.timestamp).toBeDefined();
  });

  test('entries really reach a transport (not just the logger call), as redacted JSON with service name', async () => {
    spy.mockRestore(); // use the real logger.log for this test
    const lines = [];
    const stream = new Writable({ write(chunk, _enc, cb) { lines.push(chunk.toString()); cb(); } });
    const transport = new winston.transports.Stream({ stream });
    logger.add(transport);
    logger.log('warn', 'auth.login_failed', { event: 'auth.login_failed', reason: 'bad_password', password: 'hunter2', requestId: 'r1' });
    await new Promise((resolve) => setImmediate(resolve));
    logger.remove(transport);
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({ level: 'warn', event: 'auth.login_failed', reason: 'bad_password', requestId: 'r1', service: 'hustlehub-api', password: '[REDACTED]' });
    expect(entry.timestamp).toBeDefined();
    expect(lines[0]).not.toContain('hunter2');
    spy = jest.spyOn(logger, 'log'); // restore the spy for afterEach
  });

  test('email fingerprints are stable, case-insensitive and do not contain the address', () => {
    expect(fingerprint('Wabo@Example.com')).toBe(fingerprint(' wabo@example.com '));
    expect(fingerprint('a@example.com')).not.toBe(fingerprint('b@example.com'));
    expect(fingerprint('wabo@example.com')).toMatch(/^[0-9a-f]{12}$/);
    expect(fingerprint(undefined)).toBeUndefined();
  });
});

describe('key events are logged', () => {
  test('registration, successful login and logout', async () => {
    const u = await registerUser(app, 'freelancer');
    const login = await request(app).post('/api/auth/login').send({ email: u.email, password: PASSWORD });
    await request(app).post('/api/auth/logout').set(auth(login.body.data.token));
    expect(find('auth.register')).toHaveLength(1);
    expect(find('auth.login_success')).toHaveLength(1);
    expect(find('auth.logout')).toHaveLength(1);
    expect(find('auth.login_success')[0]).toMatchObject({ level: 'info', loggedInRole: 'freelancer' });
  });

  test('failed logins record the reason and a fingerprint - never the password or the raw email', async () => {
    const u = await registerUser(app, 'client');
    await request(app).post('/api/auth/login').send({ email: u.email, password: 'WrongPass1!' });
    await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'WrongPass1!' });
    const failed = find('auth.login_failed');
    expect(failed.map((f) => f.reason)).toEqual(['bad_password', 'unknown_user']);
    expect(failed.every((f) => f.level === 'warn' && f.emailId && f.requestId && f.ip)).toBe(true);
    const everything = JSON.stringify(events());
    expect(everything).not.toContain('WrongPass1!');
    expect(everything).not.toContain(PASSWORD);
    expect(everything).not.toContain(u.email);
    expect(everything).not.toContain('ghost@example.com');
  });

  test('account lockout is logged as a warning', async () => {
    const u = await registerUser(app, 'client');
    for (let i = 0; i < 5; i += 1) await request(app).post('/api/auth/login').send({ email: u.email, password: 'WrongPass1!' });
    await request(app).post('/api/auth/login').send({ email: u.email, password: PASSWORD });
    expect(find('auth.account_locked')).toHaveLength(1);
    expect(find('auth.account_locked')[0]).toMatchObject({ level: 'warn', lockMinutes: 15 });
    expect(find('auth.login_blocked')[0]).toMatchObject({ reason: 'account_locked' });
  });

  test('bookings and transactions: created, approved, transaction recorded - with ids and amounts', async () => {
    const fl = await registerUser(app, 'freelancer');
    const client = await registerUser(app, 'client');
    const gig = await createGig(app, fl.token, { price: 900 });
    const b = (await request(app).post('/api/bookings').set(auth(client.token)).send({ gigId: gig.id })).body.data.booking;
    await request(app).patch(`/api/bookings/${b.id}/approve`).set(auth(fl.token)).send({});
    expect(find('booking.created')[0]).toMatchObject({ bookingId: b.id, amount: 900, userId: client.user.id, role: 'client' });
    expect(find('booking.approved')[0]).toMatchObject({ bookingId: b.id, from: 'pending', userId: fl.user.id });
    expect(find('transaction.created')[0]).toMatchObject({ bookingId: b.id, amount: 900, freelancerId: fl.user.id });
  });

  test('access-control failures and rejected tokens are logged', async () => {
    const fl = await registerUser(app, 'freelancer');
    const client = await registerUser(app, 'client');
    await request(app).get('/api/income').set(auth(client.token)); // wrong role
    await request(app).get('/api/users/me').set(auth('garbage.token.value'));
    expect(find('authz.denied')[0]).toMatchObject({ level: 'warn', role: 'client', path: '/api/income' });
    expect(find('auth.token_rejected')[0]).toMatchObject({ level: 'warn', reason: 'invalid' });
    expect(fl).toBeDefined();
  });

  test('unexpected errors are logged at error level with detail, while the client gets only a generic message', async () => {
    const fl = await registerUser(app, 'freelancer');
    const client = await registerUser(app, 'client');
    const gig = await createGig(app, fl.token);
    const b = (await request(app).post('/api/bookings').set(auth(client.token)).send({ gigId: gig.id })).body.data.booking;
    const txn = jest.spyOn(Transaction, 'create').mockRejectedValueOnce(new Error('connection refused to 10.0.0.5:27017'));
    const res = await request(app).patch(`/api/bookings/${b.id}/approve`).set(auth(fl.token)).send({});
    txn.mockRestore();
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/10\.0\.0\.5|connection refused/);
    const logged = find('error.handled').find((e) => e.status === 500);
    expect(logged).toMatchObject({ level: 'error', errorMessage: 'connection refused to 10.0.0.5:27017', path: `/api/bookings/${b.id}/approve` });
    expect(logged.requestId).toBeDefined();
  });

  test('query strings are never written to the log (paths only)', async () => {
    const fl = await registerUser(app, 'freelancer');
    await request(app).get('/api/income/tax?taxYear=1999&secret=abc').set(auth(fl.token));
    await request(app).get('/api/income/tax?taxYear=1999&secret=abc').set(auth(fl.token));
    expect(JSON.stringify(events())).not.toContain('secret=abc');
  });
});
