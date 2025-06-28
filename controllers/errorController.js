const { StatusCodes } = require("http-status-codes");
const AppError = require("../utils/appError");

// 1) invalid ID
const handleCastErrorDB = (error) => {
  const message = `Invalide ${error.path} : ${error.value} `;
  return new AppError(message, StatusCodes.BAD_REQUEST);
};

// 2) Duplicate Fields (same name propertry)
const handleDuplicateFieldsDB = (error) => {
  const message = `Duplicate field value : (${error.keyValue.name} ). Please use another value!`;
  return new AppError(message, StatusCodes.BAD_REQUEST);
};

// 3) Validations Errors (set ratingAverage more than 5.0)
const handleValidationsErrorDB = (error) => {
  const errors = Object.values(error.errors).map((el) => el.message);
  const message = `Invalid input Data ${errors.join(". ")}`;
  return new AppError(message, StatusCodes.BAD_REQUEST);
};

// 4) JWT Errors (validation)
const handleJWTError = () =>
  new AppError("Invalid token , Please log in again", StatusCodes.UNAUTHORIZED);

// 4) JWT Errors (Expired)
const handleJWTExpiredError = () =>
  new AppError(
    "Your token has expired ! Please log in again ",
    StatusCodes.UNAUTHORIZED
  );

const sendErrorDev = (error, req, res) => {
  // A) API
  if (req.originalUrl.startsWith("/api")) {
    return res.status(error.statusCode).json({
      status: error.status,
      err: error,
      message: error.message,
      stack: error.stack, // shows where the error is in our code
    });
  }
  //B)RENDERED WEBSITE
  console.error(`Error`, error);
  return res.status(error.statusCode).render("error", {
    tile: "Something went wrong!",
    msg: error.message,
  });
};

const sendErrorProd = (error, req, res) => {
  // A) API
  if (req.originalUrl.startsWith("/api")) {
    //Operational , trusted error : send message to Client
    if (error.isOperational) {
      return res.status(error.statusCode).json({
        status: error.status,
        message: error.message,
      });

      //Programming or other unknow error : don't leak error details to the Client
    }
    //1) log error
    console.error(`Error`, error);

    //2) Send generic message
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: "Something Went Wrong",
    });
  }
  //B) RENDERED WEBSITE
  if (error.isOperational) {
    console.log(error);
    return res.status(error.statusCode).render("error", {
      tile: "Something went wrong!",
      msg: error.message,
    });
  }
  //Programming or other unknow error : don't leak error details to the Client
  //1) log error
  console.error(`Error`, error);

  //2) Send generic message
  return res.status(error.statusCode).render("error", {
    tile: "Something went wrong!",
    msg: "Please try again Later",
  });
};

module.exports = (error, req, res, next) => {
  error.statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  error.status = error.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(error, req, res);
  } else if (process.env.NODE_ENV === "production") {
    let err = {
      ...error, // Shallow copy existing enumerable properties
      name: error.name, // Ensure `name` is copied
      message: error.message, // Ensure `message` is copied
    };
    if (err.name === "CastError") err = handleCastErrorDB(err);
    if (err.code === 11000) err = handleDuplicateFieldsDB(err);
    if (err.name === "ValidationError") err = handleValidationsErrorDB(err);
    if (err.name === "JsonWebTokenError") err = handleJWTError();
    if (err.name === "TokenExpiredError") err = handleJWTExpiredError();

    sendErrorProd(err, req, res);
  }
};
