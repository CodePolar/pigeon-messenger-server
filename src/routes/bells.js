const express = require("express");
const app = express();
const Bell = require("../models/Bell");
const User = require("../models/User");
const {verifyToken, verifyTokenUrl} = require("../middlewares/authentication");

app.post("/bell", verifyTokenUrl ,(req, res) => {
    let {request, title, text, requester, img, user_id} = req.body
    
    User.findOne({_id: user_id}, (err, userDB) => {
        if(err) {
            return res.status(400).json({
                ok: false,
                err
            })
        }

        if(!userDB) {
            return res.status(400).json({
                ok: false,
                err: "User does not exist"
            })
        }   

        let bell = new Bell({
            user_id, request, title, text, img, requester, date: new Date()
        })

        bell.save((err, bellDB) => {
            if(err) {
                return res.status(400).json({
                    ok: false,
                    err
                })
            }

            res.json({
                ok: true,
                bell: bellDB
            })

        });


    })


})

app.put("/bell/readed", verifyToken, (req, res) => {
    Bell.updateMany({user_id: req.user._id}, {watched: true}, {new: true, runValidators: true, context: "query"})
    .exec((err, bellsDB) => {
        if(err) {
            return res.status(400).json({
                ok: false,
                err
            })
        }

        res.json({
            ok: true,
            bells: bellsDB
        })

    })
    
})

app.delete("/bell/:requester",verifyToken , (req, res) => {
    let id = req.user._id;
    let requester = req.params.requester;

    Bell.findOneAndDelete({user_id: id, requester}, (err, bellRemoved) => {
        if(err) {
            return res.status(400).json({
                ok: false,
                err
            })
        }

        if(!bellRemoved) {
            return res.status(400).json({
                ok: false,
                err: "Bell does not exist"
            })
        }

        res.json({
            ok: true,
            bell: bellRemoved
        })
    })
})

app.get("/bell", verifyToken, (req, res) => {
    Bell.find({user_id: req.user._id}).exec((err, bellsDB) => {
        if(err) {
            return res.status(400).json({
                ok: false,
                err
            })
        }

        res.json({
            ok: true,
            bells: bellsDB
        })

    })
})

module.exports = app;
