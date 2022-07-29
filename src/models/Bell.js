const mongoose = require("mongoose");
const {Schema} = mongoose;
let uniqueValidator = require("mongoose-unique-validator");

let validVal = {
    values: ["REQUEST", "ANNOUNCEMENT", "REQUEST_DECLINED", "REQUEST_ACCEPTED", "CONTACT_ADDED", "REQUEST_ROOM", "ROOM_ACCEPTED", "ROOM_DECLINED", "ADDED_TO_ROOM"],
    message: "{VALUE} isn't a valid value",
  };

const bellSchema = new Schema({
    request: {
        type: String,
        required: [true, "The request type is required"],
        enum: validVal,
        default: "ANNOUNCEMENT"
    },
    requester: {
        type: String,
        required: [true, "The requester is required"],
        unique: true
    },
    title: {
        type: String,
        required: [true, "The title is required"]
    },

    text: {
        type: String
    },
    
    user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: [true, "The user_id is required"]
    },
    date: {
        type: Date,
        required: [true, "The date is required"],
        default: new Date()
    },
    img: {
        type: String,
        required: [true, "The img is required"]
    },
    room_id: {
        type: String        
    },
    watched: {
        type: Boolean,
        default: false
    }
})

bellSchema.plugin(uniqueValidator, { message: "{PATH} Required to be unique" });

module.exports = mongoose.model("Bell", bellSchema);