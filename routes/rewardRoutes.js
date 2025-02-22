const express = require("express");
const {
  createReward,
  getAllRewards,
  getRewardByUserId,
  incrementRewardPoints,
  penaltyRewardPoints,
  deleteReward,
} = require("../controllers/rewardController");

const router = express.Router();

router.post("/", createReward);
router.get("/", getAllRewards);
router.get("/:userId", getRewardByUserId);
router.put("/:userId/increment", incrementRewardPoints); // Increment points
router.put("/:userId/penalty", penaltyRewardPoints);    // Apply penalty

module.exports = router;
