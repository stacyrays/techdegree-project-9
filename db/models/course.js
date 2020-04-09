const Sequelize = require("sequelize");

module.exports = sequelize => {
  class Course extends Sequelize.Model {}
  Course.init(
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'Please provide a value for "Title"'
          },
          notEmpty: {
            msg: 'Please provide a value for "Title"'
          }
        }
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
        validate: {
          notNull: {
            msg: 'Please provide a value for "Last Name"'
          },
          notEmpty: {
            msg: 'Please provide a value for "Last Name"'
          }
        }
      },
      estimatedTime: {
        type: Sequelize.STRING,
        allowNull: true
      },
      materialsNeeded: {
        type: Sequelize.STRING,
        allowNull: true
      }
    },
    {
      //timestamps: false, // disable timestamps
      sequelize
    }
  );
  Course.associate = models => {
    Course.belongsTo(models.User, {
      as: "owner",
      foreignKey: {
        fieldName: "userId"
      }
    });
  };

  return Course;
};
