const express = require("express");
const { 
  addOrUpdateRating, 
  getCourseRatings, 
  getStudentRating, 
  deleteRating 
} = require("../controllers/ratingController");

const router = express.Router();

// Add or Update Rating (Student ID should be in the body)
router.post("/rate", addOrUpdateRating);

// Get all ratings for a course
router.get("/course/:courseId", getCourseRatings);

// Get a specific student's rating for a course (Student ID in query/body)
router.get("/course/:courseId/my-rating/:studentId", getStudentRating);

// Delete Rating (Student ID should be in the body to verify ownership)
router.delete("/:ratingId", deleteRating);

module.exports = router;
