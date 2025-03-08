const Leaderboard = require("../models/LeaderBoard");
const Quiz = require("../models/quiz");
const Student = require("../models/student");

// Get leaderboard for a specific quiz
exports.getLeaderboard = async (req, res) => {
    try {
        const { quizId } = req.params;
        const leaderboard = await Leaderboard.findOne({ quizId })
            .populate("topStudents.studentId", "name email");

        if (!leaderboard) {
            return res.status(404).json({ message: "Leaderboard not found" });
        }

        res.status(200).json(leaderboard);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// Update leaderboard when a student completes a quiz
exports.updateLeaderboard = async (req, res) => {
    try {
        const { quizId, studentId, marks, timeTaken } = req.body;

        if (!quizId || !studentId || marks === undefined || timeTaken === undefined) {
            return res.status(400).json({ message: "quizId, studentId, marks, and timeTaken are required" });
        }

        // Check if quiz exists
        const quizExists = await Quiz.findById(quizId);
        if (!quizExists) {
            return res.status(404).json({ message: "Quiz not found" });
        }

        // Check if student exists
        const studentExists = await Student.findById(studentId);
        if (!studentExists) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Find leaderboard for the quiz
        let leaderboard = await Leaderboard.findOne({ quizId });

        if (!leaderboard) {
            return res.status(404).json({ message: "Leaderboard not found" });
        }

        // Check if the student is already in the leaderboard
        const existingStudentIndex = leaderboard.topStudents.findIndex(student => student.studentId.toString() === studentId);

        if (existingStudentIndex !== -1) {
            // Update only if the new marks are higher or the time is better
            const existingStudent = leaderboard.topStudents[existingStudentIndex];
            if (marks > existingStudent.marks || (marks === existingStudent.marks && timeTaken < existingStudent.timeTaken)) {
                leaderboard.topStudents[existingStudentIndex] = { studentId, marks, timeTaken };
            }
        } else {
            // Add new student to the leaderboard
            leaderboard.topStudents.push({ studentId, marks, timeTaken });
        }

        // Save leaderboard (pre-save hook will ensure top 10 sorting)
        await leaderboard.save();

        res.status(200).json({ message: "Leaderboard updated successfully", leaderboard });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
