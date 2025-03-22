const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contactNumber: { type: String },
  bio: { type: String, default: "" },
  city: { type: String, default: "" },
  profilepicURL: {
    type: String,
    default: "https://picsum.photos/1920/1080",
  },
  isVerified: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// Hash password before saving
 
module.exports = mongoose.model("Admin", adminSchema);
