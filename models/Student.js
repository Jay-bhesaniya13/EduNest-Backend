const mongoose = require("mongoose");
const config = require("./config"); // Import config or use environment variables

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contactNumber: { type: Number },
  isVerified: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  profilepicURL:{type:String,required:false},
  about:{type:String},
  skills:[{type:String}],
  recent_achievement:[{type:String}],
  join_date:{type:Date,required:true,default: Date.now} ,
  city:{type:String},
  courses_enrolled:{type:Number,default:0},
  modules_enrolled:{type:Number,default:0},
  
  rewardPoint: { 
    type: Number, 
    default: config.REWARD_POINT_ON_ACCOUNT_CREATION // Using global config for default value
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Student", studentSchema);
