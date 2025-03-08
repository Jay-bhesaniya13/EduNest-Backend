const Student = require("../models/Student");
const Quiz = require("../models/Quiz");
const Leaderboard = require("../models/LeaderBoard");

// ✅ Get all attempted quizzes for a student
exports.getStudentAttemptedQuizzes = async (req, res) => {
    try {
        const studentId = req.studentId;

        // Validate student existence
        const student = await Student.findById(studentId).populate("attemptedQuizzes.quizId", "topic description totalMarks");
        if (!student) return res.status(404).json({ message: "Student not found" });

        res.status(200).json(student.attemptedQuizzes);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
