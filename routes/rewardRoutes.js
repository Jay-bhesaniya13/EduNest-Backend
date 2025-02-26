const express = require("express");
const {
  authenticateStudent,
  getRewardHistoryByStudentId,

  authenticateClient,
  incrementRewardPoints,
  penaltyRewardPoints,

  deleteReward,
} = require("../controllers/rewardController");

const router = express.Router();

 
router.get("/", authenticateStudent, getRewardHistoryByStudentId);

router.put("/increment", authenticateClient, incrementRewardPoints);
router.put("/penalty", authenticateClient, penaltyRewardPoints);

router.delete("/", authenticateClient, deleteReward);

module.exports = router;
