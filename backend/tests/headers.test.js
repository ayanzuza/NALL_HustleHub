const request = require('supertest');
const app = require('../src/app');

// Parses "a 'none'; b 'none'" into { a: ["'none'"], b: ["'none'"] }.
const parseCsp = (header) =>
  Object.fromEntries(header.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const [name, ...values] = d.split(/\s+/);
    return [name, values];
  }));

describe('Content-Security-Policy and extra response headers', () => {
  let res; let csp;
  beforeAll(async () => {
    res = await request(app).get('/api/health');
    csp = parseCsp(res.headers['content-security-policy']);
  });

  test.each([
    'default-src', 'script-src', 'script-src-attr', 'style-src', 'img-src', 'font-src', 'media-src',
    'connect-src', 'object-src', 'frame-src', 'child-src', 'worker-src', 'manifest-src',
    'base-uri', 'form-action', 'frame-ancestors',
  ])("%s is locked down to 'none'", (directive) => {
    expect(csp[directive]).toEqual(["'none'"]);
  });

  test('insecure sub-requests are upgraded to HTTPS', () => {
    expect(csp).toHaveProperty('upgrade-insecure-requests');
  });

  test('no directive allows unsafe-inline, unsafe-eval, wildcards or http: sources', () => {
    const all = res.headers['content-security-policy'];
    expect(all).not.toMatch(/unsafe-inline|unsafe-eval|\*|http:/);
  });

  test('powerful browser features are switched off (Permissions-Policy)', () => {
    const policy = res.headers['permissions-policy'];
    for (const feature of ['camera', 'microphone', 'geolocation', 'payment']) {
      expect(policy).toContain(`${feature}=()`);
    }
  });

  test('responses are never cached (Cache-Control: no-store) so personal data stays off shared caches', () => {
    expect(res.headers['cache-control']).toBe('no-store');
  });

  test('every response carries a server-generated request id, and a client-supplied one is ignored', async () => {
    const a = await request(app).get('/api/health').set('X-Request-Id', 'attacker-chosen');
    const b = await request(app).get('/api/health');
    expect(a.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(a.headers['x-request-id']).not.toBe('attacker-chosen');
    expect(a.headers['x-request-id']).not.toBe(b.headers['x-request-id']);
  });

  test('PATCH is an allowed CORS method for the frontend (needed by the approval buttons)', async () => {
    const pre = await request(app)
      .options('/api/bookings/123/approve')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'PATCH')
      .set('Access-Control-Request-Headers', 'authorization,content-type');
    expect(pre.headers['access-control-allow-methods']).toContain('PATCH');
  });
});
