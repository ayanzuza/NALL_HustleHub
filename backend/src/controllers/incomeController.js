
const Transaction = require('../models/Transaction');

async function getIncome(req, res, next) {
  try {
    if (String(req.user.role).toLowerCase() !== 'freelancer') {
      return res.status(403).json({
        success: false,
        message: 'Only freelancers can view their income'
      });
    }

    const transactions = await Transaction.find({
      freelancerId: req.user.id,
      status: 'simulated-paid'
    });

    const totalIncome = transactions.reduce(
      (total, transaction) => total + Number(transaction.amount || 0),
      0
    );

    return res.status(200).json({
      success: true,
      message: 'Freelancer income retrieved',
      data: {
        currency: 'ZAR',
        totalIncome,
        transactionCount: transactions.length,
        transactions
      }
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getIncome };
