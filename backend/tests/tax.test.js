const request = require('supertest');
const app = require('../src/app');
const { TAX_TABLES } = require('../src/config/taxTables');
const { calculateAnnualTaxCents, buildTaxSummary, taxYearOf } = require('../src/utils/taxEngine');
const { Transaction } = require('./support/fakeModels');
const { registerUser, auth } = require('./support/helpers');

const rand = (cents) => cents / 100;
const taxOn = (income, year = 2027) => rand(calculateAnnualTaxCents(Math.round(income * 100), year));

describe('Tax engine - calculation', () => {
  test('no tax at or below the threshold (the primary rebate cancels the first bracket)', () => {
    expect(taxOn(0)).toBe(0);
    expect(taxOn(50000)).toBe(0);
    expect(taxOn(99000)).toBe(0); // 2027 threshold
    expect(taxOn(95750, 2026)).toBe(0); // 2026 threshold
    expect(taxOn(-500)).toBe(0);
  });

  test('worked examples (2027): R300 000 -> R40 572 and R1 000 000 -> R288 293', () => {
    // R300 000: 44 118 + 26% x (300 000 - 245 100) = 58 392, less rebate 17 820
    expect(taxOn(300000)).toBe(40572);
    // R1 000 000: 259 783 + 41% x (1 000 000 - 887 000) = 306 113, less rebate 17 820
    expect(taxOn(1000000)).toBe(288293);
  });

  test('worked example (2026 table): R300 000 -> R41 797', () => {
    // 42 678 + 26% x (300 000 - 237 100) = 59 032, less rebate 17 235
    expect(taxOn(300000, 2026)).toBe(41797);
  });

  test('each bracket base equals the tax on the bracket below it (guards typos in the tax tables)', () => {
    for (const [year, table] of Object.entries(TAX_TABLES)) {
      for (let i = 1; i < table.brackets.length; i += 1) {
        const prev = table.brackets[i - 1];
        const expectedBase = prev.base + (prev.upTo - prev.over) * prev.rate;
        expect({ year, bracket: i, base: table.brackets[i].base }).toEqual({ year, bracket: i, base: Math.round(expectedBase) });
      }
    }
  });

  test('the threshold equals primary rebate / lowest rate', () => {
    for (const table of Object.values(TAX_TABLES)) {
      expect(Math.round(table.rebates.primary / table.brackets[0].rate)).toBe(table.thresholdUnder65);
    }
  });

  test('tax never decreases as income rises, and is continuous across bracket edges', () => {
    let last = 0;
    for (let income = 0; income <= 2000000; income += 12345.67) {
      const t = taxOn(income);
      expect(t).toBeGreaterThanOrEqual(last);
      last = t;
    }
    const edge = TAX_TABLES[2027].brackets[1].over; // 245 100
    expect(taxOn(edge + 0.01) - taxOn(edge)).toBeLessThan(0.02);
  });

  test('an unsupported tax year is an error, not a silent guess', () => {
    expect(() => calculateAnnualTaxCents(100, 1999)).toThrow(RangeError);
    expect(() => buildTaxSummary([], 1999)).toThrow(RangeError);
  });
});

