const express = require("express");
const {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  addModuleToCourse,
  removeModuleFromCourse,
  getAllCoursesForTeacher,
} = require("../controllers/courseController");
const { authenticateTeacher } = require("../controllers/authController");

const router = express.Router();

router.post("/create", authenticateTeacher, createCourse);
router.post("/add-module", authenticateTeacher, addModuleToCourse);
router.put("/remove-module", authenticateTeacher, removeModuleFromCourse);

router.get("/teacher/",  getAllCoursesForTeacher);
router.get("/:courseId/", getCourseById);
router.put("/:courseId", authenticateTeacher, updateCourse);
router.delete("/:courseId", authenticateTeacher, deleteCourse);

router.get("/", getAllCourses);


module.exports = router;
