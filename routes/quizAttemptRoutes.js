const express = require("express");
const router = express.Router();
const { submitQuizAttempt , getQuizById ,availableAllQuizzes} = require("../controllers/quizAttemptController");
const { authenticateStudent }=require("../controllers/authController")
 
// ✅ Student must be authenticated  


// Get Quiz by quizId 
router.get("/:quizId", getQuizById)

router.get("/availablequiz/all",availableAllQuizzes)
// Submit/ Attemp a Quiz
router.post("/submit", authenticateStudent , submitQuizAttempt);

module.exports = router;
