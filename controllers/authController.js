const { StatusCodes } = require("http-status-codes");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const crypto = require("crypto");
const otpGenerator = require("otp-generator");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Email = require("../utils/email");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, StatusCode, res) => {
  const token = signToken(user._id);

  const cookieOPtions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // secure : true,
    httpOnly: true, //this' gonna make the cookie cannot be accessed in any way but the browser (xss attacks)
  };
  if (process.env.NODE_ENV === "production") cookieOPtions.secure = true;

  res.cookie("jwt", token, cookieOPtions);

  //remove the password from the output
  user.password = undefined;

  res.status(StatusCode).json({
    status: "success",
    token,
    data: {
      user: user,
    },
  });
};

const createEmailVerificationOTPObj = async (user) => {
  const otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
  });
  user.emailVerificationOtp = otp;
  user.emailVerificationOtpExpiry = new Date(
    Date.now() + 1 * 24 * 60 * 60 * 1000
  );
  await user.save({ validateBeforeSave: false });
  return otp;
};

exports.signup = catchAsync(async (req, res) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // Send verification email
  const otp = await createEmailVerificationOTPObj(newUser);

  const url = `${req.protocol}://${req.get("host")}/verify-email`;

  try {
    await new Email(newUser, url).sendEmailVerification(otp);
  } catch (err) {
    newUser.emailVerificationOtp = undefined;
    newUser.emailVerificationOtpExpiry = undefined;
    await newUser.save({ validateBeforeSave: false });
    throw new AppError(
      "there was an error sending the email, Try again later",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }

  newUser.password = undefined;
  newUser.emailVerificationOtp = undefined;

  res.status(StatusCodes.OK).json({
    status: "success",
    message: "Please verify your Email",
    data: {
      user: newUser,
    },
  });
});

exports.verifyEmail = catchAsync(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(
      "There's no user with this email address",
      StatusCodes.NOT_FOUND
    );
  }

  if (user.isEmailVerified) {
    throw new AppError("Email already verified", StatusCodes.BAD_REQUEST);
  }

  await user.verifyEmail(otp);

  res.status(StatusCodes.OK).json({
    status: "success",
    message: "Email verified successfully",
  });
});

exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  //1) check if email and password exist
  if (!email || !password) {
    throw new AppError(
      "please provide email and password !",
      StatusCodes.BAD_REQUEST
    );
  }

  //2) check if user exists && password is correct
  const user = await User.findOne({ email }).select("+password"); // we need to explicitly select the password like this bcs we setted the password select to flase in the schema to hide it and now if you want to select a field that is NOT select=false we used ("+") before the field

  if (!user || !(await user.correctPassword(password, user.password))) {
    throw new AppError("Incorrect Email or Password", StatusCodes.UNAUTHORIZED);
  }

  if (!user.isEmailVerified) {
    throw new AppError(
      "Please verify your email to login",
      StatusCodes.FORBIDDEN
    );
  }
  //3) if everything ok , send token to client
  createSendToken(user, StatusCodes.OK, res);
});

//to logout the user-> to creatte a logout toure that will send back a new cookie with the exact same name but without the token
//so that will override the token that the logged in user have on the browser with the same name but with no token
exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(StatusCodes.OK).json({ status: "success" });
};

//this middleware gonna run before any route handler to make sure the user is authenticated
exports.protect = catchAsync(async (req, res, next) => {
  //1) Getting token and check of it's there
  let token;

  if (
    //checks only for api
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    //checks for the rendered page (the token in the cookie)
    token = req.cookies.jwt;
  }

  if (!token) {
    throw new AppError(
      "Your are not Logged in! Please log in get access",
      StatusCodes.UNAUTHORIZED
    );
  }

  //2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); // the promosify make it returns a promise , this gonna return the Decoded Payload -> {id: ,iat: , exp:}

  //3) Check if user still exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) {
    throw new AppError(
      "The User belonging to this token doesn't exist",
      StatusCodes.UNAUTHORIZED
    );
  }

  //4) Check if user changed password after the token was issued
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    throw new AppError(
      "User recently changed password ! Please log in again",
      StatusCodes.UNAUTHORIZED
    );
  }

  //GRANT ACCESS TO PROTECTED ROUTE
  req.user = freshUser;
  res.locals.user = freshUser;
  next();
});

//this middleware is really only for rendered pages to check if the user logged in or not to render some (buttons/user's profile..etc)
exports.isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      //2) Verification token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      //3) Check if user still exists
      const freshUser = await User.findById(decoded.id);
      if (!freshUser) {
        return next();
      }

      //4) Check if user changed password after the token was issued
      if (freshUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      //there is a LOGGED IN USER (make that user accessable in our template)
      res.locals.user = freshUser;

      return next();
    }
  } catch (error) {
    return next();
  }
  next();
};

//make a role in the user model and restrict some tour routes for only the admin and the guid-lead
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          "you do not have permission to perform this action",
          StatusCodes.FORBIDDEN
        )
      );
    }
    next();
  };

exports.forgotPassword = catchAsync(async (req, res) => {
  // 1) Get User based on Posted Email
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError(
      "There 's no user with this email address",
      StatusCodes.NOT_FOUND
    );
  }

  //2) Generate the random reset Token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3) Send the token to User's Email

  try {
    const resetURL = `${req.protocol}://${req.get("host")}/api/v1/users/resetPassword/${resetToken}`;
    //const message = `Forgot your password ? Submit a PATCH request with your new password and passwordConfirm to ${resetURL}.\n If you didnt forget your password please ignore this email!`;
    // await sendEmail({
    //   email,
    //   subject: "your Password reset token (valid for 10 mins)",
    //   message,
    // });

    await new Email(user, resetURL).sendPasswordReset();

    res.status(StatusCodes.OK).json({
      status: "success",
      message: "Token sent to email",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new AppError(
      "there was an error sending the email, Try again later",
      StatusCodes.INTERNAL_SERVER_ERROR
    );
  }
});

exports.resetPassword = catchAsync(async (req, res) => {
  //1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2) we will set the new password only IF token has not expired and there's user
  if (!user) {
    throw new AppError(
      "Token is Invalid or has expired",
      StatusCodes.BAD_REQUEST
    );
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  //3) Update changedPasswordAt property for the user
  //it's a middleware it's gonna change it by itself

  //4) Log the user in , send JWT
  createSendToken(user, StatusCodes.OK, res);
});

exports.updatePassword = catchAsync(async (req, res) => {
  //1) Get user from collection

  const user = await User.findById(req.user.id).select("+password");

  //2) Check if Posted current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    throw new AppError(
      "your current password is wrong",
      StatusCodes.UNAUTHORIZED
    );
  }

  //3) if so , update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //4) Log user in , send JWT
  createSendToken(user, StatusCodes.OK, res);
});
