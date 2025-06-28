//  WATCH THE VIDOE AGAIN TO SEE WHY WE MADE THIS FILE AND WHAT WE GONNA USE IT FOR
// VIDEO's NAME : Importing Deveopment Data

const fs = require("fs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Tour = require("../../models/tourModel");
const User = require("../../models/userModel");
const Review = require("../../models/reviewModel");

dotenv.config({ path: "./config.env" });

const DB = process.env.DATABASE.replace(
  "<DB_PASSWORD>",
  process.env.DB_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log("DB connection sucessful"));

//READ JSON FILE
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, "utf-8"));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, "utf-8"));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, "utf-8")
);
//IMPORT DATA INTO DB
const importData = async () => {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log("Data succeefully loaded");
  } catch (error) {
    console.error(error);
  }
  process.exit();
};

//Delete all  Data From DB
const deleteData = async () => {
  try {
    await Tour.deleteMany(); // delete all the documents
    await User.deleteMany();
    await Review.deleteMany();

    console.log("Data succeefully deleted");
  } catch (error) {
    console.error(error);
  }
  process.exit();
};
if (process.argv[2] === "--import") {
  importData();
} else if (process.argv[2] === "--delete") {
  deleteData();
}
console.log(process.argv);

// node dev-data/data/import-dev-data.js --delete  -> script we run it in the terminal to delete all the data from the DB
// node dev-data/data/import-dev-data.js --import  -> script we run it in the terminal to creat all the data from the tours-simple.json and put it in the DB
