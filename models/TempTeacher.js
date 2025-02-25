const mongoose = require("mongoose");

const tempTeacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contactNumber: { type: String },
  profilepicURL: { type: String, required: true },
  about: { type: String },
  areas_of_expertise: [{ type: String }],
  city: { type: String },
  otp: { type: Number, required: true },
  otpExpiresAt: { type: Date, required: true },
}, { timestamps: true });

// Automatically delete document after 2 hours
tempTeacherSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 7200 });

module.exports = mongoose.model("TempTeacher", tempTeacherSchema);
