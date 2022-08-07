const Sequelize = require('sequelize');
const config = require('config');

const sequelize = new Sequelize(config.get('DB_NAME'), config.get('USER_NAME'), config.get('PASSWORD'), {
  host: '127.0.0.1',
  dialect: 'mariadb'
});

module.exports = sequelize;
