const dotenv = require("dotenv");

const mongoose = require("mongoose");

dotenv.config({ path: "./config.env" });

// process.on("uncaughtException", (err) => {
//   console.error(err.name, err.message);
//   console.log("UNCAUGHT EXCEPTION Shutting Down...");
//   process.exit(1);
// });

const app = require("./app");

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
  .then(() => console.log("DB connection sucessful"))
  .catch((err) => console.log(err));

const port = process.env.PORT;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}`);
});

process.on("unhandledRejection", (err) => {
  console.error(err);
  console.log("UNHANDLED REJECTION Shutting Down...");
  server.close(() => {
    process.exit(1);
  });
});

//uncaught exceptions
// console.log(x);
