/**
 * Tax estimation engine (pure functions - no database, easy to unit test).
 *
 * Method (all money handled in whole cents to avoid floating point drift):
 *  1. Taxable income = the freelancer's gross income for the tax year
 *     (the sum of their transaction amounts dated inside that year).
 *  2. Normal tax = bracket base + rate * (income above the bracket start).
 *  3. Estimated tax = normal tax - primary rebate, never below zero.
 *  4. Net income = gross income - estimated tax.
 *  5. Monthly view: the year's effective rate (tax / gross) is applied to each
 *     month's income, so the monthly figures always add up to the annual tax.
 *
 * Assumptions (also shown to the user): under 65, no deductions or credits,
 * and no other income.
 */
const { TAX_TABLES } = require('../config/taxTables');

const SAST_OFFSET_MS = 2 * 60 * 60 * 1000; // South Africa is UTC+2 all year (no DST)
const toCents = (rand) => Math.round(rand * 100);
const toRand = (cents) => cents / 100;

// A date in SAST, expressed as year + zero-based month.
function sastParts(date) {
  const d = new Date(date.getTime() + SAST_OFFSET_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

// Tax year a date falls in: March..December belong to the NEXT calendar year's tax year.
function taxYearOf(date) {
  const { year, month } = sastParts(date);
  return month >= 2 ? year + 1 : year;
}

// The 12 months of a tax year in order: March (year-1) .. February (year).
function monthsOfTaxYear(taxYear) {
  return Array.from({ length: 12 }, (_, i) => {
    const month = (2 + i) % 12;
    const year = month >= 2 ? taxYear - 1 : taxYear;
    return { key: `${year}-${String(month + 1).padStart(2, '0')}`, year, month };
  });
}

function supportedTaxYears() {
  return Object.keys(TAX_TABLES).map(Number);
}

/** Estimated annual tax in cents for a given taxable income (in cents). */
function calculateAnnualTaxCents(taxableCents, taxYear) {
  const table = TAX_TABLES[taxYear];
  if (!table) throw new RangeError(`No tax table for ${taxYear}`);
  if (taxableCents <= 0) return 0;

  const bracket = table.brackets.find((b) => taxableCents <= toCents(b.upTo));
  const normalTaxCents = toCents(bracket.base) + Math.round((taxableCents - toCents(bracket.over)) * bracket.rate);
  return Math.max(0, normalTaxCents - toCents(table.rebates.primary));
}

/**
 * Builds the full summary for one tax year.
 * @param {Array<{amount:number, createdAt:Date|string}>} transactions the freelancer's transactions
 */
function buildTaxSummary(transactions, taxYear) {
  const table = TAX_TABLES[taxYear];
  if (!table) throw new RangeError(`No tax table for ${taxYear}`);

  const months = monthsOfTaxYear(taxYear).map((m) => ({ ...m, incomeCents: 0, count: 0 }));
  const byKey = Object.fromEntries(months.map((m) => [m.key, m]));

  let grossCents = 0;
  let count = 0;
  for (const t of transactions) {
    const when = new Date(t.createdAt);
    if (taxYearOf(when) !== taxYear) continue;
    const { year, month } = sastParts(when);
    const bucket = byKey[`${year}-${String(month + 1).padStart(2, '0')}`];
    const cents = toCents(t.amount);
    bucket.incomeCents += cents;
    bucket.count += 1;
    grossCents += cents;
    count += 1;
  }

  const taxCents = calculateAnnualTaxCents(grossCents, taxYear);
  const effectiveRate = grossCents > 0 ? taxCents / grossCents : 0;

  // Allocate tax to months by effective rate; the last month with income
  // absorbs any rounding difference so the months add up to the annual total.
  let allocated = 0;
  const lastIncomeIdx = months.reduce((idx, m, i) => (m.incomeCents > 0 ? i : idx), -1);
  const monthly = months.map((m, i) => {
    const monthTax = i === lastIncomeIdx ? taxCents - allocated : Math.round(m.incomeCents * effectiveRate);
    allocated += m.incomeCents > 0 && i !== lastIncomeIdx ? monthTax : 0;
    return {
      month: m.key,
      transactionCount: m.count,
      income: toRand(m.incomeCents),
      estimatedTax: toRand(m.incomeCents > 0 ? monthTax : 0),
      netIncome: toRand(m.incomeCents - (m.incomeCents > 0 ? monthTax : 0)),
    };
  });

  return {
    taxYear,
    taxYearLabel: table.label,
    currency: 'ZAR',
    transactionCount: count,
    grossIncome: toRand(grossCents),
    estimatedTax: toRand(taxCents),
    netIncome: toRand(grossCents - taxCents),
    effectiveTaxRate: Math.round(effectiveRate * 10000) / 100, // percent, 2 dp
    belowTaxThreshold: toRand(grossCents) <= table.thresholdUnder65,
    taxThreshold: table.thresholdUnder65,
    monthly,
    assumptions: [
      'Estimate only - not tax advice and not a SARS assessment.',
      'Assumes the taxpayer is under 65 and this is their only income.',
      'No deductions, medical credits or other rebates are applied; only the primary rebate is.',
      'Income is counted from approved bookings, by the date the transaction was recorded (SAST).',
    ],
  };
}

module.exports = { buildTaxSummary, calculateAnnualTaxCents, taxYearOf, supportedTaxYears, monthsOfTaxYear };
