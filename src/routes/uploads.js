const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const {userUploads} = require("../middlewares/uploads");
const User = require("../models/User");
const { deleteDoc } = require("../helpers/helpers");
const {verifyToken} = require("../middlewares/authentication");

app.post("/user/upload/:id", verifyToken , (req, res) => {
    let id = req.params.id;
    User.findOne({_id: id}, null, null, (err, userDB) => {

        if(err) {
             return res.status(400).json({
                 ok: false,
                 err
             })
        }

        if(!userDB) { 
            return res.status(400).json({
                ok: false,
                err: "The user is not defined"
            })
        }

        userUploads(req, res, (err) => {
            if(err) {
                return res.status(400).json({
                    ok: false,
                    err
                })
            }

            let before = path.resolve(__dirname, `../../uploads/user/${userDB.img}`);
            if(!before === "default.png") {
                deleteDoc(before);
            }
            userDB.img = req.file.filename;
            userDB.save();

            res.json({
                ok: true,
                user: userDB
            })

        })
        
    })
})







module.exports = app;