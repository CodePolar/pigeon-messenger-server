require("../config/config");
const CryptoJS = require("crypto-js");
const User = require("../models/User");
const Bell = require("../models/Bell");
const Room = require("../models/Room");
const Message = require("../models/Message");
const axios = require("axios");
const fs = require("fs");

const createMessage = (name, room, message) => {
    return { name, room, message, date: new Date().getTime() }
}

/* Encryption */

const encrypt = (text) => {
    return CryptoJS.AES.encrypt(text, process.env.CRYPTOKEY).toString();
}

const decrypt = (cipher) => {
    return CryptoJS.AES.decrypt(cipher, process.env.CRYPTOKEY).toString(CryptoJS.enc.Utf8);
}

/* Docs */

const deleteDoc = (path) => {
    if (fs.existsSync(path)) {
        fs.unlinkSync(path);
    }
}

/* Bells */

const validateBell = (userA, userB, cb, callback) => {

    Bell.findOne({ user_id: userA._id, requester: `${userB.username}/${userA.username}` }).exec((err, bellDB) => {
        if (err) {
            return cb({ ok: false, err })
        }

        if (bellDB) {
            return cb({ ok: false, err: "You have a pending request from this user" })
        }

        Bell.findOne({ user_id: userB._id, requester: `${userA.username}/${userB.username}` }).exec((err, bellDB) => {
            if (err) {
                return cb({ ok: false, err });
            }

            if (bellDB) {
                return cb({ ok: false, err: "You already request this user" });
            }

            callback();
        })
    })
}

const userExist = async (filter, cb) => {
    User.findOne(filter).exec((err, userDB) => {
        if (err) {
            return cb({ ok: false, err })
        }

        if (!userDB) {
            return cb({ ok: false, err: "User does not exist" });
        }

        return cb({ ok: true, user: userDB })

    })
}

const bellExist = (filter, cb) => {
    Bell.findOne(filter).exec(async (err, bellDB) => {

        if (err) {
            return cb({ ok: false, err });
        }

        if (!bellDB) {
            return cb({ ok: false, err: "This bell does not exist" })
        }

        return cb({ ok: true, bell: bellDB });

    })
}

const createBell = async (token, request, user_id, requester, opt, cb) => {
    let formattedOpt = opt ? opt.split("/")[1] : "";
    userExist({ _id: opt.split("/")[0] }, (res) => {
        if (requester === "") {
            requester = `${res.user.username}/${formattedOpt}`;
        }

        switch (request) {
            case "CONTACT_ADDED":
                title = `${requester.split("/")[0]} Added to your contacts`;
                break;
            case "REQUEST_ACCEPTED":
                title = `${requester.split("/")[0]} Accept your contact request`;
                break;
            case "REQUEST_DECLINED":
                title = `${requester.split("/")[0]} Declined your request`
            default:
                break;
        }

        userExist({ username: requester.split("/")[0] }, async (resp) => {
            try {

                if (!resp.ok) {
                    return cb({ ok: false, err: resp.err })
                }

                let { user } = resp;

				let bell = await axios.post(`${process.env.SRV_URL}/bell?token=${token}`, {
                    request,
                    title,
                    img: user.img,
                    text: "",
                    user_id,
                    requester: requester
                })

                return cb({ ok: true, bell: bell.data.bell })

            } catch (err) {
                return cb({ ok: false, err })
            }
        })

    })
}

const multipleMessages = ({ room, user, message, type }, cb) => {

    Room.findOne({ room_id: room })
        .exec((err, roomDB) => {
            if (err) {
                return cb({ ok: false, err });
            }

            if (!roomDB) {
                return cb({ ok: false, err });
            }

            if (type === "text") {
                for (let member of roomDB.members) {

                    let messageDB = new Message({
                        msgDate: new Date(),
                        author: user._id,
                        room_id: room,
                        text: encrypt(message),
                        user_id: member
                    })

                    messageDB.save((err, messageDB) => {
                        if (err) {
                            return callback({ ok: false, err })
                        }


                    })
                }
                
                cb({ ok: true, room: roomDB, message: {
                    msgDate: new Date(),
                    author: user._id,
                    room_id: room,
                    text: encrypt(message)
                }})

            } else {

                cb({ ok: true, message, res:0})
            }


        })

}

const createGlobal = ({ room_id, author, type, value }, cb) => {
    Room.findOne({ room_id })
        .exec((err, roomDB) => {
            if (err) {
                return cb({ ok: false, err })
            }
            
            let text;

            switch (type) {
                case "title":
                    text = `${author.username} changed the title to ${value}`;
                    break;
                case "add_member":
                    text = `${value} ${roomDB.name}`;
                    break;
                default:
                    text = "";
                    break;
            }

            let message = new Message({
                text,
                global: true,       
                room_id: roomDB.room_id,
                msgDate: new Date()
            })

            message.save((err, messageDB) => {
                if(err) {
                    return cb({ok: false, err})
                }

                return cb({ok: true, message: messageDB})

            })
        })
}

module.exports =
{
    createMessage,
    encrypt,
    decrypt,
    deleteDoc,
    validateBell,
    userExist,
    bellExist,
    createBell,
    multipleMessages,
    createGlobal
}
