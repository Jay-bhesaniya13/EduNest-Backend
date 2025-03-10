const express = require("express");
const {
  loginStudent,
  registerStudent,
  verifyOTP,
  resendOTP,

  getStudentProfile,
  updateStudentProfile,  
  deactivateStudent,
  getAllStudents,
  enrolledCoursesForStudent
} = require("../controllers/studentController");

const { authenticateStudent } = require("../controllers/authController");

 
const router = express.Router();

router.post("/login", loginStudent);

router.post("/register", registerStudent);  // Send OTP & Register
router.post("/verify-otp", verifyOTP);      // Verify OTP
router.post("/resend-otp", resendOTP);      // Resend OTP if expired

router.get("/profile",authenticateStudent, getStudentProfile);
router.put("/profile", authenticateStudent, updateStudentProfile);
router.delete("/deactivate",authenticateStudent, deactivateStudent);

router.get("/get-enrollment" , authenticateStudent , enrolledCoursesForStudent );

// to retrive all students by admin ( later on add authorization for admin )
router.get("/admin13", getAllStudents);


module.exports = router;
