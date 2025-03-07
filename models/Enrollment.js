const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  moduleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Module" }], // List of enrolled module IDs
  enrollmentDate: { type: Date, default: Date.now },
  progress: { type: Number, default: 0 }, // Percentage progress
  status: { 
    type: String, 
    enum: ["active", "completed", "inactive"], 
    default: "active" 
  }
});

module.exports = mongoose.model("Enrollment", enrollmentSchema);
