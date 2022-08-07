const {Router} = require('express');
const router = Router();

const {User, RefreshToken} = require('../models/User');
const FileList = require('../models/FileList');
const {Op} = require('sequelize');

const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const { TokenExpiredError } = jwt;
const {v4: uuidv4} = require("uuid");
const config = require('config');

const fileMulter = require('../utils/file-multer');

const fs = require('fs');
const path = require('path');

// const url = require('url');
// const mime = require('mime');
// const receiveFile = require('../utils/receiveFile');

// router.get('/', async (req,res) => {
//   try {
//
//     res.json(test);
//   } catch (e) {
//     console.log(e);
//     res.status(500).json({ message: 'Server error' });
//   }
// });


router.post('/signup', async (req, res) => {
  try {

    if (!req.body.userId || !req.body.password) {
      return res.status(401).json({
        message: 'Empty username or password'
      });
    }

    // валидация дубликата userId
    const utest = await User.findOne({
      where: {
        userId: req.body.userId
      }
    });

    if (utest) {
      return res.status(400).json({
        message: "Failed! Username is already in use!"
      });
    }

    const hashPassword = await bcrypt.hash(req.body.password, 8);

    const user = await User.create({
      userId: req.body.userId,
      password: hashPassword
    });

    const rtoken = await createToken(user);

    jwt.sign({userId: user.userId, rId: user.id}, config.get('jwtsecret'), {
      expiresIn: config.get('jwtExpiration')
    }, (err, token) => {
      res.status(201).json({
        message: `Registered new user: ${user.userId}`,
        password: req.body.password,
        jwt: token,
        refreshtoken: rtoken
      });
    });

  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/signin', async (req, res) => {
  try {
    //const user = users.find(u => u.userId === req.body.userId);

    const user = await User.findOne({
      where: {
        userId: req.body.userId
      }
    });

    if (!user) {
      return res.status(401).json({
        message: 'Incorrect login (username)'
      });
    }

    const areSame = await bcrypt.compare(req.body.password, user.password);

    if (!areSame) {
      return res.status(403).json({
        message: 'Wrong password'
      });
    }

    await RefreshToken.destroy({ where: { idUser: user.id } });

    const rtoken = await createToken(user);

    jwt.sign({userId: user.userId, rId: user.id}, config.get('jwtsecret'), {
      expiresIn: config.get('jwtExpiration')
    }, (err, token) => {
      res.json({
        message: `Wellcome, ${user.userId}`,
        jwt: token,
        refreshtoken: rtoken
      });
    });

  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/signin/new_token', async (req, res) => {
  try {

    if (!req.body.refreshtoken) {
      return res.status(403).json({ message: "Refresh Token is required!" });
    }

    const refreshToken = await RefreshToken.findOne({ where: { token: req.body.refreshtoken } });

    if (!refreshToken) {
      return res.status(403).json({ message: "Refresh token is not in database!" });
    }

    if (refreshToken.expiryDate.getTime() < new Date().getTime()) {
      await RefreshToken.destroy({ where: { id: refreshToken.id } });

      return res.status(403).json({
        message: "Refresh token was expired. Please make a new login request"
      });
    }

    const user = await User.findOne({ where: { id: refreshToken.idUser } });

    const newAccessToken = await jwt.sign({userId: user.userId, rId: user.id}, config.get('jwtsecret'), {
      expiresIn: config.get('jwtExpiration')
    });

    return res.json({
      accessToken: newAccessToken,
      refreshToken: refreshToken.token,
    });

  } catch (e) {
    console.log(e);
    // res.status(500).json({ message: e });
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/info', verifyToken, async (req,res) => {
  try {
    res.send(`User Content. User ${req.userId} logged in.`);
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/logout', verifyToken, async (req,res) => {
  try {

    await RefreshToken.destroy({ where: { idUser: +req.rId } });

    res.send(`User ${req.userId} logged out.`);

    //res.send(`User Content. User ${req.userId} logged in.`);
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/file/upload', verifyToken, fileMulter.upload);


router.get('/file/list', verifyToken, async (req, res) => {
  try {

    // const {count, rows} = await FileList.findAndCountAll({
    //   where: {
    //     fileName: {
    //       [Op.like]: '%hicago%'
    //     }
    //   }
    // });

    //console.log('req.body ', req.body)

    // console.log('req.query.list_size ', req.query.list_size);
    // console.log('req.query.page ', req.query.page);

    let list_size = req.body.list_size ? req.body.list_size : +req.query.list_size;
    let page = req.body.page ? req.body.page : +req.query.page;

    if (!list_size || list_size < 1 || (typeof list_size != 'number')) { list_size = config.get('list_size_default'); }
    if (!page || page < 1 || (typeof page != 'number')) { page = config.get('page_default'); }

    const offset = list_size * (page - 1);

    const {count, rows} = await FileList.findAndCountAll({
      offset,
      limit: list_size
    });

    if(!count) {
      return res.status(404).json({
        message: 'No files was uploaded.'
      });
    }

    if(!rows.length) {
      return res.status(404).json({
        message: `There are no items on selected page (${page}).`
      });
    }

    res.json(rows);
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/file/:id', verifyToken, async (req, res) => {
  try {

    // if(!req.params.id) {
    //   return res.status(404).json({
    //     message: `id required.`
    //   });
    // }

    const fileItem = await FileList.findOne({
      where: {
        id: req.params.id
      }
    });

    if(!fileItem) {
      return res.status(404).json({
        message: `Not found file with requested id (${req.params.id}).`
      });
    }

    res.json(fileItem);
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/file/download/:id', verifyToken, async (req, res) => {
  try {

    const fileItem = await FileList.findOne({
      where: {
        id: req.params.id
      }
    });

    if(!fileItem) {
      return res.status(404).json({
        message: `Not found file with requested id (${req.params.id}).`
      });
    }

    let fullName = fileItem.fileName;

    if (fileItem.extension) { fullName += '.' + fileItem.extension; }

    const fPath = path.join(config.get('filesRoot'), fullName);

    res.download(fPath, fullName, (err) => {
      if (err) {
        console.log(err);
        res.status(500).send({
          message: `Could not download the file ${fullName}. ` + err,
        });
      }
    });

  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Server error' });
  }
});


router.delete('/file/delete/:id', verifyToken, async (req, res) => {
  try {

    const fileItem = await FileList.findOne({
      where: {
        id: req.params.id
      }
    });

    if(!fileItem) {
      return res.status(404).json({
        message: `Not found file with requested id (${req.params.id}).`
      });
    }

    await FileList.destroy({ where: { id: fileItem.id } });

    let fullName = fileItem.fileName;

    if (fileItem.extension) { fullName += '.' + fileItem.extension; }

    const fPath = path.join(config.get('filesRoot'), fullName);

    await fs.rm(fPath, (err) => {
      if (err) {
        console.log(err);
        return res.status(500).send({
          message: `Could not delete the file ${fullName}. ` + err
        });
      }
    });

    res.json({
      message: `File ${fullName} deleted successfuly.`
    });


  } catch (e) {
    console.log(e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/file/update/:id', verifyToken, fileMulter.update);

// router.post('/fileupload/*', async (req, res) => {
//
//   console.log(req);
//
//   //console.log('req.url: ', req.url);
//   const pathname = decodeURI(url.parse(req.url).pathname);
//
//   const pp = pathname.split('/');
//   const filename = pp[pp.length-1];
//
//   //const filename = pathname.slice(1); // /file.ext -> file.ext
//   //console.log('pathname: ', pathname);
//
//   await receiveFile(path.join(config.get('filesRoot'), filename), req, res);
//
//   path1 = path.join(config.get('filesRoot'), filename);
//
//   const fmime = mime.lookup(path1);
//   console.log(`${filename} - ${fmime}`);
//
// });


// tokens functions

function catchError(err, res) {
  if (err instanceof TokenExpiredError) {
    return res.status(401).json({ message: "Unauthorized! Access Token was expired!" });
  }

  return res.status(401).json({ message: "Unauthorized!" });
}

async function verifyToken (req, res, next) {
  const token = req.headers["x-access-token"];

  if (!token) {
    return res.status(403).json({
      message: "No token provided!"
    });
  }

  jwt.verify(token, config.get('jwtsecret'), (err, decoded) => {
    if (err) {
      return catchError(err, res);
    }
    req.userId = decoded.userId;
    req.rId = decoded.rId;
    //next();
  });

  const req_rId = +req.rId || -1;

  const userRtoken = await RefreshToken.findOne({ where: { idUser: req_rId } });
  if (!userRtoken) {
    return res.status(401).json({ message: "Unauthorized (no refreshtoken found)." });
  }
  next();
};


// create refresh token
// createToken = async function
async function createToken (user) {
  let expiredAt = new Date();

  expiredAt.setSeconds(expiredAt.getSeconds() + config.get('jwtRefreshExpiration'));

  const _token = uuidv4();

  const refreshToken = await RefreshToken.create({
    token: _token,
    idUser: user.id,
    expiryDate: expiredAt.getTime(),
  });

  return refreshToken.token;
};


module.exports = router;
