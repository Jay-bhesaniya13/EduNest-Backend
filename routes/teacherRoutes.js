const express = require("express");
const {
  registerTeacher,
  verifyTeacherOTP,
  resendTeacherOTP,
  loginTeacher,

  getTeacherProfile,
  updateTeacherProfile,
  deactivateTeacher,
  getAllTeachers,
  getTeacherInfo,
  getEnrolledStudents
} = require("../controllers/teacherController");
const { authenticateTeacher, authenticateStudent } = require("../controllers/authController");

const router = express.Router();

// 🔹 **Authentication Routes**
router.post("/register", registerTeacher); // Register & send OTP
router.post("/verify-otp", verifyTeacherOTP); // Verify OTP & activate account
router.post("/resend-otp", resendTeacherOTP); // Resend OTP
router.post("/login", loginTeacher); // Teacher login

// 🔹 **Protected Routes (Only Authenticated Teacher)**
router.get("/profile", authenticateTeacher, getTeacherProfile); // Get teacher's own profile
router.put("/profile", authenticateTeacher, updateTeacherProfile); // Update own profile
router.delete("/deactivate", authenticateTeacher, deactivateTeacher); // Deactivate own account



router.get("/teacherinfo/:teacherId",authenticateStudent,getTeacherInfo);

router.get("/enrolledstudents", authenticateTeacher, getEnrolledStudents);
// to retrive all taechers by admin ( later on add authorization for admin )
router.get("/admin13", getAllTeachers);

module.exports = router;
