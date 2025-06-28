const path = require("path"); // is used to manupulate path names
const express = require("express");

const app = express();
const morgan = require("morgan");

const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");

const createRateLimiter = require("./utils/rateLimiter");
const globalErrorHandler = require("./controllers/errorController");
const AppError = require("./utils/appError");

const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const bookingRouter = require("./routes/bookingRoutes");
const viewRouter = require("./routes/viewRoutes");

//we here need to tell express what engine or what template are we gonna use for to render our page in this case is pug
app.set("view engine", "pug");

//we here need to tell pug where is our views folders
app.set("views", path.join(__dirname, `views`));

//Midllewares

// Serving static files
app.use(express.static(path.join(__dirname, `public`)));

//global middleware function for setting Security HTTP headers
// app.use(
//   helmet.contentSecurityPolicy({
//     directives: {
//       defaultSrc: ["'self'"],
//       scriptSrc: ["'self'", "https://js.stripe.com"],
//       frameSrc: ["'self'", "https://js.stripe.com"], // needed for embedded Stripe checkout
//       connectSrc: ["'self'", "https://api.stripe.com"],
//       objectSrc: ["'none'"],
//     },
//   })
// );

// app.use(helmet());

//Devolopment logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

//global middleware function for ratelimiter => is to count the number of requests coming from one IP and then there's too many request block these requests
const limiter = createRateLimiter({
  max: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: "Too Many requests From this Ip , Please Try Again in an Hour",
});

const loginLimiter = createRateLimiter({
  max: 6,
  windowMs: 15 * 60 * 1000, // 15 mins
  message: "Too Many  attempts for Login ,Please Try Again in an 15 MINS ",
});

app.use("/api/v1/users/login", loginLimiter);
app.use("/api", limiter); // gonna effect all the route that starts with /api

//Body parser , reading data from body into req.body
app.use(express.json({ limit: "10kb" })); // we limit the amount of data that comes in the req.body

//Cookie parser , to see the cookies of the users every time they login
app.use(cookieParser());

//Data Sanitization againtst NoSQL query injection
app.use(mongoSanitize());

//Data Sanitization against XXS
app.use(xss());

// Pervent Parameter Pollution => try to have two of the same params like 2 sorts in the getAllTours route
//we here gonna remove all the duplicate fields and gonna user the last field that the user inputs
app.use(
  hpp({
    whitelist: [
      //this here we allowed  duplicate field in the query string
      "duration",
      "ratingsQuantity",
      "ratingAverage",
      "maxGroupSize",
      "difficulty",
      "price",
    ],
  })
);

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

//View Rout
app.use("/", viewRouter);

//Tours Rout
app.use("/api/v1/tours", tourRouter);

//Users Rout
app.use("/api/v1/users", userRouter);

//Review Rout
app.use("/api/v1/reviews", reviewRouter);
//Bookings Rout
app.use("/api/v1/bookings", bookingRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

//this's an error handler middleware to catch any(operational) error any where in our application
app.use(globalErrorHandler);

module.exports = app;
