/**
 * South African individual income tax tables, by tax year.
 *
 * Source: SARS "Rates of tax for individuals"
 * https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/
 * (checked 8 November 2026). A tax year is named after the year it ENDS in:
 * 2027 = 1 March 2026 to 28 February 2027.
 *
 * Each bracket: income above `over` (and up to `upTo`) is taxed as
 *   base + rate * (income - over)
 * where `base` is the tax on all income up to `over`.
 *
 * Kept in config (not in the calculation code) so a new year's table is a
 * data change only. These figures are estimates for illustration: they ignore
 * medical credits, retirement-fund deductions, business expenses and age.
 */
const TAX_TABLES = {
  2026: {
    label: '2026 (1 March 2025 - 28 February 2026)',
    brackets: [
      { over: 0, upTo: 237100, rate: 0.18, base: 0 },
      { over: 237100, upTo: 370500, rate: 0.26, base: 42678 },
      { over: 370500, upTo: 512800, rate: 0.31, base: 77362 },
      { over: 512800, upTo: 673000, rate: 0.36, base: 121475 },
      { over: 673000, upTo: 857900, rate: 0.39, base: 179147 },
      { over: 857900, upTo: 1817000, rate: 0.41, base: 251258 },
      { over: 1817000, upTo: Infinity, rate: 0.45, base: 644489 },
    ],
    rebates: { primary: 17235, secondary: 9444, tertiary: 3145 },
    thresholdUnder65: 95750,
  },
  2027: {
    label: '2027 (1 March 2026 - 28 February 2027)',
    brackets: [
      { over: 0, upTo: 245100, rate: 0.18, base: 0 },
      { over: 245100, upTo: 383100, rate: 0.26, base: 44118 },
      { over: 383100, upTo: 530200, rate: 0.31, base: 79998 },
      { over: 530200, upTo: 695800, rate: 0.36, base: 125599 },
      { over: 695800, upTo: 887000, rate: 0.39, base: 185215 },
      { over: 887000, upTo: 1878600, rate: 0.41, base: 259783 },
      { over: 1878600, upTo: Infinity, rate: 0.45, base: 666339 },
    ],
    rebates: { primary: 17820, secondary: 9765, tertiary: 3249 },
    thresholdUnder65: 99000,
  },
};

module.exports = { TAX_TABLES };
