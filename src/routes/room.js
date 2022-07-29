const express = require("express");
const app = express();
const Room = require("../models/Room");
const Message = require("../models/Message");
const User = require("../models/User");
const uuid = require("uuid").v4
const _ = require("underscore");
const { userExist } = require("../helpers/helpers");
const { verifyToken } = require("../middlewares/authentication");
const { roomUploads } = require("../middlewares/uploads");
const Contact = require("../models/Contact");

app.get("/room", verifyToken, (req, res) => {
    // admin: {$not: {$ne: null}} not show a null value
    Room.find({ status: true }).populate(["admin", "members"]).exec((err, docs) => {
        if (err) {
            return res.status(400).json({
                ok: false,
                err
            })
        }

        if (!docs) {
            return res.status(400).json({
                ok: false,
                err: "There are not rooms"
            })
        }

        res.json({
            ok: true,
            rooms: docs
        })
    })
})

app.get("/room/:id", verifyToken, (req, res) => {
    let id = req.params.id;

    Room.find({ _id: id, status: true }).populate("members", 'name username email img description client_id').exec((err, roomDB) => {
        if (err) {
            return res.status(400).json({
                ok: false,
                err
            })
        }

        if (!roomDB) {
            return res.status(400).json({
                ok: false,
                err: "Room not exist"
            })
        }

        res.json({
            ok: true,
            room: roomDB
        })
    })

})


app.post("/room", verifyToken, (req, res) => {
    roomUploads(req, res, (err) => {
        if (err) {
            console.log(err);
            res.status(400).json({
                ok: false,
                err
            })
        }

        const data = JSON.parse(req.body.document);
        let room;


        if (req.file) {
            room = new Room({ ...data, img: req.file.filename, room_id: uuid() });
        } else {
            room = new Room({ ...data, img: "default.png", room_id: uuid() });
        }


        room.save((err, roomDB) => {
            if (err) {
                return res.status(400).json({
                    ok: false,
                    err
                })
            }


            User.findOneAndUpdate({ username: data.admin.username }, { $push: { rooms: roomDB._id } })
                .exec(async (err, userDB) => {
                    if (err) {
                        return res.status(400).json({
                            ok: false,
                            err
                        })
                    }

                    let message = new Message({ text: `Welcome to ${roomDB.name}`, global: true, room_id: roomDB.room_id, msgDate: new Date() });
                    message.save((err, messageDB) => {
                        if (err) {
                            return res.status(400).json({
                                ok: false,
                                err
                            })
                        }

                        res.json({
                            ok: true,
                            room: roomDB
                        })
                    })


                })

        })

    })


    /* DEPRECATED */

    // let room = new Room({ name, members, admin, room_id: uuid() });

    // if (Array.isArray(room.members)) {
    //     for (let member of room.members) {
    //         User.findByIdAndUpdate(member, { $push: { rooms: room._id } }, { new: true, runValidators: true, context: "query" }, (err, userDB) => {
    //             if (err) {
    //                 return res.status(400).json({
    //                     ok: false,
    //                     err
    //                 })
    //             }


    //             if (!userDB) {
    //                 return res.status(400).json({
    //                     ok: false,
    //                     err: "User does not exist"
    //                 })
    //             }



    //             console.log({ ok: true }, userDB);
    //         })
    //     }
    // } else {
    //     User.findByIdAndUpdate(room.members, { $push: { rooms: room._id } }, { new: true, runValidators: true, context: "query" }, (err, userDB) => {
    //         if (err) {
    //             return res.status(400).json({
    //                 ok: false,
    //                 err
    //             })
    //         }


    //         if (!userDB) {
    //             return res.status(400).json({
    //                 ok: false,
    //                 err: "User does not exist"
    //             })
    //         }

    //         console.log({ ok: true }, userDB)
    //     })
    // }

    // room.save((err, roomDB) => {
    //     if (err) {
    //         return res.status(400).json({
    //             ok: false,
    //             err
    //         })
    //     }
    //     if (!roomDB) {
    //         return res.status(400).json({
    //             ok: false,
    //             err: "Room not exist"
    //         })
    //     }


    //     res.json({
    //         ok: true,
    //         room: roomDB
    //     })
    // })

})

