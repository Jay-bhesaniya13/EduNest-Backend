const express = require("express");
const router = express.Router();
const {getStudentAttemptedQuizzes} = require("../controllers/attemptedQuizController");
const {authenticateStudent}=require("../controllers/authController")
  
// ✅ Route to get all attempted quizzes for a student
router.get("/",authenticateStudent ,getStudentAttemptedQuizzes);

module.exports = router;
