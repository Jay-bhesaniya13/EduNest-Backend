// const mongoose = require("mongoose");

// const rewardSchema = new mongoose.Schema({
//   student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },  
//   pointsChanged: [{ type: Number, required: true }],  // Array of positive or negative numbers
//   reasons: [{ type: String, required: true }],  // Array of reasons matching the points
//   timestamps: [{ type: Date, default: Date.now }] // Array of timestamps for each point change
// });

// // Ensure all arrays have the same length
// rewardSchema.pre("save", function (next) {
//   if (
//     this.pointsChanged.length !== this.reasons.length || 
//     this.pointsChanged.length !== this.timestamps.length
//   ) {
//     return next(new Error("Points, reasons, and timestamps must have the same number of elements"));
//   }
//   next();
// });

// module.exports = mongoose.model("Reward", rewardSchema);
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const Student = require("./Student"); // Import Student model
require("dotenv").config();

const rewardSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },  
  pointsChanged: [{ type: Number, required: true }],  // Array of positive or negative numbers
  reasons: [{ type: String, required: true }],  // Array of reasons matching the points
  timestamps: [{ type: Date, default: Date.now }] // Array of timestamps for each point change
});

// 🔹 Ensure arrays have equal lengths
rewardSchema.pre("save", function (next) {
  if (
    this.pointsChanged.length !== this.reasons.length || 
    this.pointsChanged.length !== this.timestamps.length
  ) {
    return next(new Error("Points, reasons, and timestamps must have the same number of elements"));
  }
  next();
});

// 🔹 After saving, send an email if points are updated
rewardSchema.post("save", async function (doc) {
  try {
    const student = await Student.findById(doc.student);
    if (!student || !student.email) return;

    const latestIndex = doc.pointsChanged.length - 1;
    const latestPoints = doc.pointsChanged[latestIndex];
    const latestReason = doc.reasons[latestIndex];

    // Determine email styling
    const color = latestPoints > 0 ? "green" : "yellow";
    const sign = latestPoints > 0 ? "+" : "";

    // Email Body
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 500px; margin: auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
          <h2 style="color: green; text-align: center;">EduNest Reward Points Update</h2>
          <p style="font-size: 16px; color: #333;">Dear <strong>${student.name}</strong>,</p>
          <p style="font-size: 16px; color: #333;">Your reward points have been updated.</p>
          <div style="padding: 10px; border-radius: 5px; background-color: ${color}; color: white; text-align: center; font-size: 18px;">
            <strong>${sign}${latestPoints} Points</strong>
          </div>
          <p style="font-size: 16px; color: #333;">Reason: <strong>${latestReason}</strong></p>
          <p style="text-align: center; margin-top: 20px;">
            <a href="https://edunest.com/rewards" style="background: green; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;">View Rewards</a>
          </p>
        </div>
      </div>
    `;

    // 🔹 Email Configuration
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // Your app password (not main password)
      }
    });

    await transporter.sendMail({
      from: `"EduNest" <${process.env.EMAIL_USER}>`,
      to: student.email,
      subject: "Your Reward Points Have Been Updated",
      html: emailHTML
    });

    console.log(`📧 Reward email sent to ${student.email}`);
  } catch (error) {
    console.error("❌ Error sending reward email:", error.message);
  }
});

module.exports = mongoose.model("Reward", rewardSchema);
