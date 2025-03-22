const express = require("express");
const {
  createAdmin,
  loginAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
  dashboardDetails,

  getAllTeachers,
  activateTeacher,
  inactivateTeacher,

  activateStudent, deactivateStudent, getStudentDetails
} = require("../controllers/adminController");
const { authenticateAdmin } = require("../controllers/authController");
// const { getAllTeachers } = require("../controllers/teacherController");

const router = express.Router();

router.post("/register", createAdmin); // Public Route
router.post("/login", loginAdmin); // Public Route
router.get("/", authenticateAdmin, getAllAdmins); // Protected Route
router.get("/me", authenticateAdmin, getAdminById); // Protected: Fetch logged-in admin
router.put("/update", authenticateAdmin, updateAdmin); // Protected: Admin can update only their details
router.delete("/delete", authenticateAdmin, deleteAdmin); // Protected: Admin can delete only their account


router.get("/dash-board", authenticateAdmin, dashboardDetails);


router.get("/teachers", authenticateAdmin, getAllTeachers);

// Route to inactivate a teacher
router.put("/teacher/inactivate/:teacherId", authenticateAdmin, inactivateTeacher);

// Route to activate a teacher
router.put("/teacher/activate/:teacherId", authenticateAdmin, activateTeacher);


// Route to deactivate a student
router.put("/student/deactivate/:studentId", deactivateStudent);

// Route to activate a student
router.put("/student/activate/:studentId", activateStudent);

// Route to get student details
router.get("/student/:studentId", getStudentDetails);

module.exports = router;
