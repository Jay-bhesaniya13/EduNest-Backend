const express = require("express");
const router = express.Router();
const { submitQuizAttempt , hello} = require("../controllers/quizAttemptController");
const { authenticateStudent }=require("../controllers/authController")
 

// router.use("/",hello)

// ✅ Student must be authenticated to submit a quiz attempt
router.post("/submit", authenticateStudent , submitQuizAttempt);

module.exports = router;
