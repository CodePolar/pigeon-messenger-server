require('../config/config');

const { io } = require("../server");
const axios = require("axios");

const User = require("../models/User");
const Bell = require("../models/Bell");
const Room = require("../models/Room");

const { validateBell,userExist, bellExist, createBell, multipleMessages, createGlobal, decrypt } = require("../helpers/helpers");
const { verify } = require("../middlewares/authentication");


const user = new User();
let users = [];

io.on("connection", (client) => {

    client.on("start", ({ token, rooms, type }, cb) => {
        if (type === null) {
            client.join(rooms);

            let { user } = verify(token);

            for (room of client.rooms) {
                if (room != client.id) {
                    client.to(room).emit("userConnect", { room_id: room })
                }
            }

            return cb({ ok: true })
        } else {
            let { user } = verify(token);

            User.findByIdAndUpdate(user._id, { online: true }, (err, userDB) => {
                if (err) {
                    return cb({ ok: false, err })
                }

            })


            users.push({ user: user.username, socketid: client.id });

            client.join(`${user.username}/bells`);
            return cb({ ok: true });
        }
    })


    client.on("contact-request", ({ requester, text, to, img, token }, cb) => {
        let requesterUnique = requester.split("/")[0];
        userExist({ username: requesterUnique }, (respA) => {
            if (!respA.ok) {
                return cb({ ok: false, err: respA.err });
            }
            userExist({ username: to }, (respB) => {
                if (!respB.ok) {
                    return cb({ ok: false, err: respB.err });
                }


                if (respA.user.username === respB.user.username) {
                    return cb({ ok: false, err: "You cant request yourself" })
                }   
				// ${process.env.SRV_URL}/ previous production url
                validateBell(respA.user, respB.user, cb, () => {
					console.log(process.env.SRV_URL)
                    axios.post(`${process.env.SRV_URL}/bell?token=${token}`, {
                        request: "REQUEST",
                        title: `${requesterUnique} send you contact request`,
                        text,
                        img,
                        requester,
                        user_id: respB.user._id
                    },
                    ).then(res => {

                        let data = res.data.bell;
                        data.requester = requesterUnique;
                        io.in(`${to}/bells`).emit("notify", { bell: data, ring: true });
                        cb({ ok: true });
                    }).catch(err => {
                        return cb({ ok: false, err });
                    })
                })
            })
        })
    });

    client.on("room_request", ({ requester, user_id, username, room_id, img, title, description }, cb) => {
        let bell = new Bell({
            request: "REQUEST_ROOM",
            requester: `${requester}/${username}/${room_id}`,
            user_id,
            room_id,
            title: `${requester} invite you to join ${title} room`,
            text: `${description}`,
            img
        })

        bell.save((err, bellDB) => {
            if (err) {
                return cb({ ok: false, err })
            }
            
            io.in(`${username}/bells`).emit("notify", { bell: bellDB, ring: true })
            cb({ ok: true, ring: true })
        })

    })

    client.on("room_declined", ({ id, img }, cb) => {
        Bell.findOneAndDelete({ _id: id }).exec((err, bellDB) => {
            if (err) {
                return cb({ ok: false, err })
            }

            Room.findOne({ room_id: bellDB.room_id })
                .exec((err, roomDB) => {
                    if (err) {
                        return cb({ ok: false, err })
                    }

                    userExist({ username: bellDB.requester.split("/")[0] }, (res) => {
                        let bell = new Bell({
                            requester: `${bellDB.requester.split("/")[1]}/${bellDB.requester.split("/")[0]}/${roomDB.room_id}/declined`,
                            request: "ROOM_DECLINED",
                            user_id: res.user._id,
                            title: `${bellDB.requester.split("/")[1]} delined your request to join "${roomDB.name}"`,
                            img
                        })
                        bell.save((err, bellDB) => {
                            if (err) {
                                return cb({ ok: false, err })
                            }

                            io.in(`${bellDB.requester.split("/")[1]}/bells`).emit("notify", { bell: bellDB, ring: true })
                            io.in(`${bellDB.requester.split("/")[0]}/bells`).emit("notify", { bell: {request: "REFRESH"}, ring: false })

                        })
                    })
                })
        })
    })

    client.on("room_accepted", ({id, img}, cb) => {
        Bell.findOneAndDelete({_id: id})
        .exec((err, bellDB) => {

            if (err) {
                return cb({ ok: false, err })
            }

            if(!bellDB) {
                return cb({ok: false, err: "Error"});
            }

            Room.findOneAndUpdate({room_id: bellDB.room_id}, {$addToSet: {members: bellDB.user_id}}, {new: true, runValidators: true, context: "query"})
            .populate("user_id")
            .populate("members")
            .exec((err, roomDB) => {
                if(err) {
                    return cb({ok: false, err});
                }

                User.findOneAndUpdate({_id: bellDB.user_id}, {$addToSet: {rooms: roomDB._id}},{new: true, runValidators: true, context: "query"})
                .exec((err, userDB) => {
                    if(err) {
                        return cb({ok: false, err})
                    }

                    let members = roomDB.members;
                    for(let member of members) {
                        if(member.username !== userDB.username) {
                            let bell = new Bell({request: "ADDED_TO_ROOM", requester: `${roomDB.room_id}/${userDB.username}/${member.username}/added`, img: roomDB.img, title: `${userDB.username} added to ${roomDB.name} room`, user_id: member._id, room_id: roomDB.room_id })
                            bell.save((err, bellDB) => {
                                if(err) {
                                    cb({ok: false, err})
                                }
                                io.in(`${member.username}/bells`).emit("notify", {bell: bellDB, ring: true})
                            })
                        }
                    }
                
                    io.in(`${bellDB.requester.split("/")[1]}/bells`).emit("notify", {bell: {request: "REFRESH_ROOMS"}, ring: false})

                })
            })
        })
    })

    client.on("reject-contact", ({ id, token }, cb) => {
        Bell.findByIdAndDelete(id)
            .exec((err, bellDB) => {
                if (err) {
                    cb({ ok: false, err })
                }

                if (!bellDB) {
                    cb({ ok: false, err: "Bell does not exist" })
                }

                userExist({ username: bellDB.requester.split("/")[0] }, (resp) => {
                    if (!resp.ok) {
                        return cb({ ok: false, err: resp.err })
                    }
                    let formatReq = `${bellDB.requester.split("/")[1]}/${bellDB.requester.split("/")[0]}/declined`

                    createBell(token, "REQUEST_DECLINED", resp.user._id, formatReq, "", (resp) => {
                        if (!resp.ok) {
                            return cb({ ok: false, err: resp.err })
                        }

                        cb({ ok: true, bell: resp.bell });

                        io.in(`${bellDB.requester.split("/")[1]}/bells`).emit("notify", { bell: { request: "REQUEST_DECLINED" }, ring: false });

                        io.in(`${bellDB.requester.split("/")[0]}/bells`).emit("notify", { bell: resp.bell, ring: true });

                    })
                })
            })
    })



    client.on("contact-accepted", ({ id, token, img }, cb) => {

        bellExist({ _id: id }, async (resp) => {
            if (!resp.ok) {
                return cb({ ok: false, err: resp.err });
            }
			
			

            let bellDB = resp.bell;

            let resA = await axios.post(`${process.env.SRV_URL}/contact?token=${token}`,
                { username: bellDB.requester.split("/")[0] });  // me
            let resB = await axios.put(`${process.env.SRV_URL}/contact?token=${token}`,
                { room_id: resA.data.contact.room_id, username: bellDB.requester.split("/")[0] }); // other

            Bell.findByIdAndDelete(id).exec(async (err, bellRemoved) => {

                if (err) {
                    return cb({ ok: false, err });
                }

                createBell(token, "CONTACT_ADDED", resA.data.contact.user_id, bellRemoved.requester, "", (respA) => {
                    if (!respA.ok) {
                        return cb({ ok: false, err: resp.err });
                    }

                    io.in(`${bellDB.requester.split("/")[1]}/bells`).emit("notify", { bell: respA.bell, ring: false }); // me

                }).then(() => {
                    createBell(token, "REQUEST_ACCEPTED", resB.data.contact.user_id, "", `${resA.data.contact.user_id}/${bellRemoved.requester.split("/")[0]}`, (respB) => {
                        if (!resp.ok) {
                            return cb({ ok: false, err: resp.err });
                        }
                        io.in(`${bellDB.requester.split("/")[0]}/bells`).emit("notify", { bell: respB.bell, ring: true });
                    });
                })
            })
        })
    })

    client.on("sendMessage", ({ user, message, room, type }, callback) => {
        
        if(type === "docs") {
            userExist({_id: message.author}, (data) => {
                let messageFormatted = message;
                messageFormatted.author = data.user;
                io.in(room).emit("onMessage", {message, user, room});
                return;
            })
        }

        multipleMessages({ room, user, message, type }, (res) => {
            if (!res.ok) {
                return callback({ ok: false, err: res.err })
            }

            if(type !== "docs") {
                if(res.message) {
                    userExist({_id: res.message.author}, (resp) => {
                        let message = res.message;
                        message.author = resp.user;
                        message.text = type !== "docs"? decrypt(message.text) : message.text;
                        
                        io.in(room).emit("onMessage", { message, user, room});
        
                    })
                }
            } 
    
        })

    })

    client.on("room_settings", ({type, value, room_id, author}, cb) => {
        createGlobal({room_id, author, type, value}, (res) => {
            if(!res.ok) {
                return cb({ok: false, err: res.err}) 
            }   

            io.in(room_id).emit("onMessage", {message: res.message, user: author, room: room_id});
            io.in(room_id).emit("notify", {bell: {request: "REFRESH_ROOMS"}, ring: false});
            
            cb({ok: true});
        })
    })

    client.on("disconnecting", (reason) => {
        for (room of client.rooms) {
            if (room !== client.id) {
                let user = users.filter(e => e.socketid === client.id)[0];
                if (user) {
                    User.updateOne({ username: user.user }, { online: false })
                        .exec((err, userDB) => {
                            client.to(room).emit("userDisconnect", { room_id: room });
                        })
                }
            }
        }
    })

});
