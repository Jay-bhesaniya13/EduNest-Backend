const Reward = require("../models/Reward");
const Student = require("../models/Student");
const Client = require("../models/Client");
const dotenv = require("dotenv");
dotenv.config();
const SECRET_KEY = process.env.JWT_SECRET;
const jwt = require("jsonwebtoken");

const sendEmail = require("../utils/sendEmail");



// Get reward history (self-Student only)
exports.getRewardHistoryByStudentId = async (req, res) => {
  try {
    const studentId = req.student.id; // Authenticated Student ID

    const rewardHistory = await Reward.findOne({ student: studentId });

    if (!rewardHistory) {
      return res.status(404).json({ error: "No reward history found." });
    }

    res.status(200).json({ rewardHistory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Increment reward points
exports.incrementRewardPoints = async (req, res) => {
  try {
    const { studentId, pointsChange, reason } = req.body;
 
    if (!studentId) return res.status(401).json({ error: "Unauthorized. Invalid token." });

     
    if (!pointsChange || pointsChange <= 0 )  {
      return res.status(400).json({ error: "Invalid points or missing" });
    }
    if(!reason)
    {
      return res.status(400).json({ error: "reason is missing " });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    student.rewardPoints += pointsChange;
    await student.save();

    let rewardEntry = await Reward.findOne({ student: studentId });

    if (rewardEntry) {
      rewardEntry.pointsChanged.push(pointsChange);
      rewardEntry.reasons.push(reason);
      rewardEntry.timestamps.push(new Date());
    } else {
      rewardEntry = new Reward({
        student: StudentId,
        pointsChanged: [pointsChange],
        reasons: [reason],
        timestamps: [new Date()],
      });
    }

    await rewardEntry.save();

    // 📨 Send Email Notification
    const emailContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
        <h2 style="color: #28a745;">🎉 Points Credited!</h2>
        <p>Dear <strong>${student.name}</strong>,</p>
        <p>Congratulations! You have received <strong style="color: green;">+${pointsChange} points</strong> for:</p>
        <blockquote style="border-left: 4px solid #28a745; padding-left: 10px; background-color:rgb(178, 239, 193)">${reason}</blockquote>
        <p>Your current balance: <strong>${student.rewardPoints} points</strong>.</p>
        <p>Keep up the great work! 🚀</p>
      </div>
    `;

    await sendEmail(student.email, "🎉 Points Credited to Your Account!", emailContent);

    res.status(200).json({
      message: "Points incremented successfully and email sent!",
      rewardHistory: rewardEntry,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Deduct reward points (Penalty)
exports.penaltyRewardPoints = async (req, res) => {
  try {
    const { studentId, pointsChange, reason } = req.body;
 
    if (!pointsChange || pointsChange <= 0 )  {
      return res.status(400).json({ error: "Invalid points or missing" });
    }
    if(!reason)
    {
      return res.status(400).json({ error: "reason is missing " });
    }
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    student.rewardPoints -= pointsChange;
    await student.save();

    let rewardEntry = await Reward.findOne({ student: studentId });

    if (rewardEntry) {
      rewardEntry.pointsChanged.push(-pointsChange);
      rewardEntry.reasons.push(reason);
      rewardEntry.timestamps.push(new Date());
    } else {
      rewardEntry = new Reward({
        student: studentId,
        pointsChanged: [-pointsChange],
        reasons: [reason],
        timestamps: [new Date()],
      });
    }

    await rewardEntry.save();

    // 📨 Send Email Notification
    const emailContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
        <h2 style="color: #dc3545;">⚠️ Points Deducted!</h2>
        <p>Dear <strong>${student.name}</strong>,</p>
        <p>Unfortunately, <strong style="color: red;">-${pointsChange} points</strong> were deducted from your account for:</p>
        <blockquote style="border-left: 4px solid #dc3545; padding-left: 10px;background-color:rgb(231, 213, 215)">${reason}</blockquote>
        <p>Your current balance: <strong>${student.rewardPoints} points</strong>.</p>
        <p>We encourage you to stay on track and earn more rewards! 🌟</p>
      </div>
    `;

    await sendEmail(student.email, "⚠️ Points Deducted from Your Account!", emailContent);

    res.status(200).json({
      message: "Points deducted successfully and email sent!",
      rewardHistory: rewardEntry,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Delete reward history (self-Student only)
exports.deleteReward = async (req, res) => {
  try {
    const studentId = req.student.id;

    const rewardEntry = await Reward.findOneAndDelete({ student: studentId });

    if (!rewardEntry) {
      return res.status(404).json({ error: "No reward history found." });
    }

    res.status(200).json({ message: "Reward history deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
