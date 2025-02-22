const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
  modules: [{ type: mongoose.Schema.Types.ObjectId, ref: "Module" }], // Reference to Module
  modulePrices: [{ type: Number }], // Array of purchase prices corresponding to each module in the modules array
  progress: { type: Number, default: 0 },
  completionDate: { type: Date },
  enrolledAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Enrollment", enrollmentSchema);
