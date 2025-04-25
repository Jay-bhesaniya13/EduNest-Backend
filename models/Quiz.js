const mongoose = require("mongoose");
const Question = require("./Question");
const Admin = require("./Admin");
const Leaderboard = require("./LeaderBoard");

const quizSchema = new mongoose.Schema({
    topic: { type: String, required: true },
    description: { type: String },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true }],
    totalMarks: { type: Number, default: 0 }, // Auto-calculated
    duration: { type: Number, required: true }, // Duration in minutes
    createdAt: { type: Date, default: Date.now },
    startAt: { type: Date, required: true }, // Date and Time
    rewardPoints: { type: Number, required: true },
    attempts:{type:Number,default: 0},
    leaderboard: { type: mongoose.Schema.Types.ObjectId, ref: "Leaderboard" }, // Reference to the leaderboard
    rewardPointsCredited:{type:Boolean,default:false}
});


// Pre-save hook to calculate totalMarks and create a leaderboard
quizSchema.pre("save", async function (next) {
    try {
        const questionDocs = await Question.find({ _id: { $in: this.questions } });
        this.totalMarks = questionDocs.reduce((sum, q) => sum + q.marks, 0);

        // Create leaderboard if it's a new quiz
        if (this.isNew) {
            const leaderboard = await Leaderboard.create({ quizId: this._id, topStudents: [] });
            this.leaderboard = leaderboard._id; // Store leaderboard reference
        }

        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model("Quiz", quizSchema);
