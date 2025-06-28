const { StatusCodes } = require("http-status-codes");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const ApiFeatures = require("../utils/apiFeatures");

exports.deletOne = (Model) =>
  catchAsync(async (req, res) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      throw new AppError(
        "No Document found with that ID",
        StatusCodes.NOT_FOUND
      );
    }

    res.status(StatusCodes.NO_CONTENT).json({
      status: "success",
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      throw new AppError(
        "No Document found with that ID",
        StatusCodes.NOT_FOUND
      );
    }

    res.status(StatusCodes.OK).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res) => {
    const doc = await Model.create(req.body);

    res.status(StatusCodes.CREATED).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res) => {
    let quary = Model.findById(req.params.id);
    if (popOptions) quary = quary.populate(popOptions);
    const doc = await quary;

    if (!doc) {
      throw new AppError(
        "No Document found with that ID",
        StatusCodes.NOT_FOUND
      );
    }

    res.status(StatusCodes.OK).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res) => {
    //to allow for nested GET reviews on tour (hack)
    let filter = {};
    if (req.params.tourid) filter = { tour: req.params.tourid };
    if (req.params.userid) filter = { user: req.params.userid };

    const features = new ApiFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const doc = await features.query;
    res.status(StatusCodes.OK).json({
      status: "success",
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });
