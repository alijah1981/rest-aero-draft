const Sequelize = require('sequelize');
const sequelize = require('../utils/database');

const User = sequelize.define('User', {
  id: {
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    type: Sequelize.INTEGER
  },
  userId: {
    type: Sequelize.STRING,
    allowNull: false
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false
  }
});

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    type: Sequelize.INTEGER
  },
  token: {
    allowNull: false,
    type: Sequelize.STRING,
  },
  idUser: {
    allowNull: false,
    type: Sequelize.INTEGER,
  },
  expiryDate: {
    allowNull: false,
    type: Sequelize.DATE,
  }
});

module.exports = {User, RefreshToken};
