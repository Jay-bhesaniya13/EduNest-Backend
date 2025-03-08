const Student = require("../models/Student");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Leaderboard = require("../models/LeaderBoard");


// ✅ Submit Quiz Attempt
exports.submitQuizAttempt = async (req, res) => {
    try {
        const { quizId, answers, timeTaken } = req.body; // 🟢 Accept `timeTaken` from request
        const studentId = req.studentId;

        if (!quizId || !answers || !Array.isArray(answers) || timeTaken === undefined) {
            return res.status(400).json({ message: "Quiz ID, answers array, and timeTaken are required." });
        }

        // ✅ Fetch the quiz
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found." });

        // ✅ Fetch all questions for this quiz
        const questionIds = answers.map(a => a.questionId);
        const questions = await Question.find({ _id: { $in: questionIds } });

        if (questions.length !== answers.length) {
            return res.status(400).json({ message: "Some questions are missing or invalid." });
        }

        let totalMarks = 0;
        let maxMarks = 0;

        answers.forEach(answer => {
            const question = questions.find(q => q._id.toString() === answer.questionId);
            if (question) {
                maxMarks += question.marks;
                if (question.correctAnswerIndex === answer.selectedAnswerIndex) {
                    totalMarks += question.marks;
                }
            }
        });

        // ✅ Fetch the student
        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ message: "Student not found." });

        // ✅ Check if the student already attempted this quiz
        const existingAttemptIndex = student.attemptedQuizzes.findIndex(q => q.quizId.toString() === quizId);

        if (existingAttemptIndex !== -1) {
            const existingAttempt = student.attemptedQuizzes[existingAttemptIndex];
            if (totalMarks > existingAttempt.marks || (totalMarks === existingAttempt.marks && timeTaken < existingAttempt.timeTaken)) {
                student.attemptedQuizzes[existingAttemptIndex] = { quizId, marks: totalMarks, timeTaken };
            }
        } else {
            student.attemptedQuizzes.push({ quizId, marks: totalMarks, timeTaken });
        }

        await student.save();

        // ✅ Update leaderboard
        let leaderboard = await Leaderboard.findOne({ quizId });

        if (!leaderboard) {
            leaderboard = new Leaderboard({ quizId, topStudents: [] });
        }

        const existingStudentIndex = leaderboard.topStudents.findIndex(s => s.studentId.toString() === studentId);
        if (existingStudentIndex !== -1) {
            const existingStudent = leaderboard.topStudents[existingStudentIndex];
            if (totalMarks > existingStudent.marks || (totalMarks === existingStudent.marks && timeTaken < existingStudent.timeTaken)) {
                leaderboard.topStudents[existingStudentIndex] = { studentId, marks: totalMarks, timeTaken };
            }
        } else {
            leaderboard.topStudents.push({ studentId, marks: totalMarks, timeTaken });
        }

        await leaderboard.save();

        res.status(200).json({
            message: "Quiz attempt recorded successfully.",
            marksObtained: totalMarks,
            maxMarks,
            timeTaken,
            correctAnswers: questions.filter(q => q.correctAnswerIndex !== null).map(q => ({
                questionId: q._id,
                correctAnswerIndex: q.correctAnswerIndex
            }))
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error", error });
    }
};
