const express = require("express");
const mongoose = require("mongoose");
const cron = require("node-cron");
const Course = require("./models/Course"); // Import Course model

const moduleRoutes = require("./routes/moduleRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const questionRoutes = require("./routes/questionRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const studentRoutes = require("./routes/studentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const contentRoutes = require("./routes/contentRoutes");
const quizRoutes = require("./routes/quizRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to parse JSON bodies
app.use(express.json());

// Routes 
app.use("/api/student", studentRoutes); 
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/module", moduleRoutes);
app.use("/api/enrollment", enrollmentRoutes);
app.use("/api/question", questionRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/content", contentRoutes);

// Connect to MongoDB
mongoose
  .connect("mongodb://localhost:27017/edunest")
  .then(() => console.log("Connected to MongoDB"))
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
