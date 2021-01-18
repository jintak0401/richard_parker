const { text } = require("express");
const Sequelize = require("sequelize");

module.exports = class User extends (
  Sequelize.Model
) {
  static init(sequelize) {
    return super.init(
      {
        email: {
          type: Sequelize.STRING(40),
          allowNull: false,
          unique: true,
        },
        nick: {
          type: Sequelize.STRING(15),
          allowNull: false,
          unique: true,
        },
        refreshToken: {
          type: Sequelize.STRING(180),
          allowNull: true,
        },
      },
      {
        sequelize,
        timestamps: true,
        underscored: false,
        modelName: "User",
        tableName: "users",
        paranoid: true, // deletedAt 이 자동으로 추가됨
        charset: "utf8mb4",
        collate: "utf8mb4_general_ci",
      }
    );
  }

  static associate(db) {
    // db.User.hasMany(db.Post);
    // db.User.belongsToMany(db.User, {
    //   foreignKey: "followingId",
    //   as: "Followers",
    //   through: "Follow",
    // });
    // db.User.belongsToMany(db.User, {
    //   foreignKey: "followerId",
    //   as: "Followings",
    //   through: "Follow",
    // });
  }
};
