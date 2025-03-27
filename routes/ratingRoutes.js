const express = require("express")
const {
  rateModule,
  getModuleRatings,
  getStudentRatings,
  deleteRating,
  canRateModule,
} = require("../controllers/ratingController")
const { authenticateStudent } = require("../controllers/authController")

const router = express.Router()

// Rate a module
router.post("/rate", authenticateStudent, rateModule)

// Get all ratings for a module
router.get("/module/:moduleId", getModuleRatings)

// Get all ratings given by a student
router.get("/student", authenticateStudent, getStudentRatings)

// Delete a rating
router.delete("/:ratingId", authenticateStudent, deleteRating)

// Check if a student can rate a module
router.get("/can-rate/:moduleId/:courseId", authenticateStudent, canRateModule)

module.exports = router

