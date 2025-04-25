const express = require("express");
const router = express.Router();
const leaderboardController = require("../controllers/leaderBoardController");

// Get leaderboard for a specific quiz
router.get("/:quizId?", leaderboardController.getLeaderboard);

// all available leaderboard list of quiz with topic startAt and _id field
router.get("/available/quiz", leaderboardController.getAvailableLeaderboardQuizList)

// Update leaderboard when a student completes a quiz
router.post("/update", leaderboardController.updateLeaderboard);

module.exports = router;