app.put("/room/:id/:type", verifyToken, (req, res) => {
    let { id, type } = req.params;

    if (type === "member") {
        let data = _.pick(req.body, ["member"]);

        if (data.member) {
            Room.findOneAndUpdate({ _id: id, status: true }, { $addToSet: { members: [data.member] } }, { new: true, runValidators: true, context: "query" }, (err, roomDB) => {
                User.findByIdAndUpdate(data.member, { $addToSet: { rooms: roomDB._id } }, { new: true, runValidators: true, context: "query" }, (err, userDB) => {

                    if (err) {
                        return res.status(400).json({
                            ok: false,
                            err
                        })
                    }


                    if (!userDB) {
                        return res.status(400).json({
                            ok: false,
                            err: "User does not exist"
                        })
                    }

                })

                if (err) {
                    return res.status(400).json({
                        ok: false,
                        err
                    })
                }

                if (roomDB.n === 0) {
                    return res.status(400).json({
                        ok: false,
                        err: "Room not exist"
                    })
                }

                res.json({
                    ok: true,
                    room: roomDB
                })
            })
        } else {
            return res.status(400).json({
                ok: false,
                err: "Member is not defined"
            })
        }

    } else if (type === "default") {
        let data = _.pick(req.body, ["name", "admin", "status"]);
        Room.updateOne({ _id: id, status: true }, data, { new: true, runValidators: true, context: "query" }, (err, roomDB) => {
            if (err) {
                return res.status(400).json({
                    ok: false,
                    err
                })
            }

            if (roomDB.n === 0) {
                return res.status(400).json({
                    ok: false,
                    err: "Room not exist"
                })
            }

            res.json({
                ok: true,
                room: roomDB
            })

        })
    } else {
        return res.status(400).json({
            ok: false,
            err: "Not valid type"
        })
    }
})

app.delete("/room/:id/:memberID?/:type", verifyToken, (req, res) => {
    let { id, type } = req.params;
    if (type === "member") {
        if (req.params.memberID) {
            let memberID = req.params.memberID;
            Room.findOneAndUpdate({ _id: id, status: true }, { $pullAll: { members: [memberID] } }, { new: true, runValidators: true, context: "query" }, (err, roomDB) => {

                User.findOneAndUpdate({ _id: memberID }, { $pullAll: { rooms: [{ _id: roomDB._id }] } }, { new: true, runValidators: true, context: "query" }, (err, userDB) => {
                    if (err) {
                        return res.status(400).json({
                            ok: false,
                            err
                        })
                    }

                    if (!userDB) {
                        res.status(400).json({
                            ok: false,
                            err: "Member is not defined"
                        })
                    }

                })

                if (err) {
                    return res.status(400).json({
                        ok: false,
                        err
                    })
                }

                if (!roomDB) {
                    return res.status(400).json({
                        ok: false,
                        err: "Room not exist"
                    })
                }

                res.json({
                    ok: true,
                    room: roomDB
                })
            })
        } else {
            return res.status(400).json({
                ok: false,
                err: "Member is not defined"
            })
        }
    } else if (type === "default") {
        Room.findOneAndUpdate({ _id: id }, { status: false }, { new: true, runValidators: true, context: "query" }, (err, roomDB) => {

            if (err) {
                return res.status(400).json({
                    ok: false,
                    err
                })
            }

            if (roomDB.n === 0) {
                return res.status(400).json({
                    ok: false,
                    err: "Room not exist"
                })
            }

            if (Array.isArray(roomDB.members)) {
                User.updateMany({ _id: { $in: roomDB.members } }, { $pullAll: { rooms: [roomDB._id] } }, { new: true, runValidators: true, context: "query" }, (err, userDB) => {
                    if (err) {
                        return res.status(400).json({
                            ok: false,
                            err
                        })
                    }

                    if (!userDB) {
                        return res.status(400).json({
                            ok: false,
                            err: "User does not exist"
                        })
                    }
                })
            }

            res.json({
                ok: true,
                room: roomDB
            })

        })
    } else {
        return res.status(400).json({
            ok: false,
            err: "Not valid type"
        })
    }

})

app.get("/room/search/:term", verifyToken, (req, res) => {
    let term = req.params.term;

    let regex = new RegExp(term, "i");
    if (term.length > 0) {
        Contact.find({ nickname: regex, user_id: req.user._id })
            .populate("contact_id")
            .exec((err, usersDB) => {
                if (err) {
                    console.log(err);
                    return res.status(400).json({
                        ok: false,
                        err
                    })
                }

                Room.find({ name: regex, members: req.user._id, kind: null })
                    .exec((err, roomsDB) => {
                        if (err) {

                            return res.status(400).json({
                                ok: false,
                                err
                            })
                        }

                        return res.json({
                            ok: true,
                            rooms: [...usersDB, ...roomsDB]
                        })


                    })


            })

    } else {
        res.json({
            ok: true,
            rooms: []
        })
    }
})


module.exports = app;