const express = require("express");
const {
  getRewardHistoryByStudentId,
  incrementRewardPoints,
  penaltyRewardPoints,
  deleteReward,
} = require("../controllers/rewardController");
const { authenticateStudent, authenticateClient } = require("../controllers/authController")

const router = express.Router();


router.get("/", authenticateStudent, getRewardHistoryByStudentId);

router.put("/increment", authenticateClient, incrementRewardPoints);
router.put("/penalty", authenticateClient, penaltyRewardPoints);

router.delete("/", authenticateClient, deleteReward);


// // Manual trigger route for monthly bonus (For Testing)

// const { addMonthlyBonus } = require("../schedulers/monthlyBonus"); 

// router.post("/trigger-monthly-bonus", async (req, res) => {
//   try {
//     console.log("started manually bonus trigger ")
//     await addMonthlyBonus();
//     console.log("completed manually bonus trigger ")
//     res.status(200).json({ message: "Monthly bonus added successfully." });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

module.exports = router;
