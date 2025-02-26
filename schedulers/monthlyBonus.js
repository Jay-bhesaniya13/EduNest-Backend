const cron = require("node-cron");
const Student = require("../models/Student");
const Reward = require("../models/Reward");
const sendEmail = require("../utils/sendEmail");
const dotenv = require("dotenv");

dotenv.config();

const MONTHLY_BONUS_AMOUNT = parseInt(process.env.MONTHLY_BONUS_AMOUNT);

// Function to add monthly bonus and send email
exports.addMonthlyBonus = async () => {
  try {
    const students = await Student.find({ isActive: true });

    for (let student of students) {
      student.rewardPoints += MONTHLY_BONUS_AMOUNT;
      await student.save();

      // Update reward history
      let rewardEntry = await Reward.findOne({ student: student._id });

      if (rewardEntry) {
        rewardEntry.pointsChanged.push(MONTHLY_BONUS_AMOUNT);
        rewardEntry.reasons.push("Monthly Bonus");
        rewardEntry.timestamps.push(new Date());
      } else {
        rewardEntry = new Reward({
          student: student._id,
          pointsChanged: [MONTHLY_BONUS_AMOUNT],
          reasons: ["Monthly Bonus"],
          timestamps: [new Date()],
        });
      }

      await rewardEntry.save();

      // Send Email Notification
      const emailContent = `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; background: #f4f4f4; border-radius: 10px;">
          <h2 style="color: #4CAF50;">🎉 Monthly Bonus Received! 🎉</h2>
          <p>Hello <b>${student.name}</b>,</p>
          <p>We have credited <b>${MONTHLY_BONUS_AMOUNT} points</b> to your account as part of our monthly bonus program.</p>
          <p>Keep learning and earning more rewards! 🚀</p>
          <hr>
          <p style="color: #777;">Best regards,</p>
          <p><b>Your Learning Platform Team</b></p>
        </div>
      `;

      await sendEmail(student.email, "🎉 Monthly Bonus Credited!", emailContent);
    }

   } catch (error) {
    console.error("❌ Error in adding monthly bonus:", error);
  }
};

// Schedule to run at midnight on the 1st of every month
cron.schedule("0 0 1 * *", async () => {
  console.log("⏳ Running monthly bonus script...");
  await addMonthlyBonus();
});
