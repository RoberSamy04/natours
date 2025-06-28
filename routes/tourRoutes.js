const express = require("express");

const tourConstroller = require("../controllers/tourController");
const authController = require("../controllers/authController");
const reviewRouter = require("./reviewRoutes");
const bookingRouter = require("./bookingRoutes");

const router = express.Router();

router.use("/:tourid/reviews", reviewRouter);
router.use("/:tourid/bookings", bookingRouter);

router
  .route("/top-5-cheap")
  .get(tourConstroller.aliasTopTours, tourConstroller.getAllTours);

router.route("/tour-stats").get(tourConstroller.getTourStats);
router
  .route("/monthly-plan/:year")
  .get(
    authController.protect,
    authController.restrictTo("admin", "lead-guide", "guide"),
    tourConstroller.getMonthlyPlan
  );

router
  .route("/tours-within/:distance/center/:latlng/unit/:unit")
  .get(tourConstroller.getToursWithin);

router
  .route("/distances/:latlng/unit/?:unit")
  .get(tourConstroller.getDistances);

router
  .route("/")
  .get(tourConstroller.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourConstroller.createTour
  );
router
  .route("/:id")
  .get(tourConstroller.getTour)
  .patch(
    authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourConstroller.uploadTourImages,
    tourConstroller.resizeTourImages,
    tourConstroller.updateTour
  )
  .delete(
    authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourConstroller.deletTour
  );

module.exports = router;
