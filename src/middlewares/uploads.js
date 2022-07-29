const multer = require("multer");
const path = require("path");
const uuid = require("uuid").v4;

const storage = {
    user: multer.diskStorage({
        destination: path.resolve(__dirname, '../../uploads/user'),
        filename: (req, file, cb) => {
            cb(null, `${uuid()}${path.extname(file.originalname).toLocaleLowerCase()}`)
        }
    }),
    docs: multer.diskStorage({
        destination: path.resolve(__dirname, '../../uploads/docs'),
        filename: (req, file, cb) => {
            cb(null, `${uuid()}${path.extname(file.originalname).toLocaleLowerCase()}`)
        }
    }),
    rooms: multer.diskStorage({
        destination: path.resolve(__dirname, '../../uploads/room'),
        filename: (req, file, cb) => {
            cb(null, `${uuid()}${path.extname(file.originalname).toLocaleLowerCase()}`)
        }
    })
}

const fileFilter = (req, file, cb) => {
    let allowed = ["jpg", "png", "jpeg", "gif"];

    let fileExt = path.extname(file.originalname).toLocaleLowerCase().split('.');

    if (allowed.indexOf(fileExt[1]) >= 0) {
        cb(null, true);
    } else {
        return cb(new Error("Extension is not allowed"));
    }
}

const userUploads = multer({
    storage: storage.user,
    dest: path.resolve(__dirname, '../../uploads/user'),
    fileFilter,
    limits: [{fileSize: 90000}]
}).single('photo');

const docsUploads = multer({
    storage: storage.docs,
    dest: path.resolve(__dirname, '../../uploads/docs'),
    fileFilter,
    limits: [{fileSize: 90000}]
}).array("docs", 10);

const roomUploads = multer({
    storage: storage.rooms,
    dest: path.resolve(__dirname, '../../uploads/room'),
    fileFilter,
    limits: [{fileSize: 90000}]
}).single('photo');

module.exports = {
    userUploads,
    docsUploads,
    roomUploads
};