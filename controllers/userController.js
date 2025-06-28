const { StatusCodes } = require("http-status-codes");
const multer = require("multer");
const sharp = require("sharp");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");

//Returns a StorageEngine implementation configured to store files in memory as Buffer objects.
const multerStorage = multer.memoryStorage();

//Function to control which files are accepted and to test if the uploaded file is an image
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        "Not an image! Please upload only images",
        StatusCodes.BAD_REQUEST
      ),
      false
    );
  }
};

//to use multer we need to configer a multer upload(set the settings) and then use it
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
//we gonna use is upload as a middleware function in the updateMe endpoint

exports.uploadUserPhoto = upload.single("photo");

//this middleware gonna run after the image uploading , upload the image-> resize it to our needs -> update the user's info
exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);
  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });

  return newObj;
};

exports.createUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "this route is not yet defined ! Please user /signup instead",
  });
};

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
exports.updateUser = factory.updateOne(User);
exports.deletUser = factory.deletOne(User);

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res) => {
  // 1) Create Error if User POsts password data
  if (req.body.password || req.body.passwordConfirm) {
    throw new AppError(
      "this route is not for passwrod updates. please use /updatePassword",
      StatusCodes.BAD_REQUEST
    );
  }

  //2) Filtered out unwanted fields names that are not allowed to be updated
  const fileredBody = filterObj(req.body, "name", "email");

  //if the user uploaded a photo put that photo property in the fileredBody and update that image
  if (req.file) fileredBody.photo = req.file.filename;

  //3) Update User Document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, fileredBody, {
    new: true,
    runValidators: true,
  });

  res.status(StatusCodes.OK).json({
    status: "success",
    date: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(StatusCodes.NO_CONTENT).json({
    status: "success",
    data: null,
  });
});
