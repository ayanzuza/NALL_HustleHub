/**
 * Income Controller
 * Income is derived from the freelancer's own transaction records, so it
 * is always associated with the correct freelancer (taken from the JWT).
 */
const Transaction = require('../models/Transaction');

async function getIncome(req, res, next) {
  try {
    const transactions = await Transaction.find({ freelancer: req.user.id }).sort({ createdAt: -1 });
    const totalCents = transactions.reduce((sum, t) => sum + Math.round(t.amount * 100), 0);
    return res.status(200).json({
      success: true,
      message: 'Income retrieved',
      data: {
        totalIncome: totalCents / 100,
        currency: 'ZAR',
        transactionCount: transactions.length,
        transactions,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getIncome };
