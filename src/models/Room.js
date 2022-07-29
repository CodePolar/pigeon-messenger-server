const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");
const {Schema} = mongoose;

const roomSchema = new Schema({
    name: {
        type: String,
        required: [true, "The name is required"]
    },
    description: {
        type: String,
        required:false 
    },
    img: {
        type: String,
        default: "default.png"
    },
    members: {
        type: [Schema.Types.ObjectId],
        ref: "User",
        required: true
    },
    admin: {    
        type: Schema.Types.ObjectId,
        ref: "User",
    }, 
    status: {
        type: Boolean,
        default: true
    },
    room_id: {
        type: String,
        unique: true,
        required: [true, "The room id is required"]
    },
    kind: {
        type: String
    } 
})


roomSchema.plugin(uniqueValidator, { message: "{PATH} Required to be unique" });

module.exports = mongoose.model("Room", roomSchema);

