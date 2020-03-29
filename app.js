"use strict";

// load modules
const express = require("express");
const morgan = require("morgan");
const { sequelize, models, Database } = require("./seed/database");

//const User = require("./models/user").User;

const { User, Course } = models;

// variable to enable global error logging
const enableGlobalErrorLogging =
  process.env.ENABLE_GLOBAL_ERROR_LOGGING === "true";

// create the Express app
const app = express();

// setup morgan which gives us http request logging
app.use(morgan("dev"));

(async () => {
  try {
    // Test the connection to the databasenp
    await sequelize
      .authenticate()
      .then(() => {
        console.log("Connection has been established successfully!");
      })
      .catch(err => {
        console.error("Unable to connect to the database:", err);
      });

    // Sync the models

    await sequelize
      .sync({ force: true })
      .then(() => {
        console.log("Synchronizing successful!");
      })
      .catch(err => {
        console.error("Unable to connect sync:", err);
      });

    //process.exit();
  } catch (error) {
    if (error.name === "SequelizeValidationError") {
      const errors = error.errors.map(err => err.message);
      console.error("Validation errors: ", errors);
    } else {
      throw error;
    }
  }
})();

// TODO setup your api routes here
function asyncHandler(cb) {
  return async (req, res, next) => {
    try {
      await cb(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

app.get(
  "/api/users",
  asyncHandler(async (req, res) => {
    const users = await User.findAll().then(users => {
      console.log("All users:", JSON.stringify(users, null, 4));
    });
  })
);

// setup a friendly greeting for the root route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the REST API project!"
  });
});

// send 404 if no other route matched
app.use((req, res) => {
  res.status(404).json({
    message: "Route Not Found"
  });
});

// setup a global error handler
app.use((err, req, res, next) => {
  if (enableGlobalErrorLogging) {
    console.error(`Global error handler: ${JSON.stringify(err.stack)}`);
  }

  res.status(err.status || 500).json({
    message: err.message,
    error: {}
  });
});

// set our port
app.set("port", process.env.PORT || 5000);

// start listening on our port
const server = app.listen(app.get("port"), () => {
  console.log(`Express server is listening on port ${server.address().port}`);
});
