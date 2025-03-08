const express = require("express");
const router = express.Router();
const attemptedQuizController = require("../controllers/attemptedQuizController");

// ✅ Route to record an attempted quiz
router.post("/record", attemptedQuizController.recordAttemptedQuiz);

// ✅ Route to get all attempted quizzes for a student
router.get("/:studentId", attemptedQuizController.getStudentAttemptedQuizzes);

module.exports = router;
