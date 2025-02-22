const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contactNumber: { type: String },
  isVerified: { type: Boolean, default: true },
  isActive:  { type: Boolean, default: true },
  balance:{type:Number , default:0},
  profilepicURL:{type:String,required:true},
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Admin", adminSchema);
