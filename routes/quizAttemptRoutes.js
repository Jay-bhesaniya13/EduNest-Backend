const express = require("express");
const router = express.Router();
const { submitQuizAttempt} = require("../controllers/quizAttemptController");
const {authenticateStudent}=require("../controllers/authController")

// ✅ Student must be authenticated to submit a quiz attempt
router.post("/submit", authenticateStudent,submitQuizAttempt);

module.exports = router;
