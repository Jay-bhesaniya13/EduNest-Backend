const express = require("express");
const {
  registerTeacher,
  verifyTeacherOTP,
  resendTeacherOTP,
  loginTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
} = require("../controllers/teacherController");

const router = express.Router();

// 🔹 **Authentication Routes**
router.post("/register", registerTeacher);   // Register teacher & send OTP
router.post("/verify-otp", verifyTeacherOTP); // Verify OTP & activate account
router.post("/resend-otp", resendTeacherOTP); // Resend OTP if expired
router.post("/login", loginTeacher);         // Teacher login

// 🔹 **Teacher Management Routes**
router.get("/", getAllTeachers);             // Get all teachers
router.get("/:teacherId", getTeacherById);   // Get teacher by ID
router.put("/:teacherId", updateTeacher);    // Update teacher details
router.delete("/:teacherId", deleteTeacher); // Deactivate teacher

module.exports = router;
