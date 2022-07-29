const mongoose = require("mongoose");
const { Schema } = mongoose;
let uniqueValidator = require("mongoose-unique-validator");

const contactSchema = new Schema({
    name: String,
    username: String,
    description: String,
    accepted: {
        type: Boolean,
        default: false
    }
})

const userSchema = new Schema({
    name: {
        type: String,
        required: [true, "The Name is required"]
    },
    img: {
        type: String,   
        default: "default.png"
    },
    username: {
        type: String,
        unique: true,
        required: [true, "The username is required"]
    },
    contacts: {
        type: [contactSchema],
        ref: "User",
        required: false
    },
    rooms: {
        type: [Schema.Types.ObjectId],
        ref: "Room"
    },
    description: {
        type: String,   
        default: "Hello, i'm here at Pigeon Messenger!"
    },
    email: {
        type: String,
        required: [true, "The Email is required"],
        unique: true
    },
    password: {
        type: String, 
        required: [true, "The Password is required"]
    },
    google: {
        type: Boolean,
        default: false
    },
    facebook: {
        type: Boolean,
        default: false
    },
    status: {
        type: Boolean,
        default: true
    }, 
    online: {
        type: Boolean,
        default: false
    }
})



userSchema.methods.toJSON = function () {
    let user = this;
    let userObject = user.toObject();
    delete userObject.password;
  
    return userObject;
  };


userSchema.plugin(uniqueValidator, { message: "{PATH} Required to be unique" });

module.exports = mongoose.model("User", userSchema);