require("./config/config");
require("./config/db");

const port = process.env.PORT;
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();
const socketIO = require("socket.io");
const server = require("http").createServer(app);
const path = require("path");
const prodUrl = process.env.PRODURL;

app.enable('trust proxy');
app.use(cors({origin: prodUrl, methods: ["POST","PUT","DELETE", "GET"] , credentials: true}));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cookieParser());

app.use(require("./routes/index"));

module.exports.io = socketIO(server, {
    cors: {
        origin: prodUrl,
        methods: ["GET", "POST"]
    }
});
require("./sockets/sockets");


server.listen(port, () => {
    console.log(`Listen to ${port} testing`)
});


