const Student = require("../models/Student");
const Quiz = require("../models/Quiz");
const Leaderboard = require("../models/LeaderBoard");

// ✅ Record a student's quiz attempt
exports.recordAttemptedQuiz = async (req, res) => {
    try {
        const { studentId, quizId, marks, timeTaken } = req.body;

        if (!studentId || !quizId || marks === undefined || timeTaken === undefined) {
            return res.status(400).json({ message: "studentId, quizId, marks, and timeTaken are required" });
        }

        // Validate student existence
        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ message: "Student not found" });

        // Validate quiz existence
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found" });

        // Check if the student already attempted the quiz
        const existingAttemptIndex = student.attemptedQuizzes.findIndex(q => q.quizId.toString() === quizId);

        if (existingAttemptIndex !== -1) {
            // Update only if the new marks are higher or the time is better
            const existingAttempt = student.attemptedQuizzes[existingAttemptIndex];
            if (marks > existingAttempt.marks || (marks === existingAttempt.marks && timeTaken < existingAttempt.timeTaken)) {
                student.attemptedQuizzes[existingAttemptIndex] = { quizId, marks, timeTaken };
            }
        } else {
            // Add a new quiz attempt
            student.attemptedQuizzes.push({ quizId, marks, timeTaken });
        }

        await student.save();

        // ✅ Update leaderboard
        let leaderboard = await Leaderboard.findOne({ quizId });

        if (leaderboard) {
            const existingStudentIndex = leaderboard.topStudents.findIndex(student => student.studentId.toString() === studentId);

            if (existingStudentIndex !== -1) {
                const existingStudent = leaderboard.topStudents[existingStudentIndex];
                if (marks > existingStudent.marks || (marks === existingStudent.marks && timeTaken < existingStudent.timeTaken)) {
                    leaderboard.topStudents[existingStudentIndex] = { studentId, marks, timeTaken };
                }
            } else {
                leaderboard.topStudents.push({ studentId, marks, timeTaken });
            }

            await leaderboard.save();
        }

        res.status(200).json({ message: "Quiz attempt recorded successfully", student });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// ✅ Get all attempted quizzes for a student
exports.getStudentAttemptedQuizzes = async (req, res) => {
    try {
        const { studentId } = req.params;

        // Validate student existence
        const student = await Student.findById(studentId).populate("attemptedQuizzes.quizId", "topic description totalMarks");
        if (!student) return res.status(404).json({ message: "Student not found" });

        res.status(200).json(student.attemptedQuizzes);
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};
