const express = require("express");
const router = express.Router();
const {getStudentAttemptedQuizDetails} = require("../controllers/attemptedQuizController");
const {authenticateStudent}=require("../controllers/authController")
  
// ✅ Route to get all attempted quizzes for a student
router.get("/:quizId",authenticateStudent ,getStudentAttemptedQuizDetails);

module.exports = router;
