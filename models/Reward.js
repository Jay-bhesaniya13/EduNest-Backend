const mongoose = require("mongoose");

const rewardSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },  
  pointsChanged: [{ type: Number, required: true }],  // Array of positive or negative numbers
  reasons: [{ type: String, required: true }],  // Array of reasons matching the points
  timestamps: [{ type: Date, default: Date.now }] // Array of timestamps for each point change
});

// Ensure all arrays have the same length
rewardSchema.pre("save", function (next) {
  if (
    this.pointsChanged.length !== this.reasons.length || 
    this.pointsChanged.length !== this.timestamps.length
  ) {
    return next(new Error("Points, reasons, and timestamps must have the same number of elements"));
  }
  next();
});

module.exports = mongoose.model("Reward", rewardSchema);
