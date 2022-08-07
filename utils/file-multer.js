const config = require('config');
const util = require('util');
const multer = require('multer');
const maxSize = 2 * 1024 * 1024;

const fs = require('fs');
const path = require('path');
const FileList = require('../models/FileList');
const {Op} = require('sequelize');

let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.get('filesRoot'));
  },
  filename: (req, file, cb) => {
    // console.log(file.originalname);
    cb(null, file.originalname);
  },
});

const fileFilter = (req, file, cb) => {

  const filePath = path.join(config.get('filesRoot'), file.originalname);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      cb(null, true);
    } else {
      req.eflag = file.originalname + ' already exists!';
      if (req.method !== 'PUT') {
        cb(null, false);
      } else {
        cb(null, true);
      }
    }
  });
}


let uploadFile = multer({
  storage: storage,
  limits: { fileSize: maxSize },
  fileFilter
}).single("file");

let uploadFilePF = util.promisify(uploadFile);


const upload = async (req, res) => {
  try {
    await uploadFilePF(req, res);

    if (req.file == undefined) {
      if (req.eflag) {
        return res.status(400).send({ message: req.eflag });
      } else {
        return res.status(400).send({ message: 'Please upload a file!' });
      }
    }

    const fSize = Math.round((+req.file.size) / 1024 / 1024 * 100) / 100;

    const objNE = nameExt(req.file.originalname);

    const file = await FileList.create({
      fileName: objNE.fName,
      extension: objNE.fExt,
      fileSize: fSize,
      mimeType: req.file.mimetype,
      userId: req.userId
    });

    res.status(200).send({
      message: "Uploaded the file successfully: " + req.file.originalname,
    });
  } catch (err) {
    if (err.code == "LIMIT_FILE_SIZE") {
      return res.status(500).send({
        message: "File size cannot be larger than 2MB!",
      });
    }

    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
};



const update = async (req, res) => {
  // overwrite existing items ???
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

    await uploadFilePF(req, res);

    if (req.file == undefined) {
      return res.status(400).send({ message: 'Please upload updated file!' });
    }

    let fullName = fileItem.fileName;
    if (fileItem.extension) { fullName += '.' + fileItem.extension; }

    const objNE = nameExt(req.file.originalname);
    const fSize = Math.round((+req.file.size) / 1024 / 1024 * 100) / 100;

    fileItem.fileName = objNE.fName;
    fileItem.extension = objNE.fExt;
    fileItem.fileSize = fSize;
    fileItem.mimeType = req.file.mimetype;
    fileItem.userId = req.userId;
    //fileItem.updatedAt = new Date();

    await fileItem.save();

    const duplicate = await FileList.findOne({
      where: {
        id: { [Op.ne]: fileItem.id },
        [Op.and]: [
          { fileName: fileItem.fileName },
          { extension: fileItem.extension }
        ],
      }
    });

    if (!req.eflag || duplicate) {
      const fPath = path.join(config.get('filesRoot'), fullName);
      await fs.rm(fPath, (err) => {
        if (err) { console.log(err); }
      });
    }

    if (duplicate) {
      await FileList.destroy({ where: { id: duplicate.id } });
    }

    res.json(fileItem);
  } catch (err) {
    if (err.code == "LIMIT_FILE_SIZE") {
      return res.status(500).send({
        message: "File size cannot be larger than 2MB!",
      });
    }

    res.status(500).send({
      message: `Could not upload the file: ${req.file.originalname}. ${err}`,
    });
  }
};


function nameExt(fileName) {
  let fName = '';
  let fExt = '';
  if (fileName.indexOf('.') != -1) {
    fExt =  fileName.split('.').pop();
    const fnArr =  fileName.split('.' + fExt);
    fName = fnArr[0];
  } else {
    fName = fileName;
  }
  return {fName, fExt}
}


/*
const getListFiles = (req, res) => {
  const directoryPath = config.get('filesRoot');

  fs.readdir(directoryPath, function (err, files) {
    if (err) {
      res.status(500).send({
        message: "Unable to scan files!",
      });
    }

    let fileInfos = [];

    files.forEach((file) => {
      fileInfos.push({
        name: file,
        url: baseUrl + file,
      });
    });

    res.status(200).send(fileInfos);
  });
};

const download = (req, res) => {
  const fileName = req.params.name;
  const directoryPath = config.get('filesRoot');

  res.download(directoryPath + fileName, fileName, (err) => {
    if (err) {
      res.status(500).send({
        message: "Could not download the file. " + err,
      });
    }
  });
};
*/

module.exports = {
  upload,
  update,
};
