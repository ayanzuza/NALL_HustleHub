/**
 * Income Controller
 * Income is derived from the freelancer's own transaction records, so it
 * is always associated with the correct freelancer (taken from the JWT).
 * Transactions only exist for approved bookings, so rejected and cancelled
 * bookings never count as income.
 */
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const { buildTaxSummary, taxYearOf, supportedTaxYears } = require('../utils/taxEngine');
const { logEvent } = require('../utils/logger');

async function getIncome(req, res, next) {
  try {
    const transactions = await Transaction.find({ freelancer: req.user.id }).sort({ createdAt: -1 });
    const totalCents = transactions.reduce((sum, t) => sum + Math.round(t.amount * 100), 0);

    // Booking pipeline for the dashboard: how many bookings are in each state,
    // and how much money is waiting on the freelancer's approval.
    const bookings = await Booking.find({ freelancer: req.user.id });
    const bookingStatusCounts = { pending: 0, approved: 0, rejected: 0, cancelled: 0, completed: 0 };
    let pendingCents = 0;
    for (const b of bookings) {
      bookingStatusCounts[b.status] = (bookingStatusCounts[b.status] || 0) + 1;
      if (b.status === 'pending') pendingCents += Math.round(b.price * 100);
    }

    return res.status(200).json({
      success: true,
      message: 'Income retrieved',
      data: {
        totalIncome: totalCents / 100,
        currency: 'ZAR',
        transactionCount: transactions.length,
        pendingIncome: pendingCents / 100,
        bookingStatusCounts,
        transactions,
      },
    });
  } catch (err) {
    return next(err);
  }
}

// GET /api/income/tax?taxYear=2027 - income and estimated tax for one tax year.
async function getTaxSummary(req, res, next) {
  try {
    const years = supportedTaxYears();
    const current = taxYearOf(new Date());
    const taxYear = req.query.taxYear || (years.includes(current) ? current : Math.max(...years));

    const transactions = await Transaction.find({ freelancer: req.user.id });
    const summary = buildTaxSummary(transactions, taxYear);

    logEvent('info', 'income.tax_summary_viewed', req, { taxYear });
    return res.status(200).json({
      success: true,
      message: 'Tax estimate retrieved',
      data: { ...summary, availableTaxYears: years },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getIncome, getTaxSummary };
