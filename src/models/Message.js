const mongoose = require("mongoose");
const {Schema} = mongoose;

const messageSchema = new Schema({
    text: {
        type: String
    }, 
    msgDate: {
        type: Schema.Types.Date,
        required: [true, "Date is required"]
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    watched: {
        type: Boolean,
        default: false
    },
    room_id: {
        type: String,
        required: [true, "The Room_id is required"]
    },
    files: {
        type: [],
        required: false
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    global: {
        type: Boolean,
        default: false
    }

})

module.exports = mongoose.model("Message", messageSchema);
