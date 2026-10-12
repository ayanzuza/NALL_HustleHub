
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

async function listTransactions(req, res, next) {
  try {
    const role = String(req.user.role).toLowerCase();
    let filter;

    if (role === 'client') {
      filter = { clientId: req.user.id };
    } else if (role === 'freelancer') {
      filter = { freelancerId: req.user.id };
    } else {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view transactions'
      });
    }

    const transactions = await Transaction.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Transactions retrieved',
      data: { transactions }
    });
  } catch (err) {
    return next(err);
  }
}

async function getTransaction(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID'
      });
    }

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const userId = String(req.user.id);
    if (
      userId !== String(transaction.clientId) &&
      userId !== String(transaction.freelancerId)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You cannot access this transaction'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Transaction retrieved',
      data: { transaction }
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listTransactions, getTransaction };
