const { StatusCodes } = require("http-status-codes");
const Tour = require("../models/tourModel");
const catchAsync = require("../utils/catchAsync");
const Booking = require("../models/bookingModel");
const AppError = require("../utils/appError");

exports.getOverview = catchAsync(async (req, res) => {
  //1) Get Tour Data from collection
  const tours = await Tour.find();
  //2) Build Template

  //3) Render that template using tour data from step  1
  res.status(200).render("overview", { title: "All tours", tours });
});

exports.getTour = catchAsync(async (req, res) => {
  //1) GET the data , for the requested tour (including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: "reviews",
    fields: "review rating user",
  });

  if (!tour) {
    throw new AppError(
      "There is no Tour with that name ",
      StatusCodes.NOT_FOUND
    );
  }
  //2) Build template

  //3) Render template using data from step 1
  res.status(200).render("tour", { title: `${tour.name} Tour`, tour });
});

exports.getLoginForm = catchAsync(async (req, res) => {
  res.status(200).render("login", { title: `log into your account` });
});

exports.getSignupForm = catchAsync(async (req, res) => {
  res.status(200).render("signup", { title: `Create your account` });
});

exports.getEmailVerification = catchAsync(async (req, res) => {
  res.status(200).render("emailVerificationSuccess");
});

exports.getAccount = (req, res) => {
  res.status(200).render("account", { title: `your account` });
};

// we here render myBookings in the user's profile
exports.getMyTours = catchAsync(async (req, res) => {
  // we can use virtual populate and call it a day... but he likes to ... you know

  //1) Find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  //2) Find tous with the returned IDs
  const tourIds = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIds } });

  res.status(StatusCodes.OK).render("overview", {
    title: "My Tours",
    tours,
  });
});
