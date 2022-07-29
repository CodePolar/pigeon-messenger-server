const express = require("express");
const app = express();
const fs = require("fs");
const path = require("path");
const File = require("../models/File");
const Room = require("../models/Room");
const {deleteDoc} = require("../helpers/helpers");
const {verifyToken, verifyTokenUrl} = require("../middlewares/authentication");

app.get("/upload/:type/:file", verifyTokenUrl ,(req, res) => {
    let file = req.params.file;
    let type = req.params.type;
    let noPath = path.resolve(__dirname, "../assets/404.jpg");
    let filePath = path.resolve(__dirname, `../../uploads/${type}/${file}`);
    if(!fs.existsSync(filePath)) {
        res.status(404).sendFile(noPath);
    } else {
        res.sendFile(filePath)
    }
})

app.delete("/upload/:room", (req, res) => {
    let room = req.params.room;
    File.find({room_id: room}, (err, filesDB) => {
        if(err) {
            return res.status(400).json({
                ok: false,
                err
            })
        }

        filesDB.forEach(doc => {
            let pathDoc = path.resolve(__dirname, `../../uploads/docs/${doc.path}`);
            deleteDoc(pathDoc);
        })

        File.deleteMany({room_id: room})
        .then(response => {
            res.json({
                ok: true,
                files: response
            })
        })
        .catch(err => {
            res.status(400).json({
                ok: false,
                err
            })
        })

    })
})

app.get("/upload/:room", verifyToken , (req, res) => {
    let room = req.params.room;
    Room.find({room_id: room}, (err, roomDB) => {

        if(err) {
            return res.status(400).json({
                ok: false,
                err
            })
        }

        if(!roomDB.length > 0) {
            return res.status(400).json({
                ok: false,
                err: "This room does not exist"
            })
        }

        File.find({room_id: room})
        .populate("author")
        .exec((err, filesDB) => {
            if(err) {
                return res.status(400).json({
                    ok: false,
                    err
                })
            }   

            res.json({
                ok: true, 
                files: filesDB
            })

        })

    })
    

}) 



module.exports = app;