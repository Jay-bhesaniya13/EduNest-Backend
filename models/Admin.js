const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contactNumber: { type: String },
  isVerified: { type: Boolean, default: true },
  isActive:  { type: Boolean, default: true },
  balance:{type:Number , default:0},
  profilepicURL:{type:String,default:"https://example.com/abc.jpg"},
  createdAt: { type: Date, default: Date.now },
});


// Hash password before saving
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});



module.exports = mongoose.model("Admin", adminSchema);
