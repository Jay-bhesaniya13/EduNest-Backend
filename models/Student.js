const mongoose = require("mongoose");
require("dotenv").config(); 
const REWARD_POINT_ON_ACCOUNT_CREATION = process.env.REWARD_POINT_ON_ACCOUNT_CREATION;

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    contactNumber: { type: String }, 
    isVerified: { type: Boolean, default: false },
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
        default: REWARD_POINT_ON_ACCOUNT_CREATION
    },

    // 🔹 OTP for Verification
    otp: { type: String }, 
    otpExpiry: { type: Date },

    // 🔹 Store Attempted Quizzes
    attemptedQuizzes: [
        {
            quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
            marks: { type: Number, required: true },
            timeTaken: { type: Number, required: true } // Time taken in seconds
        }
    ],

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Student", studentSchema);
