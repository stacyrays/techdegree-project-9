const express = require("express");
const router = express.Router();

const { check, validationResult } = require("express-validator");

const bcryptjs = require("bcryptjs");
const auth = require("basic-auth");

const db = require("./db");
const { User, Course } = db.models;

function asyncHandler(cb) {
  return async (req, res, next) => {
    try {
      await cb(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

//Authenticate User Middleware
async function authenticateUser(req, res, next) {
  let message = null;

  // Parse the user's credentials from the Authorization header.
  const credentials = auth(req);
  credentials.name = credentials.name;

  // If the user's credentials are available...
  if (credentials) {
    // Attempt to retrieve the user from the data store by their email.
    const users = await User.findAll();
    const user = users.find(u => u.emailAddress === credentials.name);

    // If a user was successfully retrieved from the data store...
    if (user) {
      // Use bcryptjs to compare the user's password
      // (from the Authorization header) to the user's password
      // that was retrieved from the database.
      const authenticated = bcryptjs.compareSync(
        credentials.pass,
        user.password
      );

      // If the passwords match...
      if (authenticated) {
        console.log(
          `Authentication successful for username: ${user.emailAddress}`
        );
        // Then store the retrieved user object on the request object
        // so any middleware functions that follow this middleware function
        // will have access to the user's information.
        req.currentUser = user;
      } else {
        message = `Authentication failure for username: ${user.emailAddress}`;
      }
    } else {
      message = `User not found for username: ${credentials.name}`;
    }
  } else {
    message = "Auth header not found";
  }

  // If user authentication failed...
  if (message) {
    console.warn(message);

    // Return a response with a 401 Unauthorized HTTP status code.
    res.status(401).json({ message: "Access Denied" });
  } else {
    // Or if user authentication succeeded...
    // Call the next() method.
    next();
  }
}

// setup a friendly greeting for the root route
router.get("/", (req, res) => {
  res.json({
    message: "Welcome to the REST API project!"
  });
});

// router.get("/users", (req, res) => {
//   res.json({
//     message: "User's route",
//     error: "why"
//   });
//   //res.models({ User });
//   //console.log("a message");
// });

// GET request to /users to return the currently authenticated user
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const user = await User.findAll({
      attributes: ["id", "firstName", "lastName", "emailAddress"]
      //where: { id: req.currentUser.id }
    });
    res.status(200).json(user);
  })
);

module.exports = router;
