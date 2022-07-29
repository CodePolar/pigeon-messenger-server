const mongoose = require("mongoose");
const {Schema} = mongoose;

const fileSchema = new Schema({
    path: {
        type: String,
        required: [true, "The Path is required"]
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true]
    },
    room_id: {
        type: String,
        required: [true, "The room_id is required"]
    },
    message_id: {
        type: Schema.Types.ObjectId,
        ref: "Message",
        required: [true, "The message_id is required"]
    }
})

module.exports = mongoose.model("File", fileSchema);


