const express = require("express");
const {
  loginStudent,
   registerStudent,
  verifyOTP,
  resendOTP,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} = require("../controllers/studentController");

const router = express.Router();

router.post("/login", loginStudent);

router.post("/register", registerStudent);  // Send OTP & Register
router.post("/verify-otp", verifyOTP);      // Verify OTP
router.post("/resend-otp", resendOTP);      // Resend OTP if expired

router.get("/", getAllStudents);
router.get("/:studentId", getStudentById);
router.put("/:studentId", updateStudent);
router.delete("/:studentId", deleteStudent);

module.exports = router;
