const mongoose = require("mongoose");
require('dotenv').config(); 
const REWARD_POINT_ON_ACCOUNT_CREATION= process.env.REWARD_POINT_ON_ACCOUNT_CREATION ;
 // Import config or use environment variables

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contactNumber: { type: String }, // Changed from Number to String for flexibility
  isVerified: { type: Boolean, default: false }, // Changed default to false
  isActive: { type: Boolean, default: true },
  profilepicURL: { type: String, required: false },
  about: { type: String },
  skills: [{ type: String }],
  recent_achievement: [{ type: String }],
  join_date: { type: Date, required: true, default: Date.now },
  city: { type: String },
  courses_enrolled: { type: Number, default: 0 },
  modules_enrolled: { type: Number, default: 0 },
  
  // 🔹 Reward System
  rewardPoints: { 
    type: Number, 
    default: REWARD_POINT_ON_ACCOUNT_CREATION// Fallback value
  },

  // 🔹 OTP for Verification
  otp: { type: String }, // Stores the generated OTP
  otpExpiry: { type: Date }, // Expiration time for OTP

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Student", studentSchema);
