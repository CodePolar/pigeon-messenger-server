const express = require("express");
const app = express();
const _ = require("underscore");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const {verifyToken} = require("../middlewares/authentication");

app.get("/user/search/:term", verifyToken , (req, res) => {
    let term = req.params.term;
    
    User.find({username: {$regex: term, $options: '<i>'}})
	.limit(5)
    .exec((err, userDB) => {
        if(err) {
            res.status(400).json({
                ok: false,
                err
            })
        }   
        
        res.json({ok: true, user: userDB});
    })


})

app.get('/user/check_username/:term', verifyToken, (req, res) => {
    let term = req.params.term;
    User.find({username: term})
    .limit(20)
    .exec((err, userDB) => {
        if(err) {
            res.status(400).json({
                ok: false,
                err
            })
        }

        res.json({ok: true, user: userDB})

    })


})

app.get("/user/one", verifyToken , (req, res) => {
    let id = req.user._id;

    User.findOne({_id: id, status: true}).populate({path: 'rooms', populate: {path: 'members'} }).exec((err, userDB) => { /* Fix Data Sended */ 
        
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

        res.json({
            ok: true,
            user: userDB
        })
    })
})

app.get("/user", verifyToken, (req, res) => {
    User.find({status: true}).populate("rooms").exec((err, docs) => { 
        if(err) {
            return res.status(400).json({
                ok: false,
                err
            })
        }

        if(docs.length <= 0) {
            return res.status(400).json({
                ok: false,
                msg: "No users in db"
            })
        }

        res.json({
            ok: true,
            user: docs
        })

    })
})

app.post("/user", (req, res) => {
    let {name, username, email, password} = req.body;
    if(password.length === 0) {
        return res.status(400).json({
            ok: false,
            err: "No password"
        })
    }

    let user = new User({name, username: username? username : email, email, password: bcrypt.hashSync(password, 10)});
    
    user.save((err, userDB) => {    

        if(err) {
            return res.status(400).json({
                ok: false,
                err
            })
        }    

        res.json({
            ok: true,
            user: userDB
        })

    })

})

app.put("/user/:id", verifyToken , (req, res) => {
    let id = req.params.id;
    let data = _.pick(req.body, ["name","username","img","description", "client_id" ]);
    
    User.findOneAndUpdate({_id: id, status: true}, data,{ new: true, runValidators: true, context: "query" }, (err, userDB) => {
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

        

        res.json({
            ok: true,
            user: userDB
        })
    })
})

app.post("/cookies", (req, res) => {
    let text = req.body.text;

    res.cookie("token", text, {httpOnly: true, secure: true, sameSite: "none"});

    res.json({
        ok: true, 
        text
    })

})

app.get("/token", (req, res) => {
    let token = req.cookies.token;

    res.json({
        ok: true,
        token: token
    })


})

module.exports = app;
