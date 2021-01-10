const Sequelize = require("sequelize");
const Cat = require("./cat");
const User = require("./user");

const env = process.env.NODE_ENV || "development";
const config = require("../config/config")[env];
const db = {};

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.Cat = Cat;
db.User = User;

Cat.init(sequelize);
User.init(sequelize);

module.exports = db;
