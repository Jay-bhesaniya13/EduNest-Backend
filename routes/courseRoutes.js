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

  uploadCourseThumbnail
} = require("../controllers/courseController");
const { authenticateTeacher } = require("../controllers/authController");
const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // stores uploaded files in `uploads/` folder

const router = express.Router();


router.post(
  "/upload-thumbnail",
  authenticateTeacher,
  upload.single("thumbnail"),
  uploadCourseThumbnail
);

router.post("/create", authenticateTeacher, (req, res, next) => {
    console.log("✅ authenticateTeacher passed. req.teacher:", req.teacher);
    next(); },
    createCourse);



router.post("/add-module", authenticateTeacher, addModuleToCourse);
router.put("/remove-module", authenticateTeacher, removeModuleFromCourse);

router.get("/teacher/:teacherId", getAllCoursesForTeacher);
router.get("/:courseId/", getCourseById);
router.put("/:courseId", authenticateTeacher, upload.single("thumbnail"), updateCourse);
router.delete("/:courseId", authenticateTeacher, deleteCourse);

router.get("/", getAllCourses);


module.exports = router;
