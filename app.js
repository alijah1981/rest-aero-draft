const express = require('express');
const path = require('path');
const routes = require('./routes/routes');
const sequelize = require('./utils/database');
const cors = require("cors");

// const url = require('url');
// const fs = require('fs');
// const config = require('config');
// const receiveFile = require('./receiveFile');

const app = express();

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

const corsOptions = {
  origin: "http://192.168.1.205:8080"
};

app.use(cors(corsOptions));

app.use(function(req, res, next) {
  res.header(
    "Access-Control-Allow-Headers",
    "x-access-token, Origin, Content-Type, Accept"
  );
  next();
});

app.use('/api/', routes);

// app.use((req, res, next) => {
//   res.sendFile('/index.html');
// });


const PORT = process.env.PORT || 3399;

async function start() {
  try {
    // await sequelize.sync({force: true}); // для удаления таблицы
    await sequelize.sync();
    app.listen(PORT, '192.168.1.205', () => {
      console.log(`listening on 192.168.1.205:${PORT}`);
    });
  } catch (e) {
    console.log(e);
  }
}

start();
