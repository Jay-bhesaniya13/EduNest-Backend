const express = require("express");
const router = express.Router();
const { submitQuizAttempt , getQuizById} = require("../controllers/quizAttemptController");
const { authenticateStudent }=require("../controllers/authController")
 
// ✅ Student must be authenticated  


// Get Quiz by quizId 
router.get("/:quizId", getQuizById)

// Submit/ Attemp a Quiz
router.post("/submit", authenticateStudent , submitQuizAttempt);

module.exports = router;
