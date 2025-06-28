const path = require("path");
const express = require("express");

const app = express();
const morgan = require("morgan");

const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const cors = require("cors");

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

app.use(cors());
app.options("*", cors());

// Serving static files
app.use(express.static(path.join(__dirname, `public`)));

//Devolopment logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const limiter = createRateLimiter({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too Many requests From this Ip , Please Try Again in an Hour",
});

const loginLimiter = createRateLimiter({
  max: 6,
  windowMs: 15 * 60 * 1000,
  message: "Too Many  attempts for Login ,Please Try Again in an 15 MINS ",
});

app.use("/api/v1/users/login", loginLimiter);
app.use("/api", limiter);

//Body parser , reading data from body into req.body
app.use(express.json({ limit: "10kb" })); // we limit the amount of data that comes in the req.body

//Cookie parser , to see the cookies of the users every time they login
app.use(cookieParser());

//Data Sanitization againtst NoSQL query injection
app.use(mongoSanitize());

//Data Sanitization against XXS
app.use(xss());

// Pervent Parameter Pollution
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

app.use(compression());

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
