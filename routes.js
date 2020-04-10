const express = require("express");
const router = express.Router();

//Load validation npm
const { check, validationResult } = require("express-validator");

//Load bcrypt js and basic-auth for authentication
const bcryptjs = require("bcryptjs");
const auth = require("basic-auth");

const db = require("./db");
const { User, Course } = db.models;

/**
 * Middleware to authenticate the request using Basic Authentication.
 * @param {Request} req - The Express Request object.
 * @param {Response} res - The Express Response object.
 * @param {Function} next - The function to call to pass execution to the next middleware.
 */

//Async handler
function asyncHandler(cb) {
  return async (req, res, next) => {
    try {
      await cb(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

const authenticateUser = async (req, res, next) => {
  let message = null;

  // Get the user's credentials from the Authorization header.
  const credentials = auth(req);

  if (credentials) {
    // Look for a user whose `username` matches the credentials `emailAddress` property.
    const users = await User.findAll();
    const user = users.find((u) => u.emailAddress === credentials.name);

    //Check to see if password matches the username password
    if (user) {
      const authenticated = bcryptjs.compareSync(
        credentials.pass,
        user.password
      );
      if (authenticated) {
        console.log(
          `Authentication successful for username: ${user.emailAddress}`
        );

        // Store the authenticated user on the Request object
        req.currentUser = user;
      } else {
        message = `Authentication failure for username: ${user.emailAddress}`;
      }
    } else {
      message = `User not found for username: ${credentials.emailAddress}`;
    }
  } else {
    message = "Auth header not found";
  }

  if (message) {
    console.warn(message);
    res.status(401).json({ message: "Access Denied" });
  } else {
    next();
  }
};

// Setup greeting for route root
router.get("/", (req, res) => {
  res.json({
    message: "Welcome to the REST API project!",
  });
});

// GET request to return the currently authenticated user
router.get(
  "/users",
  authenticateUser,
  asyncHandler(async (req, res) => {
    const user = await User.findAll({
      attributes: ["id", "firstName", "lastName", "emailAddress"],
      where: { id: req.currentUser.id },
    });
    res.status(200).json(user);
  })
);

// Add a user
router.post(
  "/users",
  [
    check("firstName")
      .exists()
      .withMessage('Please provide a value for "firstName"'),
    check("lastName")
      .exists()
      .withMessage('Please provide a value for "lastName"'),
    check("emailAddress")
      .isEmail()
      .withMessage('Please provide a value for "emailAddress"'),
    check("password")
      .exists()
      .withMessage('Please provide a value for "password"'),
  ],
  asyncHandler(async (req, res) => {
    // Attempt to get the validation result from the Request object.
    const errors = validationResult(req);

    // If there are validation errors...
    if (!errors.isEmpty()) {
      // Use the Array `map()` method to get a list of error messages.
      const errorMessages = errors.array().map((error) => error.msg);

      // Return the validation errors to the client.
      res.status(400).json({ errors: errorMessages });
    } else {
      // See if email exists already
      const emailAddresses = await User.findOne({
        where: { emailAddress: req.body.emailAddress },
      });
      console.log(emailAddresses);
      if (emailAddresses) {
        res.status(409).json({ errors: "This email is in use already" });
      } else {
        // Hash the password
        req.body.password = bcryptjs.hashSync(req.body.password);
        // Create the user
        await User.create({
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          emailAddress: req.body.emailAddress,
          password: req.body.password,
        });
        res.location("/");
        res.status(201).end();
      }
    }
  })
);

// Get all courses
router.get(
  "/courses",
  asyncHandler(async (req, res) => {
    const courses = await Course.findAll({
      attributes: [
        "id",
        "title",
        "description",
        "estimatedTime",
        "materialsNeeded",
      ],
      include: [
        {
          model: User,
          as: "owner",
          attributes: ["id", "firstName", "lastName", "emailAddress"],
        },
      ],
    });
    if (courses) {
      res.status(200).json(courses);
    } else {
      res.status(404).json({ message: "Cannot find courses" });
    }
  })
);

// Get a course using id
router.get(
  "/courses/:id",
  asyncHandler(async (req, res) => {
    let course;
    course = await Course.findByPk(req.params.id, {
      attributes: [
        "id",
        "title",
        "description",
        "estimatedTime",
        "materialsNeeded",
      ],
      include: [
        {
          model: User,
          as: "owner",
          attributes: ["id", "firstName", "lastName", "emailAddress"],
        },
      ],
    });
    if (course) {
      res.status(200).json(course);
    } else {
      res.status(404).json({ message: "Cannot find course" });
    }
  })
);

// Post course
router.post(
  "/courses",
  authenticateUser,
  [
    check("title").exists().withMessage('Please provide a value for "title"'),
    check("description")
      .exists()
      .withMessage('Please provide a value for "description"'),
  ],
  asyncHandler(async (req, res) => {
    // Attempt to get the validation result from the Request object.
    const errors = validationResult(req);

    // If there are validation errors...
    if (!errors.isEmpty()) {
      // Use the Array `map()` method to get a list of error messages.
      const errorMessages = errors.array().map((error) => error.msg);

      // Return the validation errors to the client.
      return res.status(400).json({ errors: errorMessages });
    } else {
      const course = await Course.create(req.body);
      res.location(`courses/${course.id}`);
      res.status(201).end();
    }
  })
);

// Update a course
router.put(
  "/courses/:id",
  authenticateUser,
  [
    check("title").exists().withMessage('Please provide a value for "title"'),
    check("description")
      .exists()
      .withMessage('Please provide a value for "description"'),
  ],
  asyncHandler(async (req, res) => {
    // Attempt to get the validation result from the Request object.
    const errors = validationResult(req);

    // If there are validation errors...
    if (!errors.isEmpty()) {
      // Use the Array `map()` method to get a list of error messages.
      const errorMessages = errors.array().map((error) => error.msg);

      // Return the validation errors to the client.
      return res.status(400).json({ errors: errorMessages });
    } else {
      const course = await Course.findByPk(req.params.id);
      if (course) {
        if (req.currentUser.id === course.userId) {
          await course.update(req.body);
          res.location(`courses/${course.id}`);
          res.status(204).end();
        } else {
          res.status(403).json({
            message: "You're not the owner so can't update this course!",
          });
        }
      } else {
        res.status(403).json({ message: "You do not own this course" });
      }
    }
  })
);

// Delete individual course
router.delete(
  "/courses/:id",
  authenticateUser,
  asyncHandler(async (req, res) => {
    const course = await Course.findByPk(req.params.id);
    if (course) {
      if (req.currentUser.id === course.userId) {
        await course.destroy();
        res.location("/");
        res.status(204).end();
      } else {
        res.status(403).json({
          message: "You're not the owner so can't delete this course!",
        });
      }
    } else {
      res.status(404).json({ message: "Cannot find course" });
    }
  })
);

module.exports = router;
