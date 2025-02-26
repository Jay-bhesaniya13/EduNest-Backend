const mongoose = require("mongoose");
const Question = require("./Question");
const Admin = require("./Admin");

const quizSchema = new mongoose.Schema({
  topic: { type: String },
  description: { type: String },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true }],
  totalMarks: { type: Number, default: 0 }, // Auto-calculated
  duration: { type: Number, required: true }, // Duration in minutes to end Quiz
  createdAt: { type: Date, default: Date.now },
  startAt: { type: Date, required: true }, // Date and Time
  rewardPoints: { type: Number, required: true },
});

// Pre-save hook to calculate totalMarks
quizSchema.pre("save", async function (next) {
  try {
    const questionDocs = await Question.find({ _id: { $in: this.questions } });
    this.totalMarks = questionDocs.reduce((sum, q) => sum + q.marks, 0);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Quiz", quizSchema);
