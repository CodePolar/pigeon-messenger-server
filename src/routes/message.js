const express = require("express");
const app = express();
const Message = require("../models/Message");
const File = require("../models/File");
const Room = require("../models/Room");
const { encrypt, decrypt, deleteDoc } = require("../helpers/helpers");
const { docsUploads } = require("../middlewares/uploads");
const { verifyToken } = require("../middlewares/authentication");

app.post("/message/text", verifyToken, (req, res) => {
  let body = req.body;

  let message = new Message({
    text: encrypt(body.text),
    msgDate: new Date(),
    author: body.author,
    room_id: body.room_id,
  });

  message.save((err, messageDB) => {
    if (err) {
      return res.status(400).json({
        ok: false,
        err,
      });
    }

    res.json({
      ok: true,
      message: messageDB,
    });
  });
});

app.post("/message/docs", verifyToken, (req, res) => {
  docsUploads(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        ok: false,
        err,
      });
    }

    let body = JSON.parse(req.body.document);

    Room.find({ room_id: body.room_id }, (err, roomDB) => {
      if (err) {
        req.files.forEach((doc) => {
          deleteDoc(doc.path);
        });
        return res.status(400).json({
          ok: false,
          err,
        });
      }

      if (!roomDB.length > 0) {
        req.files.forEach((doc) => {
          deleteDoc(doc.path);
        });
        return res.status(400).json({
          ok: false,
          err: "Room Not Defined",
        });
      }

      let docs = req.files.map((val) => {
        return {
          path: val.filename,
          author: body.author,
          room_id: body.room_id,
        };
      });

      let queueMsg = {
        text: body.text,
        msgDate: new Date(),
        author: body.author,
        room_id: body.room_id,
        files: docs,
      };

      for (let room of roomDB) {
        for (let member of room.members) {
          let message = new Message({
            text: encrypt(body.text),
            msgDate: new Date(),
            author: body.author,
            room_id: body.room_id,
            user_id: member,
          });

          message.save((err, messageDB) => {
            if (err) {
              req.files.forEach((val) => {
                deleteDoc(val.path);
              });
              return res.status(400).json({
                ok: false,
                err,
              });
            }

            let docs = req.files.map((val) => {
              return {
                path: val.filename,
                author: messageDB.author,
                room_id: messageDB.room_id,
                message_id: messageDB._id,
              };
            });

            File.insertMany(docs)
              .then((response) => {
                messageDB.files = response;
                messageDB.save((err, msgDB) => {
                  if (err) {
                    return res.status(400).json({
                      ok: false,
                      err,
                    });
                  }
                });
              })
              .catch((err) => {
                res.status(400).json({
                  ok: false,
                  err,
                });
              });
          });
        }
      }

      res.json({
        ok: true,
        message: queueMsg,
      });
    });
  });
});

app.get("/message/:room", verifyToken, (req, res) => {
  let from = Number(req.query.from);
  let room = req.params.room;
  var to = Number(req.query.to);

  Room.find({ room_id: room }).exec((err, roomDB) => {
    if (err) {
      return res.status(400).json({
        ok: false,
        err,
      });
    }

    if (!roomDB.length > 0) {
      return res.status(400).json({
        ok: false,
        err: "The room does not exist",
      });
    }

    Message.find({ room_id: room, user_id: req.user._id })
      .populate("author")
      .exec((err, messageDB) => {
        if (err) {
          return res.status(400).json({
            ok: false,
            err,
          });
        }

        Message.find({ global: true, room_id: room }).exec((err, globalDB) => {
          if (err) {
            res.status(400).json({
              ok: false,
              err,
            });
          }

          messageDB.forEach((msg, i) => {
            messageDB[i].text = decrypt(messageDB[i].text);
          });

          let messages = [...messageDB, ...globalDB];
          let sorted = messages.sort((a, b) => {
            return new Date(b.msgDate) - new Date(a.msgDate);
          });

          let count = sorted.length;
          let hasMore = true;
          if (count < to) {
            to = count;
            console.log(from);
            hasMore = false;
          }

          sorted = sorted.slice(from, to);

          res.json({
            ok: true,
            message: sorted,
            count,
            hasMore,
          });
        });
      });
  });
});

app.post("/message/unread", verifyToken, (req, res) => {
  let body = req.body;

  Message.find({ room_id: body.room_id, watched: false, user_id: req.user._id })
    .nor([{ author: req.user._id }])
    .countDocuments((err, count) => {
      if (err) {
        return res.status(400).json({
          ok: false,
          err,
        });
      }

      res.json({
        ok: true,
        count,
      });
    });
});

app.put("/message/readed", verifyToken, (req, res) => {
  let room = req.body.room_id;
  Message.updateMany(
    { room_id: room, user_id: req.user._id },
    { watched: true },
    { new: true, runValidators: true, context: "query" }
  ).exec((err, messagesDB) => {
    if (err) {
      return res.status(400).json({
        ok: false,
        err,
      });
    }

    return res.json({
      ok: true,
      messages: messagesDB,
    });
  });
});

app.get("/message/last/:room_id", verifyToken, (req, res) => {
  let room_id = req.params.room_id;

  Message.find({ room_id, user_id: req.user._id })
    .populate("author")
    .exec((err, messagesDB) => {
      if (err) {
        return res.status(400).json({
          ok: false,
          err,
        });
      }

      Message.find({ global: true, room_id }).exec((err, globalDB) => {
        if (err) {
          return res.status(400).json({
            ok: false,
            err,
          });
        }

        let messages = [...messagesDB, ...globalDB];
        let sorted = messages.sort((a, b) => {
          return new Date(a.msgDate) - new Date(b.msgDate);
        });

        let one = null;

        if (sorted.length > 1) {
          one = sorted.pop();
          if (!one.global) {
            one.text = decrypt(one.text);
          } else {
          }
          res.json({
            ok: true,
            messages: [one],
          });
          return;
        }

        res.json({
          ok: true,
          messages: null,
        });
      });
    });
});

module.exports = app;
