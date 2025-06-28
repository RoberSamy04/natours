const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { StatusCodes } = require("http-status-codes");
const catchAsync = require("../utils/catchAsync");

const factory = require("./handlerFactory");
const Tour = require("../models/tourModel");
const Booking = require("../models/bookingModel");

exports.getCheckoutSession = catchAsync(async (req, res) => {
  //1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourID);
  //2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    //information about the session
    payment_method_types: ["card"],
    success_url: `${req.protocol}://${req.get("host")}/?tour=${req.params.tourID}&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get("host")}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourID,

    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: tour.price * 100, //the amount here in centes
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
          },
        },
        quantity: 1,
      },
    ],
    mode: "payment",
  });

  //3)  create session as response
  res.status(StatusCodes.OK).json({
    status: "success",
    session,
  });
});

// save the checkout info in the booking model
exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  const { tour, user, price } = req.query;
  if (!tour && !user && !price) {
    return next();
  }

  await Booking.create({ tour, user, price });

  res.redirect(req.originalUrl.split("?")[0]);
  next();
});

exports.getAllBookings = factory.getAll(Booking);
exports.getBooking = factory.getOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.createBooking = factory.createOne(Booking);
exports.deleteBooking = factory.deletOne(Booking);
