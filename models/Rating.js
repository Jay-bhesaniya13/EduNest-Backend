const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5, // Rating between 1 to 5
    },
    review: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure a student can rate a course only once
ratingSchema.index({ courseId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Rating", ratingSchema);
