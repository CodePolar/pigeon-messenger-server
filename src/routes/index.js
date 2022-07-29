const express = require("express");
const app = express();

// configure the req.user in all routes for jwt validation

app.use(require("./user"));
app.use(require("./room"));
app.use(require("./message"));
app.use(require("./uploads"));
app.use(require("./files"));
app.use(require("./contacts"));
app.use(require("./authentication"));
app.use(require("./bells"));

module.exports = app;
