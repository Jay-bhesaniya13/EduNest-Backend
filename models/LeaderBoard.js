const mongoose = require("mongoose");

const leaderboardSchema = new mongoose.Schema({
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quiz",
        required: true,
        unique: true
    },
    topStudents: [
        {
            studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
            marks: { type: Number, required: true },
            timeTaken: { type: Number, required: true } // Time taken in seconds
        }
    ],
    updatedAt: { type: Date, default: Date.now }
});

// Ensure only top 10 students are stored, sorted by marks (desc) and timeTaken (asc)
leaderboardSchema.pre("save", function (next) {
    this.topStudents = this.topStudents
        .sort((a, b) => {
            if (b.marks === a.marks) return a.timeTaken - b.timeTaken; // Less time is better
            return b.marks - a.marks;
        })
         
    next();
});

module.exports = mongoose.model("Leaderboard", leaderboardSchema);
