const express = require("express");
const router = express.Router();
const leaderboardController = require("../controllers/leaderBoardController");
 // Get leaderboard for a specific quiz
 router.get("/:quizId?", leaderboardController.getLeaderboard);
 // Update leaderboard when a student completes a quiz
router.post("/update", leaderboardController.updateLeaderboard);
 module.exports = router;
