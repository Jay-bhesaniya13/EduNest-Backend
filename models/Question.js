const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswerIndex: { type: Number, required: true }, // Index of the correct option
  correctAnswer: { type: String }, // Auto-set based on correctAnswerIndex
  marks: { type: Number, default: 1 },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true }, // Store the creator admin
});

// Pre-save hook to set correctAnswer before saving
questionSchema.pre("save", function (next) {
  if (this.options && this.correctAnswerIndex >= 0 && this.correctAnswerIndex < this.options.length) {
    this.correctAnswer = this.options[this.correctAnswerIndex]; // Set correctAnswer
  } else {
    this.correctAnswer = null; // Handle invalid index cases
  }
  next();
});

module.exports = mongoose.model("Question", questionSchema);
