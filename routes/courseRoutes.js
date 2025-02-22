const express = require("express");
const {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  addModuleToCourse,
  removeModuleFromCourse
} = require("../controllers/courseController");

const router = express.Router();

router.post("/create", createCourse);
router.post("/addmodule", addModuleToCourse);
router.put("/removemodule", removeModuleFromCourse);

router.get("/", getAllCourses);
router.get("/:courseId/:teacherId", getCourseById);
router.put("/:courseId", updateCourse);
router.delete("/:courseId/:teacherId", deleteCourse);

router.get("/teacher/:teacherId", getAllCoursesForTeacher);


module.exports = router;