describe('Tax engine - tax years and monthly view', () => {
  test('the tax year changes at midnight SAST on 1 March', () => {
    expect(taxYearOf(new Date('2026-02-28T21:59:59Z'))).toBe(2026); // 28 Feb 23:59:59 SAST
    expect(taxYearOf(new Date('2026-02-28T22:00:00Z'))).toBe(2027); // 1 Mar 00:00:00 SAST
    expect(taxYearOf(new Date('2026-12-31T10:00:00Z'))).toBe(2027);
    expect(taxYearOf(new Date('2027-02-15T10:00:00Z'))).toBe(2027);
  });

  test('only transactions inside the requested tax year are counted', () => {
    const s = buildTaxSummary(
      [
        { amount: 1000, createdAt: '2026-02-28T21:00:00Z' }, // 2026
        { amount: 2000, createdAt: '2026-03-01T08:00:00Z' }, // 2027
        { amount: 4000, createdAt: '2027-02-27T08:00:00Z' }, // 2027
        { amount: 8000, createdAt: '2027-03-02T08:00:00Z' }, // 2028 - not supported, ignored
      ],
      2027
    );
    expect(s.grossIncome).toBe(6000);
    expect(s.transactionCount).toBe(2);
    expect(s.monthly.map((m) => m.month)).toEqual([
      '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08',
      '2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02',
    ]);
  });

  test('monthly income and tax add up exactly to the annual figures', () => {
    const txs = [
      { amount: 123456.78, createdAt: '2026-04-10T10:00:00Z' },
      { amount: 99999.99, createdAt: '2026-08-10T10:00:00Z' },
      { amount: 55555.55, createdAt: '2026-08-20T10:00:00Z' },
      { amount: 33333.33, createdAt: '2027-01-05T10:00:00Z' },
    ];
    const s = buildTaxSummary(txs, 2027);
    const sum = (key) => Math.round(s.monthly.reduce((a, m) => a + Math.round(m[key] * 100), 0));
    expect(sum('income')).toBe(Math.round(s.grossIncome * 100));
    expect(sum('estimatedTax')).toBe(Math.round(s.estimatedTax * 100));
    expect(Math.round((s.grossIncome - s.estimatedTax) * 100)).toBe(Math.round(s.netIncome * 100));
  });

  test('empty year: all zeros, flagged below threshold, no divide-by-zero', () => {
    const s = buildTaxSummary([], 2027);
    expect(s).toMatchObject({ grossIncome: 0, estimatedTax: 0, netIncome: 0, effectiveTaxRate: 0, belowTaxThreshold: true });
    expect(s.monthly).toHaveLength(12);
  });

  test('a summary always carries its assumptions so the dashboard can show them', () => {
    expect(buildTaxSummary([], 2027).assumptions.length).toBeGreaterThan(2);
  });
});

describe('GET /api/income/tax', () => {
  let fl; let client;
  const seed = (freelancerId, amount, createdAt) =>
    Transaction.create({
      reference: `TXN-${Math.random().toString(16).slice(2, 14).toUpperCase()}`,
      booking: 'b', gig: 'g', client: 'c', freelancer: freelancerId, amount,
    }).then((t) => { t.createdAt = new Date(createdAt); return t; });

  beforeEach(async () => {
    fl = await registerUser(app, 'freelancer');
    client = await registerUser(app, 'client');
  });

  test('returns income, estimated tax and net income for the requested tax year', async () => {
    await seed(fl.user.id, 200000, '2026-05-10T10:00:00Z');
    await seed(fl.user.id, 100000, '2026-10-10T10:00:00Z');
    const res = await request(app).get('/api/income/tax?taxYear=2027').set(auth(fl.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      taxYear: 2027,
      currency: 'ZAR',
      grossIncome: 300000,
      estimatedTax: 40572,
      netIncome: 259428,
      belowTaxThreshold: false,
      availableTaxYears: [2026, 2027],
    });
    expect(res.body.data.effectiveTaxRate).toBe(13.52);
    expect(res.body.data.monthly).toHaveLength(12);
  });

  test("never includes another freelancer's income", async () => {
    const other = await registerUser(app, 'freelancer');
    await seed(other.user.id, 500000, '2026-05-10T10:00:00Z');
    const res = await request(app).get('/api/income/tax?taxYear=2027').set(auth(fl.token));
    expect(res.body.data.grossIncome).toBe(0);
  });

  test('without a taxYear it answers for a supported year', async () => {
    const res = await request(app).get('/api/income/tax').set(auth(fl.token));
    expect(res.status).toBe(200);
    expect(res.body.data.availableTaxYears).toContain(res.body.data.taxYear);
  });

  test('freelancer-only: client 403, anonymous 401', async () => {
    expect((await request(app).get('/api/income/tax').set(auth(client.token))).status).toBe(403);
    expect((await request(app).get('/api/income/tax')).status).toBe(401);
  });

  test('invalid taxYear values are rejected (400)', async () => {
    for (const q of ['taxYear=1999', 'taxYear=abc', 'taxYear=2027.5', 'taxYear[$gt]=1', 'taxYear=2027&taxYear=2026']) {
      const res = await request(app).get(`/api/income/tax?${q}`).set(auth(fl.token));
      expect({ q, status: res.status }).toEqual({ q, status: 400 });
    }
  });
});
