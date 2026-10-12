const request = require('supertest');
const app = require('../src/app');
const {
  auth,
  gigPayload,
  registerUser,
  createGig
} = require('./support/helpers');
const { Gig } = require('./support/fakeModels');

describe('Gig Management', () => {
  test('freelancer can create a gig', async () => {
    const { token, user } = await registerUser(app, 'freelancer');

    const res = await request(app)
      .post('/api/gigs')
      .set(auth(token))
      .send(gigPayload());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.gig.freelancer).toBe(user.id);
  });

  test('client cannot create a gig', async () => {
    const { token } = await registerUser(app, 'client');

    const res = await request(app)
      .post('/api/gigs')
      .set(auth(token))
      .send(gigPayload());

    expect(res.status).toBe(403);
  });

  test('invalid price is rejected', async () => {
    const { token } = await registerUser(app, 'freelancer');

    const res = await request(app)
      .post('/api/gigs')
      .set(auth(token))
      .send(gigPayload({ price: -5 }));

    expect(res.status).toBe(400);
  });

  test('script tags are removed from the title', async () => {
    const { token } = await registerUser(app, 'freelancer');

    const res = await request(app)
      .post('/api/gigs')
      .set(auth(token))
      .send(
        gigPayload({
          title: '<script>alert(1)</script>Banner design'
        })
      );

    expect(res.status).toBe(201);
    expect(res.body.data.gig.title).toBe('Banner design');
    expect(res.body.data.gig.title).not.toMatch(/<script/i);
  });

  test('users can browse active gigs', async () => {
    const { token } = await registerUser(app, 'client');
    const { token: freelancerToken } =
      await registerUser(app, 'freelancer');

    const gig = await createGig(app, freelancerToken);

    const res = await request(app)
      .get('/api/gigs')
      .set(auth(token));

    expect(res.status).toBe(200);
    expect(
      res.body.data.gigs.map((item) => item.id)
    ).toContain(gig.id);
  });

  test('invalid list query is rejected', async () => {
    const res = await request(app)
      .get('/api/gigs?limit=9999');

    expect(res.status).toBe(400);
  });

  test('single gig can be retrieved', async () => {
    const { token } = await registerUser(app, 'freelancer');
    const gig = await createGig(app, token);

    const res = await request(app)
      .get(`/api/gigs/${gig.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.gig.id).toBe(gig.id);
  });

  test('malformed gig ID returns 400', async () => {
    const res = await request(app)
      .get('/api/gigs/not-an-id');

    expect(res.status).toBe(400);
  });

  test('freelancer B cannot update freelancer A gig', async () => {
    const { token: tokenA } =
      await registerUser(app, 'freelancer');

    const { token: tokenB } =
      await registerUser(app, 'freelancer');

    const gig = await createGig(app, tokenA);

    const res = await request(app)
      .put(`/api/gigs/${gig.id}`)
      .set(auth(tokenB))
      .send({ price: 1 });

    expect(res.status).toBe(403);
  });

  test('freelancer A can update own gig', async () => {
    const { token } =
      await registerUser(app, 'freelancer');

    const gig = await createGig(app, token);

    const res = await request(app)
      .put(`/api/gigs/${gig.id}`)
      .set(auth(token))
      .send({ price: 600 });

    expect(res.status).toBe(200);
    expect(res.body.data.gig.price).toBe(600);
  });

  test('update cannot reassign ownership', async () => {
    const { token: tokenA, user: userA } =
      await registerUser(app, 'freelancer');

    const { user: userB } =
      await registerUser(app, 'freelancer');

    const gig = await createGig(app, tokenA);

    const res = await request(app)
      .put(`/api/gigs/${gig.id}`)
      .set(auth(tokenA))
      .send({
        freelancerId: userB.id,
        freelancer: userB.id,
        price: 600
      });

    expect(res.status).toBe(200);
    expect(res.body.data.gig.freelancer).toBe(userA.id);
  });

  test('freelancer can list their own gigs', async () => {
    const { token } =
      await registerUser(app, 'freelancer');

    const gig = await createGig(app, token);

    const res = await request(app)
      .get('/api/gigs/mine')
      .set(auth(token));

    expect(res.status).toBe(200);
    expect(
      res.body.data.gigs.every(
        (item) => item.freelancer === gig.freelancer
      )
    ).toBe(true);
  });

  test('freelancer B cannot delete freelancer A gig', async () => {
    const { token: tokenA } =
      await registerUser(app, 'freelancer');

    const { token: tokenB } =
      await registerUser(app, 'freelancer');

    const gig = await createGig(app, tokenA);

    const res = await request(app)
      .delete(`/api/gigs/${gig.id}`)
      .set(auth(tokenB));

    expect(res.status).toBe(403);
  });

  test('freelancer A can delete own gig', async () => {
    const { token } =
      await registerUser(app, 'freelancer');

    const gig = await createGig(app, token);

    const res = await request(app)
      .delete(`/api/gigs/${gig.id}`)
      .set(auth(token));

    expect(res.status).toBe(200);

    const deleted = await request(app)
      .get(`/api/gigs/${gig.id}`);

    expect(deleted.status).toBe(404);
  });

  test('deleted gig is no longer stored', async () => {
    const { token } =
      await registerUser(app, 'freelancer');

    const gig = await createGig(app, token);

    await request(app)
      .delete(`/api/gigs/${gig.id}`)
      .set(auth(token));

    expect(
      Gig.__all().find((item) => item.id === gig.id)
    ).toBeUndefined();
  });
});