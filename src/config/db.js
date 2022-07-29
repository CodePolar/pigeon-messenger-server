const moongose = require("mongoose");

moongose.connect(process.env.URLDB, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false }, (err, res) => {
    if (err) throw err;
    console.log(`Database Ready`);

});