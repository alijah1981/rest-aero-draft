const Sequelize = require('sequelize');
const sequelize = require('../utils/database');

const FileList = sequelize.define('FileList', {
  id: {
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
    type: Sequelize.INTEGER
  },
  fileName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  extension: {
    type: Sequelize.STRING,
    allowNull: false
  },
  fileSize: {
    type: Sequelize.FLOAT,
    allowNull: false
  },
  mimeType: {
    type: Sequelize.STRING,
    allowNull: false
  },
  userId: {
    type: Sequelize.STRING,
    allowNull: false
  }
});

module.exports = FileList;
