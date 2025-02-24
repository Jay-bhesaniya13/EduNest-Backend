const express = require("express");
const {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  getAllCoursesForteacher,
  loginTeacher,
  registerTeacher
 } = require("../controllers/teacherController");

const router = express.Router();

// router.get("/course/:teacherId", getAllCoursesForteacher); // get all courses for teacher by teacherId

router.post("/register", registerTeacher);
router.post("/login",loginTeacher);
router.get("/", getAllTeachers);

router.get("/:teacherId", getTeacherById); // get teacher details by teacherId
router.put("/:teacherId", updateTeacher);  // update teacher details
router.delete("/:teacherId", deleteTeacher);// deactivate

module.exports = router;
