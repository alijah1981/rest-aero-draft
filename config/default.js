const path = require('path');

module.exports = {
  jwtsecret: 'the jwt secret',
  jwtExpiration: 43200,          // 43200 // 3600 / 1 hour // 60 for test
  jwtRefreshExpiration: 86400,   // 86400 // 86400 / 24 hours // 120 for test
  DB_NAME: 'db-name',
  USER_NAME: 'dbUser',
  PASSWORD: 'dbPassword',
  publicRoot: path.join(process.cwd(), 'public'),
  filesRoot: path.join(process.cwd(), 'files'),
  // limitFileSize: 10e6,
  page_default: 1,
  list_size_default: 2,
};
