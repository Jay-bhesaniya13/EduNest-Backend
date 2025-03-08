const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require('dotenv').config(); 

const cron = require("node-cron");
const Course = require("./models/Course"); // Import Course model

const moduleRoutes = require("./routes/moduleRoutes");
const courseRoutes = require("./routes/courseRoutes")
const teacherRoutes = require("./routes/teacherRoutes");
const questionRoutes = require("./routes/questionRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const studentRoutes = require("./routes/studentRoutes");
const rewardRoutes = require("./routes/rewardRoutes");
const adminRoutes = require("./routes/adminRoutes");
const contentRoutes = require("./routes/contentRoutes");
const quizRoutes = require("./routes/quizRoutes");
const attemptedQuizRoutes=require("./routes/attemptedQuizRoutes");
const quizAttemptRoutes=require("./routes/quizAttemptRoutes");
const leaderboardRoutes=require("./routes/leaderBoardRoutes");

const clientRoutes=require("./routes/clientroutes")

 
const app = express();
const Mongo_URI=process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON bodies
app.use(express.json());

app.use(cors({ origin: "*" }));

//  for monthly bonus automatic
require("./schedulers/monthlyBonus");


// default
app.get("/", (req, res) => {
  res.send("Hello");
});
 

// Routes 
app.use("/api/course",courseRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/reward", rewardRoutes);
app.use("/api/client",clientRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/module", moduleRoutes);
app.use("/api/enrollment", enrollmentRoutes);
app.use("/api/question", questionRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/leaderboard",leaderboardRoutes);//for leaderboard
app.use("/api/attemptedquiz",attemptedQuizRoutes);//for attempted quiz
app.use("/api/quizattempt",quizAttemptRoutes);//for submit quiz


// Default route for handling undefined routes
app.use((req, res) => {
  res.status(404).json({ message: "Welcome to EduNest! The route you are looking for does not exist." });
});


// Connect to MongoDB to local

// mongoose
//   .connect("mongodb://localhost:27017/edunest")
// .then(() => console.log("Connected to MongoDB"))
// .catch((err) => console.log("Failed to connect to MongoDB:", err));

// Connect to MongoDB to global 

mongoose
  .connect(Mongo_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully!"))
  .catch((err) => console.log("Failed to connect to MongoDB:", err));


// 🕒 Cron Job: Updates sales data on the 1st of every month at 00:00
cron.schedule("0 0 1 * *", async () => {
  try {
    console.log("🔄 Updating sales data (for module and course)...");
    await Module.updateMonthlySales();
    await Course.updateMonthlySales();
    console.log("✅ Sales data updated successfully.");
  } catch (error) {
    console.error("❌ Error updating sales data:", error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

