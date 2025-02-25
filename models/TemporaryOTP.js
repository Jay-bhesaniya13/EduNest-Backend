const mongoose = require("mongoose");

// for student 
const temporaryOTPSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  hashedPassword: { type: String, required: true },
  contactNumber: { type: Number },
  profilepicURL: { type: String },
  about: { type: String },
  skills: [{ type: String }],
  city: { type: String },
  otp: { type: Number, required: true },
  otpExpiry: { type: Date, required: true , expires: 7200}
});

module.exports = mongoose.model("TemporaryOTP", temporaryOTPSchema);
