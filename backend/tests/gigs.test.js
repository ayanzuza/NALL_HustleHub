const request = require('supertest');
const app = require('../src/app');
const { Gig } = require('./support/fakeModels');
const { registerUser, createAdmin, createGig, auth, gigPayload } = require('./support/helpers');

describe('Gig management and RBAC', () => {
  test('all gig routes require authentication', async () => {
    expect((await request(app).get('/api/gigs')).status).toBe(401);
    expect((await request(app).post('/api/gigs').send(gigPayload())).status).toBe(401);
  });

  test('only freelancers can create gigs; clients get 403', async () => {
    const client = await registerUser(app, 'client');
    const res = await request(app).post('/api/gigs').set(auth(client.token)).send(gigPayload());
    expect(res.status).toBe(403);
    expect(Gig.__all()).toHaveLength(0);
  });

  test('freelancer creates a gig owned by themselves, ignoring a spoofed freelancer field', async () => {
    const fl = await registerUser(app, 'freelancer');
    const other = await registerUser(app, 'freelancer');
    const res = await request(app)
      .post('/api/gigs').set(auth(fl.token))
      .send(gigPayload({ freelancer: other.user.id, status: 'paused' }));
    expect(res.status).toBe(201);
    expect(res.body.data.gig.freelancer).toBe(fl.user.id);
    expect(res.body.data.gig.status).toBe('active');
  });

  test('validation: bad price, bad category, short title -> 400', async () => {
    const fl = await registerUser(app, 'freelancer');
    for (const bad of [{ price: -5 }, { price: 'abc' }, { category: 'hacking' }, { title: 'ab' }]) {
      const res = await request(app).post('/api/gigs').set(auth(fl.token)).send(gigPayload(bad));
      expect(res.status).toBe(400);
    }
  });

  test('clients can browse active gigs, filter by category, and paginate', async () => {
    const fl = await registerUser(app, 'freelancer');
    const client = await registerUser(app, 'client');
    await createGig(app, fl.token, { title: 'Design one' });
    await createGig(app, fl.token, { title: 'Dev one', category: 'development' });
    const paused = await createGig(app, fl.token, { title: 'Hidden gig' });
    await request(app).put(`/api/gigs/${paused.id}`).set(auth(fl.token)).send({ status: 'paused' });

    const all = await request(app).get('/api/gigs').set(auth(client.token));
    expect(all.body.data.gigs.map((g) => g.title).sort()).toEqual(['Design one', 'Dev one']);
    const dev = await request(app).get('/api/gigs?category=development').set(auth(client.token));
    expect(dev.body.data.gigs).toHaveLength(1);
    const page = await request(app).get('/api/gigs?limit=1&page=2').set(auth(client.token));
    expect(page.body.data.gigs).toHaveLength(1);
    expect((await request(app).get('/api/gigs?limit=9999').set(auth(client.token))).status).toBe(400);
  });

  test('paused gig is hidden from clients but visible to its owner', async () => {
    const fl = await registerUser(app, 'freelancer');
    const client = await registerUser(app, 'client');
    const gig = await createGig(app, fl.token);
    await request(app).put(`/api/gigs/${gig.id}`).set(auth(fl.token)).send({ status: 'paused' });
    expect((await request(app).get(`/api/gigs/${gig.id}`).set(auth(client.token))).status).toBe(404);
    expect((await request(app).get(`/api/gigs/${gig.id}`).set(auth(fl.token))).status).toBe(200);
  });

  test('a freelancer can update and delete their own gig', async () => {
    const fl = await registerUser(app, 'freelancer');
    const gig = await createGig(app, fl.token);
    const upd = await request(app).put(`/api/gigs/${gig.id}`).set(auth(fl.token)).send({ price: 750 });
    expect(upd.status).toBe(200);
    expect(upd.body.data.gig.price).toBe(750);
    const del = await request(app).delete(`/api/gigs/${gig.id}`).set(auth(fl.token));
    expect(del.status).toBe(200);
    expect(Gig.__all()).toHaveLength(0);
  });

  test('a freelancer CANNOT modify or delete another freelancer\'s gig (403)', async () => {
    const owner = await registerUser(app, 'freelancer');
    const intruder = await registerUser(app, 'freelancer');
    const gig = await createGig(app, owner.token);
    const upd = await request(app).put(`/api/gigs/${gig.id}`).set(auth(intruder.token)).send({ price: 1 });
    const del = await request(app).delete(`/api/gigs/${gig.id}`).set(auth(intruder.token));
    expect(upd.status).toBe(403);
    expect(del.status).toBe(403);
    expect(Gig.__all()[0].price).toBe(500);
  });

  test('update cannot reassign ownership via the request body', async () => {
    const fl = await registerUser(app, 'freelancer');
    const other = await registerUser(app, 'freelancer');
    const gig = await createGig(app, fl.token);
    await request(app).put(`/api/gigs/${gig.id}`).set(auth(fl.token)).send({ freelancer: other.user.id, price: 600 });
    expect(String(Gig.__all()[0].freelancer)).toBe(fl.user.id);
  });

  test('clients cannot update or delete gigs; invalid ids -> 400; unknown id -> 404', async () => {
    const fl = await registerUser(app, 'freelancer');
    const client = await registerUser(app, 'client');
    const gig = await createGig(app, fl.token);
    expect((await request(app).put(`/api/gigs/${gig.id}`).set(auth(client.token)).send({ price: 2 })).status).toBe(403);
    expect((await request(app).delete(`/api/gigs/${gig.id}`).set(auth(client.token))).status).toBe(403);
    expect((await request(app).get('/api/gigs/not-an-id').set(auth(client.token))).status).toBe(400);
    expect((await request(app).get('/api/gigs/64b64b64b64b64b64b64b64b').set(auth(client.token))).status).toBe(404);
  });

  test('/mine returns only the caller\'s gigs and is freelancer-only', async () => {
    const a = await registerUser(app, 'freelancer');
    const b = await registerUser(app, 'freelancer');
    const client = await registerUser(app, 'client');
    await createGig(app, a.token, { title: 'A gig' });
    await createGig(app, b.token, { title: 'B gig' });
    const mine = await request(app).get('/api/gigs/mine').set(auth(a.token));
    expect(mine.body.data.gigs.map((g) => g.title)).toEqual(['A gig']);
    expect((await request(app).get('/api/gigs/mine').set(auth(client.token))).status).toBe(403);
  });

  test('admin can moderate (remove) any gig; non-admins cannot use admin routes', async () => {
    const fl = await registerUser(app, 'freelancer');
    const admin = await createAdmin(app);
    const gig = await createGig(app, fl.token);
    expect((await request(app).delete(`/api/admin/gigs/${gig.id}`).set(auth(fl.token))).status).toBe(403);
    expect((await request(app).get('/api/admin/users').set(auth(fl.token))).status).toBe(403);
    const users = await request(app).get('/api/admin/users').set(auth(admin.token));
    expect(users.status).toBe(200);
    expect(JSON.stringify(users.body)).not.toMatch(/passwordHash/);
    expect((await request(app).delete(`/api/admin/gigs/${gig.id}`).set(auth(admin.token))).status).toBe(200);
    expect(Gig.__all()).toHaveLength(0);
  });
});
