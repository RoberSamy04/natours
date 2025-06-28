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
    payment_method_types: ["card"], //credit card
    //when we user buys the tour it's gonna be on this success_url and then we want to store the data in the booking model (it just a work around bcs we didnt deploy our website yet) NOT SECURE
    success_url: `${req.protocol}://${req.get("host")}/?tour=${req.params.tourID}&user=${req.user.id}&price=${tour.price}`, //the URL that will get called as soon as credit has been successfully charged
    cancel_url: `${req.protocol}://${req.get("host")}/tour/${tour.slug}`, // the page that we be displayed if the user cancel the payment
    customer_email: req.user.email, //we got access to that bcs it's a protected route so we have it on req.email
    client_reference_id: req.params.tourID, //this field is gonna allow is to pass in some data about the session that we are currently creating
    //that's important bcs later once the purchase was successful we will then get access to the session object again and by then we want to create a new booking in our database
    //to create a newBookings we will need the (userID , tourID , price) (we need to do this once the website is deployed)

    line_items: [
      {
        //we here just put some data on the tour that the user buys ( data on the product)
        // all the data here stripe expicts from us we dont have a choice here
        price_data: {
          currency: "usd",
          unit_amount: tour.price * 100, //bcs the amount here in centes
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://www.natours.dev/img/tours/${tour.imageCover}`], // he here expicts the deployed website image( means we need to do this once the website is deployed)
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
  //this only TEMPORARY , becuase it's UNSECURE : everyone can make bookings without paying
  const { tour, user, price } = req.query; // the query string on the success_url
  if (!tour && !user && !price) {
    return next(); // the next here is the overview page in the view routes
  }

  await Booking.create({ tour, user, price });

  // please watch the video to understand why he did that 17-craeting new booking on checkout success
  res.redirect(req.originalUrl.split("?")[0]);
  next();
});

exports.getAllBookings = factory.getAll(Booking);
exports.getBooking = factory.getOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.createBooking = factory.createOne(Booking);
exports.deleteBooking = factory.deletOne(Booking);
