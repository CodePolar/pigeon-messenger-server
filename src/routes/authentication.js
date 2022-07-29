const express = require("express");
const app = express();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const { verifyToken } = require("../middlewares/authentication");
const { OAuth2Client } = require("google-auth-library"); // Google token verify
const client = new OAuth2Client(process.env.CLIENT_ID);

app.post("/login", (req, res) => {
    let body = req.body;
    User.findOne({ email: body.email }, (err, userDB) => {
        if (err) {
            return res.status(400).json({
                ok: false,
                err
            })
        }

        if (!userDB) {
            return res.status(400).json({
                ok: false,
                err: "User not found"
            })
        }

        if(userDB.google) {
            return res.status(400).json({
                ok: false,
                err: "Incorrect authentication method"
            })
        }

        if (!bcrypt.compareSync(body.password, userDB.password)) {
            return res.status(400).json({
                ok: false,
                err: "User or password incorrect"
            })
        }

        let token = jwt.sign({ user: userDB }, process.env.TOKEN_SEED, { expiresIn: process.env.TOKEN_EXP });

        // res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });

        res.send({
            ok: true,
            user: userDB,
            token: token
        });

    })
})

app.post("/refresh_token", verifyToken, (req, res) => {

    if (!req.user) {
        return res.status(400).json({
            ok: false,
            err: "Not valid Token"
        })
    }

    User.findOne({ _id: req.user._id }).populate('rooms').exec((err, userDB) => {
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

        let token = jwt.sign({ user: userDB }, process.env.TOKEN_SEED, { expiresIn: process.env.TOKEN_EXP });

        // res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });

        res.json({
            ok: true,
            user: userDB,
            token: token
        })

    });

})

async function verify(token) {
    // Verify the token and the function returns the payload
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
        // Or, if multiple clients access the backend:
        //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
    });

    const payload = ticket.getPayload();

    return {
        name: payload.name,
        email: payload.email,
        img: payload.picture,
        google: true,
    };

}

app.post("/google", async (req, res) => {
    let token = req.body.idtoken;

    let googleUser = await verify(token).catch((err) => {
        return res.status(400).json({
            ok: false,
            err
        })
    })

    User.findOne({ email: googleUser.email })
        .exec((err, userDB) => {
            if (err) {
                return res.status(400).json({
                    ok: false,
                    err
                })
            }

            if (userDB) {
                if (!googleUser.google) {
                    return res.status(400).json({
                        ok: false,
                        err: "The users need to use another authentication",
                    });
                } else {
                    let token = jwt.sign({ user: userDB }, process.env.TOKEN_SEED, { expiresIn: process.env.TOKEN_EXP });

                    // res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });

                    res.json({
                        ok: true,
                        user: userDB,
                        token: token
                    })

                }
            } else {
                let user = new User({
                    name: googleUser.name,
                    google: true,
                    password: "(-> <-)",
                    email: googleUser.email,
                    username: googleUser.email 
                });

                user.save((err, userDB) => {

                    if(err) {
                        console.log(err);
                        return res.status(400).json({
                            ok: false, 
                            err
                        })
                    }

                    let token = jwt.sign(
                        {
                        user: userDB
                        },
                        process.env.TOKEN_SEED,
                        {
                        expiresIn: process.env.TOKEN_EXP
                        })

                        // res.cookie("token", token, { httpOnly: true, secure: true, sameSite: "none" });

                    res.json({
                        ok: true,
                        user: userDB,
                        token
                    })

                })

            }

        })
})


app.post("/signOut", verifyToken, (req, res) => {
    // res.clearCookie("token");
    res.json({
        ok: true,
    })
})



module.exports = app;