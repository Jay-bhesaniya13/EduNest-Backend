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
    profilepicURL: { type: String },
    about: { type: String },
    skills: [{ type: String }],
    recent_achievement: [{ type: String }],
    join_date: { type: Date, default: Date.now },
    city: { type: String },

    // Enrolled courses and modules mapping
    courses_enrolled: [
        {
            courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
            modules: [{ type: mongoose.Schema.Types.ObjectId, ref: "Module" }] // Modules under this course
        }
    ],

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

/**
 * Enroll a student in a course
 * @param {ObjectId} studentId - The student's ID
 * @param {ObjectId} courseId - The course's ID
 * @param {Array<ObjectId>} moduleIds - The modules to enroll in
 */
studentSchema.statics.enrollCourse = async function (studentId, courseId, moduleIds, session) {
    const student = await this.findById(studentId).session(session);
    if (!student) throw new Error("Student not found");

    let courseEntry = student.courses_enrolled.find(entry => entry.courseId.equals(courseId));

    if (courseEntry) {
        courseEntry.modules = [...new Set([...courseEntry.modules, ...moduleIds])];
    } else {
        student.courses_enrolled.push({ courseId, modules: moduleIds });
    }

    await student.save({ session });
};


/**
 * Enroll a student in a module separately within a transaction session.
 * If the module's course is not already in courses_enrolled, add it.
 * @param {ObjectId} studentId - The student's ID
 * @param {ObjectId} courseId - The course's ID
 * @param {ObjectId} moduleId - The module's ID
 * @param {ClientSession} session - The MongoDB transaction session
 */
studentSchema.statics.enrollModule = async function (studentId, courseId, moduleId, session) {
    const student = await this.findById(studentId).session(session);
    if (!student) throw new Error("Student not found");

    let courseEntry = student.courses_enrolled.find(entry => entry.courseId.equals(courseId));

    if (courseEntry) {
        if (!courseEntry.modules.includes(moduleId)) {
            courseEntry.modules.push(moduleId);
        }
    } else {
        student.courses_enrolled.push({ courseId, modules: [moduleId] });
    }

    await student.save({ session });
};



module.exports = mongoose.model("Student", studentSchema);
