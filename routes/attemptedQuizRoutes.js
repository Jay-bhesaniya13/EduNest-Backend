const express = require("express");
const router = express.Router();
const {getStudentAttemptedQuizDetails} = require("../controllers/attemptedQuizController");
const {authenticateStudent}=require("../controllers/authController")
  
// ✅ Route to get  attempted quiz for a student by QuizId
router.get("/:quizId",authenticateStudent ,getStudentAttemptedQuizDetails);

module.exports = router;
