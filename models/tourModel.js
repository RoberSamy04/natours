const mongoose = require("mongoose");
const slugify = require("slugify");

// const User = require("./userModel");
// const validator = require("validator");

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "a tour must have a name"],
      unique: true,
      trim: true,
      maxlength: [40, "A tour must have less or equal than 40 characters"],
      minlength: [10, "A tour must have more or equal than 10 characters"],
      // validate : [validator.isAlpha,"Tour Name Must only contain characters"] // we here install a npm stuff called validator and we used this isAlpha
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, "A tour must have a duration"],
    },
    maxGroupSize: {
      type: Number,
      required: [true, "A tour must have a group size"],
    },
    difficulty: {
      type: String,
      required: [true, "A tour must have a difficulty "],
      enum: {
        values: ["easy", "medium", "difficult"],
        message: "Difficulty is either : easy , medium , difficult",
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating Must Be Above 1.0"],
      max: [5, "Rating Must Be Below 5.0"],
      set: (val) => Math.round(val * 10) / 10, //=> 4.6666 *10,  rounded(46.6666) ,  47 /10 , 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, "A tour must have a price"],
    },
    priceDiscount: {
      type: Number,
      validate: {
        // custom validators
        validator: function (value) {
          // this only points to current doc on NEW document creation , means not going to work on update
          return value < this.price;
        },
        message: "Discount Price ({VALUE}) Should be Below Regular Price",
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, "A tour must have a summary"],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, "A tour must have a cover image"],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false, // we here exclude this (createdAt) field , so this field the user cannot see it
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },

    startLocation: {
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      coordinates: [Number], // the longitude first and the latitude second
      address: String,
      description: String,
    },

    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number, // the day of the tour in which people will go to this location
      },
    ],

    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],
  },
  // we here defind the schema options so we want to the virtual property to show up in the result
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: "2dsphere" });

//WE CONNOT USE VIRTUAL PROPERTY IN A QUERY BCS IT'S NOT PART OF THE DB
tourSchema.virtual("durationWeeks").get(function () {
  return this.duration / 7;
});

tourSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "tour",
  localField: "_id",
});

//a quary middleware to show all the documents of the refrenced data using populate
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: "guides",
    select: "-__v -passwordChangedAt", //remove the __v property and the passwordChangedAt from the output
  });

  next();
});

tourSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// tourSchema.pre("save", function (next) {
//   console.log("will save document..");
//   next();
// });

// tourSchema.post("save", (doc, next) => {
//   console.log(doc); //the final document that will be posted, there 's not this keyword here
//   next();
// });

tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  next();
});

tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query Took ${Date.now() - this.start} milleseconds `);
  // console.log(docs);
  next();
});

const Tour = mongoose.model("Tour", tourSchema);

module.exports = Tour;
