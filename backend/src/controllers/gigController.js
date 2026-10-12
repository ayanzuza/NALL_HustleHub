
const mongoose = require('mongoose');
const Gig = require('../models/Gig');
const xss = require('xss');

async function listGigs(req, res, next) {
  try {
    const filter = { status: 'active' };

    if (req.query.category) {
      filter.category = req.query.category;
    }

    const gigs = await Gig.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Gigs retrieved',
      data: { gigs }
    });
  } catch (err) {
    return next(err);
  }
}

async function getGig(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig ID'
      });
    }

    const gig = await Gig.findById(req.params.id);

    if (!gig || gig.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Gig not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Gig retrieved',
      data: { gig }
    });
  } catch (err) {
    return next(err);
  }
}

async function createGig(req, res, next) {
  try {
    const { title, description, category, price } = req.body;

    if (
      !title ||
      !description ||
      !category ||
      price === undefined ||
      !Number.isFinite(Number(price)) ||
      Number(price) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid title, description, category and price are required'
      });
    }

    const gig = await Gig.create({
  title: xss(title, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script'] }).trim(),
  description: xss(description, { whiteList: {}, stripIgnoreTag: true, stripIgnoreTagBody: ['script'] }).trim(),
  category,
  price: Number(price),
  freelancerId: req.user.id,
  status: 'active'
});

    return res.status(201).json({
      success: true,
      message: 'Gig created',
      data: { gig }
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listGigs, getGig, createGig };
