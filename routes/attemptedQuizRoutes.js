const express = require("express");
const router = express.Router();
const {getStudentAttemptedQuizDetails,getAllAttemptedQuizzes} = require("../controllers/attemptedQuizController");
const {authenticateStudent}=require("../controllers/authController")
  
router.get("/all",authenticateStudent,getAllAttemptedQuizzes);
// ✅ Route to get  attempted quiz for a student by QuizId
router.get("/quiz/:quizId",authenticateStudent ,getStudentAttemptedQuizDetails);

module.exports = router;
