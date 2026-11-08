## Tax Estimation and Income Insights

### What it does

Freelancers see how much they have earned and a rough estimate of the income tax on it. The estimate uses the South African individual income tax tables published by SARS (2026) and is for guidance only; it is not tax advice and not a SARS assessment.

Endpoints (freelancer only): `GET /api/income` (totals, bookings waiting for approval) and `GET /api/income/tax?taxYear=2027` (gross income, estimated tax, net income, month-by-month figures).

### Where the income comes from

Income is the sum of the freelancer's **transaction records**. A transaction is only created when the freelancer **approves** a booking, so rejected and cancelled bookings never count as income, and a booking still waiting for approval is shown separately as "pending income". The freelancer is always taken from the verified JWT, never from the request, so nobody can read another freelancer's income.

### The calculation

South Africa taxes income in bands (brackets): the more you earn, the higher the rate on the part of income that falls in each band. Every band has a base amount (the tax on all income below the band) so only one multiplication is needed:

```
normal tax    = base of the band + rate x (income - start of the band)
estimated tax = normal tax - primary rebate          (never below zero)
net income    = gross income - estimated tax
```

Tax year 2027 (1 March 2026 to 28 February 2027):

| Taxable income (R) | Rate | Base amount (R) |
|---|---|---|
| 0 - 245 100 | 18% | 0 |
| 245 101 - 383 100 | 26% | 44 118 |
| 383 101 - 530 200 | 31% | 79 998 |
| 530 201 - 695 800 | 36% | 125 599 |
| 695 801 - 887 000 | 39% | 185 215 |
| 887 001 - 1 878 600 | 41% | 259 783 |
| 1 878 601 and above | 45% | 666 339 |

The primary rebate is R17 820, so a person under 65 pays no tax on the first R99 000 (R17 820 / 18%). The 2026 table (R17 235 rebate, R95 750 threshold) is also supported, so earlier income can be viewed.

**Worked example.** Gross income of R300 000 in tax year 2027 falls in the 26% band:
44 118 + 26% x (300 000 - 245 100) = 44 118 + 14 274 = R58 392. Less the R17 820 rebate gives **R40 572** estimated tax, R259 428 net income, and an effective rate of 13.52% (40 572 / 300 000).

**Monthly view.** The year's effective rate is applied to each month's income so the dashboard can chart it. The last month with income absorbs any rounding difference, so the twelve months always add up exactly to the annual figures.

### Tax years and dates

A tax year is named after the year it ends in and runs from 1 March to the end of February. Each transaction is placed in a tax year by the date it was recorded, in South African time (UTC+2), so a payment recorded just after midnight on 1 March belongs to the new tax year.

### Design decisions

- **Whole cents.** All maths is done in integer cents, so values like 0.1 + 0.2 never produce rounding drift in financial figures.
- **Tables in configuration.** Brackets and rebates live in `src/config/taxTables.js`, separate from the calculation code (`src/utils/taxEngine.js`). A new tax year is a data change, not a code change.
- **Pure functions.** The engine has no database access, so it is easy to test in isolation.
- **Unsupported years are an error**, never a silent guess; the API returns 400 for a tax year it has no table for.

### Assumptions and limitations (shown to the user on the dashboard)

The estimate assumes the freelancer is under 65, that this is their only income, and that no deductions apply. It does not include medical tax credits, retirement contributions, business expenses, provisional-tax payments or the age-based rebates. Real tax would normally be lower once expenses are deducted.

### Testing

`tests/tax.test.js` checks the worked examples above, that the tax at the top of each band equals the base of the next band (this catches typing mistakes in the tables), that tax never falls as income rises, the 1 March boundary in South African time, that monthly figures add up to the annual total, and that the endpoint is freelancer-only and rejects invalid tax years.

### References

SARS (2026) *Rates of tax for individuals*. Available at: https://www.sars.gov.za/tax-rates/income-tax/rates-of-tax-for-individuals/ (Accessed: 8 November 2026).
