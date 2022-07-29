const express = require("express");
const app = express();
const User = require("../models/User");
const Contact = require("../models/Contact");
const Room = require("../models/Room");
const uuid = require("uuid").v4;
const {userExist} = require("../helpers/helpers");
const { verifyToken, verifyTokenUrl } = require("../middlewares/authentication");


app.post("/contact", verifyTokenUrl, (req, res) => { // User who accept send the room_id in notification socket to match the room_id

    let username = req.body.username;
    User.findOne({ username }).exec((err, userDB) => {

        if (err) {
            return res.status(400).json({
                ok: false,
                err
            })
        }

        if (!userDB) {
            return res.status(400).json({
                ok: false,
                err: "User Does Not Exist"
            })
        }


        let room = new Room({
            name: ":D", room_id: uuid(), members: [req.user._id, userDB._id],kind: "contact_room" 
        })

        room.save((err, roomDB) => {
            if (err) {
                return res.status(400).json({
                    ok: false,
                    err
                })
            }

            if (!roomDB) {
                return res.status(400).json({
                    ok: false,
                    err: "Room is not defined"
                })
            }
            
            let contact = new Contact({
                contact_id: userDB._id,
                room_id: roomDB.room_id,
                user_id: req.user._id,
                nickname: userDB.username
            })
            contact.save((err, contactDB) => {
                if (err) {
                    return res.status(400).json({
                        ok: false,
                        err
                    })
                }

                if (!contactDB) {
                    return res.status(400).json({
                        ok: false,
                        err: "Contact is not defined"
                    })
                }

                res.json({
                    ok: true,
                    contact: contactDB
                })

            })

        })
    })
});

app.put("/contact", verifyTokenUrl , (req, res) => {
    let {room_id, username} = req.body;

    User.findOne({username}).exec((err, userDB) => {
        if (err) {
            return res.status(400).json({
                ok: false,
                err
            })
        }

        if (!userDB) {
            return res.status(400).json({
                ok: false,
                err: "User Does Not Exist"
            })
        }

        let contact = new Contact({
            user_id: userDB._id, room_id, contact_id: req.user._id, nickname: req.user.username

        })

        contact.save((err, contactDB) => {
            if (err) {
                return res.status(400).json({
                    ok: false,
                    err
                })
            }

            if (!contactDB) {
                return res.status(400).json({
                    ok: false,
                    err: "Contact is not defined"
                })
            }

            res.json({
                ok: true,
                contact: contactDB
            })
        })
    })
})

app.get("/contact", verifyToken, (req, res) => {
    let id = req.user._id;

    Contact.find({user_id: id})
    .populate("contact_id")
    .exec((err, contactsDB) => {
        if (err) {
            return res.status(400).json({
                ok: false,
                err
            })
        }

        res.json({
            ok: true,
            contacts: contactsDB
        })

    })

})

app.post("/contact/on", verifyToken , (req, res) => {
    let user = req.user;
    let to = req.body.to;
	console.log(user);
	console.log(to);
    userExist({username: to}, (resp) => {
        if(!resp.ok) {
            return res.status(400).json({
                ok: false,
                err: resp.err
            })
        }

        Contact.find({user_id: user._id, contact_id: resp.user._id})
        .exec((err, contactDB) => {

            if (err) {
                return res.status(400).json({
                    ok: false,
                    err
                })
            }
			
			console.log(contactDB);

			
            res.json({
                ok: true,
                contact: contactDB 
            })

        })

    })

})



module.exports = app;

