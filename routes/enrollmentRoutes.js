const express = require("express");
const {
  coursePurchaseEnrollment,
  createEnrollmentModule,
  getAllEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
  getEnrolledStudents
} = require("../controllers/enrollmentController");

const { authenticateStudent } = require("../controllers/authController");

const router = express.Router();

// create new Enrollment for whole course with discounted price
router.post("/course", authenticateStudent, coursePurchaseEnrollment);

// Create or update enrollment (No restrictions, any user can enroll)
router.post("/module", authenticateStudent , createEnrollmentModule);

// Get all enrollments (Requires adminId as query param)
router.get("/", getAllEnrollments); 

// Get specific enrollment (Requires adminId in route params)
router.get("/:enrollmentId", getEnrollmentById); 

// Get all students enrolled in a specific course (Only the course's teacher)
router.get("/:courseId/teacher/:teacherId/students", getEnrolledStudents);

// Update enrollment details (Only Admins)
router.put("/:enrollmentId", updateEnrollment);

// Delete enrollment (Only the owner of the enrollment)
router.delete("/:enrollmentId", deleteEnrollment);


module.exports = router;
