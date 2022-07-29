const mongoose = require("mongoose");
const {Schema} = mongoose;

const contactSchema = new Schema({  
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "The user_id is required"]
    },  
    nickname: {
        type: String
    },
    contact_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "The contact_id is required"]
    },
    room_id: {  
        type: String,
        ref: "Room",
        required: [true, "the room_id is required"]
    }
});

module.exports = mongoose.model("Contact", contactSchema);