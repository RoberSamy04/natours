const { StatusCodes } = require("http-status-codes");
const Review = require("../models/reviewModel");
const factory = require("./handlerFactory");
const Booking = require("../models/bookingModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.setTourUserIds = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourid;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

// only users who have booked a tour can leave a review on it
exports.checkBookingOnUser = catchAsync(async (req, res, next) => {
  if (!req.body.user || !req.body.tour) {
    throw new AppError(
      "User and tour information is required",
      StatusCodes.BAD_REQUEST
    );
  }
  const booking = await Booking.findOne({
    user: req.body.user,
    tour: req.body.tour,
  });
  if (!booking) {
    throw new AppError(
      "you need to book the tour first to make a review",
      StatusCodes.FORBIDDEN
    );
  }
  next();
});

exports.createReview = factory.createOne(Review);

exports.getReview = factory.getOne(Review);

exports.getAllReviews = factory.getAll(Review);

exports.deleteReview = factory.deletOne(Review);

exports.updateReview = factory.updateOne(Review);
