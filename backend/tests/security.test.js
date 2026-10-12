const request = require('supertest');
const app = require('../src/app');
const { Gig } = require('./support/fakeModels');
const { registerUser, createGig, auth, gigPayload } = require('./support/helpers');

describe('Security headers, CORS, sanitisation and safe errors', () => {
  test('Helmet + Content-Security-Policy headers are present on every response', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers['strict-transport-security']).toMatch(/max-age=31536000/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('CORS allows only the configured frontend origin', async () => {
    const ok = await request(app).get('/api/health').set('Origin', 'http://localhost:3000');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    const evil = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('HTML/script in free-text fields is stripped before storage (stored XSS)', async () => {
    const fl = await registerUser(app, 'freelancer');
    const gig = await createGig(app, fl.token, {
      title: '<script>alert(1)</script>Logo <b>pro</b>',
      description: 'Great work <img src=x onerror=alert(1)> guaranteed here.',
    });
    expect(gig.title).toBe('Logo pro');
    expect(gig.description).not.toMatch(/<|onerror/);
  });

  test('Mongo operator keys in the body are removed', async () => {
    const fl = await registerUser(app, 'freelancer');
    const res = await request(app).post('/api/gigs').set(auth(fl.token)).send(gigPayload({ $where: 'sleep(1000)', 'a.b': 1 }));
    expect(res.status).toBe(201);
    expect(JSON.stringify(Gig.__all()[0])).not.toMatch(/\$where|a\.b/);
  });

  test('malformed JSON returns a safe generic message (no parser internals)', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: 'Malformed JSON in request body' });
  });

  test('oversized bodies are rejected with 413', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'x'.repeat(20000) });
    expect(res.status).toBe(413);
  });

  test('unknown routes return a clean 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'Resource not found' });
  });
});
