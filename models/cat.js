const Sequelize = require("sequelize");

module.exports = class Cat extends (
  Sequelize.Model
) {
  static init(sequelize) {
    return super.init(
      {
        imgURL: {
          type: Sequelize.STRING(10),
          allowNull: false,
          unique: true,
        },
        fur: {
          type: Sequelize.STRING(10),
          allowNull: true,
        },
        foot: {
          type: Sequelize.STRING(10),
          allowNull: true,
        },
      },
      {
        sequelize,
        paranoid: false,
        timestamps: false,
        modelName: "Cat",
        tableName: "cats",
        charset: "utf8",
        collate: "utf8_general_ci",
      }
    );
  }
};
