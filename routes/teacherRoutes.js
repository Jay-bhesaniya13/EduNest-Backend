const express = require("express");
const {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  getAllCoursesForteacher
 } = require("../controllers/teacherController");

const router = express.Router();

// router.get("/course/:teacherId", getAllCoursesForteacher); // get all courses for teacher by teacherId
router.get("/", getAllTeachers);
router.post("/create", createTeacher);
router.get("/:teacherId", getTeacherById); // get teacher details by teacherId
router.put("/:teacherId", updateTeacher);  // update teacher details
router.delete("/:teacherId", deleteTeacher);// deactivate

module.exports = router;
