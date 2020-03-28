"use strict";

const bcryptjs = require("bcryptjs");
const Context = require("./context");
const Sequelize = require("sequelize");

console.info("Instantiating and configuring the Sequelize object instance...");

const options = {
  dialect: "sqlite",
  storage: "fsjstd-restapi.db",
  define: {
    // This option removes the `createdAt` and `updatedAt` columns from the tables
    // that Sequelize generates from our models. These columns are often useful
    // with production apps, so we'd typically leave them enabled, but for our
    // purposes let's keep things as simple as possible.
    timestamps: false
  }
};

const sequelize = new Sequelize(options);

const models = {};

class Database {
  constructor(seedData, enableLogging) {
    this.courses = seedData.courses;
    this.users = seedData.users;
    this.enableLogging = enableLogging;
    this.context = new Context("fsjstd-restapi.db", enableLogging);
  }

  log(message) {
    if (this.enableLogging) {
      console.info(message);
    }
  }

  tableExists(tableName) {
    this.log(`Checking if the ${tableName} table exists...`);

    return this.context.retrieveValue(
      `
        SELECT EXISTS (
          SELECT 1 
          FROM sqlite_master 
          WHERE type = 'table' AND name = ?
        );
      `,
      tableName
    );
  }

  createUser(user) {
    return this.context.execute(
      `
        INSERT INTO Users
          (firstName, lastName, emailAddress, password, createdAt, updatedAt)
        VALUES
          (?, ?, ?, ?, datetime('now'), datetime('now'));
      `,
      user.firstName,
      user.lastName,
      user.emailAddress,
      user.password
    );
  }

  createCourse(course) {
    return this.context.execute(
      `
        INSERT INTO Courses
          (userId, title, description, estimatedTime, materialsNeeded, createdAt, updatedAt)
        VALUES
          (?, ?, ?, ?, ?, datetime('now'), datetime('now'));
      `,
      course.userId,
      course.title,
      course.description,
      course.estimatedTime,
      course.materialsNeeded
    );
  }

  async hashUserPasswords(users) {
    const usersWithHashedPasswords = [];

    for (const user of users) {
      const hashedPassword = await bcryptjs.hash(user.password, 10);
      usersWithHashedPasswords.push({ ...user, password: hashedPassword });
    }

    return usersWithHashedPasswords;
  }

  async createUsers(users) {
    for (const user of users) {
      await this.createUser(user);
    }
  }

  async createCourses(courses) {
    for (const course of courses) {
      await this.createCourse(course);
    }
  }

  async init() {
    const userTableExists = await this.tableExists("Users");

    if (userTableExists) {
      this.log("Dropping the Users table...");

      await this.context.execute(`
        DROP TABLE IF EXISTS Users;
      `);
    }

    this.log("Creating the Users table...");

    await this.context.execute(`
      CREATE TABLE Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        firstName VARCHAR(255) NOT NULL DEFAULT '', 
        lastName VARCHAR(255) NOT NULL DEFAULT '', 
        emailAddress VARCHAR(255) NOT NULL DEFAULT '' UNIQUE, 
        password VARCHAR(255) NOT NULL DEFAULT '', 
        createdAt DATETIME NOT NULL, 
        updatedAt DATETIME NOT NULL
      );
    `);

    this.log("Hashing the user passwords...");

    const users = await this.hashUserPasswords(this.users);

    this.log("Creating the user records...");

    await this.createUsers(users);

    const courseTableExists = await this.tableExists("Courses");

    if (courseTableExists) {
      this.log("Dropping the Courses table...");

      await this.context.execute(`
        DROP TABLE IF EXISTS Courses;
      `);
    }

    this.log("Creating the Courses table...");

    await this.context.execute(`
      CREATE TABLE Courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        title VARCHAR(255) NOT NULL DEFAULT '', 
        description TEXT NOT NULL DEFAULT '', 
        estimatedTime VARCHAR(255), 
        materialsNeeded VARCHAR(255), 
        createdAt DATETIME NOT NULL, 
        updatedAt DATETIME NOT NULL, 
        userId INTEGER NOT NULL DEFAULT -1 
          REFERENCES Users (id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    this.log("Creating the course records...");

    await this.createCourses(this.courses);

    this.log("Database successfully initialized!");
  }
}

module.exports = {
  sequelize,
  Sequelize,
  Database,
  models
};

//module.exports = Database;
