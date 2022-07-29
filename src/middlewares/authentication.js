let jwt = require("jsonwebtoken");

let verifyToken = (req, res, next) => {
    let token = req.get("Authorization");
    jwt.verify(token, process.env.TOKEN_SEED, (err, decoded) => {

        if(err) {
            return res.status(200).json({
                ok: false,
                err
            })
        }

        req.user = decoded.user;

        next();
    })  
}

let verifyTokenUrl = (req, res, next) => {
    let token = req.query.token;
    jwt.verify(token, process.env.TOKEN_SEED, (err, decoded) => {
        if(err) {
            return res.status(200).json({
                ok: false,
                err
            })
        }

        req.user = decoded.user;

        next();
    })
}

let verify = (token) => {
    let user = {}
    jwt.verify(token, process.env.TOKEN_SEED, (err, decoded) => {
        if(err) {
            return user = err;
        }

        user = {user: decoded.user};
    })
    return user
}

module.exports = {
    verifyToken,
    verifyTokenUrl,
    verify
}