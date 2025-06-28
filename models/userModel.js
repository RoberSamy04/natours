const { StatusCodes } = require("http-status-codes");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const AppError = require("../utils/appError");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your Name"],
  },
  email: {
    type: String,
    required: [true, "Please enter your Email"],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Please provide a valid Email"],
  },
  photo: {
    type: String,
    default: "default.jpg",
  },
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user",
  },
  emailVerificationOtp: {
    type: String,
  },
  emailVerificationOtpExpiry: {
    type: Date,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },

  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: [8, "the password must be atleast 8 characters"],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your Password "],
    validate: {
      // this only work on .save() .create() !!
      validator: function (el) {
        return el === this.password; // the (el) is the current element (passwordConfirm)
      },
      message: `Passwords are not the same`,
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    // if the user delete his account
    type: Boolean,
    default: true,
    select: false,
  },
});

// // HASHING PASSWORD
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined;
  next();
});

userSchema.methods.verifyEmail = async function (otp) {
  if (
    !this.emailVerificationOtp ||
    this.emailVerificationOtp !== otp ||
    this.emailVerificationExpires < new Date()
  ) {
    throw new AppError("Invalid or expired otp", StatusCodes.BAD_REQUEST);
  }
  this.emailVerificationOtp = undefined;
  this.emailVerificationOtpExpiry = undefined;
  this.isEmailVerified = true;

  await this.save({ validateBeforeSave: false });

  return true;
};

//COMPARE THE USER'S PASSWORD AND DB PASSWORD
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

//Checking if the user changed his password for the auth proccess
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  //False means NOT changed
  return false;
};

//creat a random token (for the forgot pw route ) and sent that to the email address that was provided
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// this function it's gonna run right before a new doc is saved and we gonna specify a property in for the resetPassword
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.isNew) {
    return next();
  }
  this.passwordChangedAt = Date.now() - 2000;

  next();
});

//not showing any  inactive user in any find query for the deleteMe handler (user can delete his account)
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });

  next();
});
const User = mongoose.model("User", userSchema);

module.exports = User;
