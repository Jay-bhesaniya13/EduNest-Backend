const Reward = require("../models/Reward");
const User = require("../models/User");

// Function to create a reward history entry
exports.createReward = async (userId, pointsChange, reason) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Update the user's current reward points
    user.rewardPoint += pointsChange;
    await user.save();

    // Create a new record in the Reward schema for this change
    const newReward = new Reward({
      user: userId,
      pointsChanged: pointsChange,
      reason: reason
    });

    await newReward.save();

    return newReward;  // Return the created reward history entry
  } catch (error) {
    throw new Error(error.message);
  }
};


exports.getRewardByUserId = async (req, res) => {
  try {
    const { userId} = req.body;

    if (userId  === undefined  ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

     
    res.status(200).json({
      message: "Reward points updated successfully.",
      rewardHistory: newReward
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

 

// Controller to add or subtract reward points for a user
exports.modifyReward = async (req, res) => {
  try {
    const { userId, pointsChange, reason } = req.body;

    if (!userId || pointsChange === undefined || !reason) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Add reward points and create history
    const newReward = await createReward(userId, pointsChange, reason);

    res.status(200).json({
      message: "Reward points updated successfully.",
      rewardHistory: newReward
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller to get reward history for a user
exports.getRewardHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const rewards = await Reward.find({ user: userId });

    if (rewards.length === 0) {
      return res.status(404).json({ error: "No reward history found for this user" });
    }

    res.status(200).json(rewards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


 