// const Student = require("../models/Student");
// const Quiz = require("../models/Quiz");
// const Leaderboard = require("../models/LeaderBoard");

// // ✅ Get all attempted quizz for a student by quiz id
// exports.getStudentAttemptedQuizDetails = async (req, res) => {
//     try {
//         const studentId = req.studentId;
//         const { quizId } = req.params;

//         if (!quizId) return res.status(400).json({ message: "Quiz ID is required." });

//         // ✅ Validate student existence
//         const student = await Student.findById(studentId).populate({
//             path: "attemptedQuizzes.quizId",
//             select: "topic description totalMarks"
//         });

//         if (!student) return res.status(404).json({ message: "Student not found." });

//         // ✅ Find the attempted quiz entry
//         const attemptedQuiz = student.attemptedQuizzes.find(q => q.quizId._id.toString() === quizId);

//         if (!attemptedQuiz) {
//             return res.status(404).json({ message: "Quiz not attempted by this student." });
//         }

//         // ✅ Fetch all questions for the quiz
//         const quizQuestions = await Quiz.findById(quizId).populate({
//             path: "questions",
//             select: "correctAnswerIndex"
//         });

//         if (!quizQuestions) {
//             return res.status(404).json({ message: "Quiz questions not found." });
//         }

//         // ✅ Map correct answers
//         const correctAnswers = quizQuestions.questions.map(q => ({
//             questionId: q._id,
//             correctAnswerIndex: q.correctAnswerIndex
//         }));

//         res.status(200).json({
//             quizId,
//             topic: attemptedQuiz.quizId.topic,
//             description: attemptedQuiz.quizId.description,
//             totalMarks: attemptedQuiz.quizId.totalMarks,
//             marksObtained: attemptedQuiz.marks,
//             timeTaken: attemptedQuiz.timeTaken,
//             submittedAnswers: attemptedQuiz.submittedAnswers,
//             correctAnswers // ✅ Include correct answers for each question
//         });

//     } catch (error) {
//         console.error("Error fetching attempted quiz details:", error);
//         res.status(500).json({ message: "Server error", error });
//     }
// };


const Student = require("../models/Student");
const Quiz = require("../models/Quiz");

// ✅ Get a specific attempted quiz by quiz ID
exports.getStudentAttemptedQuizDetails = async (req, res) => {
    try {
        const studentId = req.studentId;
        const { quizId } = req.params;

        if (!quizId) return res.status(400).json({ message: "Quiz ID is required." });

        // ✅ Validate student existence
        const student = await Student.findById(studentId).populate({
            path: "attemptedQuizzes.quizId",
            select: "topic description totalMarks"
        });

        if (!student) return res.status(404).json({ message: "Student not found." });

        // ✅ Find the attempted quiz entry
        const attemptedQuiz = student.attemptedQuizzes.find(q => q.quizId._id.toString() === quizId);

        if (!attemptedQuiz) {
            return res.status(404).json({ message: "Quiz not attempted by this student." });
        }

        // ✅ Fetch all questions for the quiz
        const quizQuestions = await Quiz.findById(quizId).populate({
            path: "questions",
            select: "correctAnswerIndex"
        });

        if (!quizQuestions) {
            return res.status(404).json({ message: "Quiz questions not found." });
        }

        // ✅ Map correct answers
        const correctAnswers = quizQuestions.questions.map(q => ({
            questionId: q._id,
            correctAnswerIndex: q.correctAnswerIndex
        }));

        res.status(200).json({
            success: true,
            quizId,
            topic: attemptedQuiz.quizId.topic,
            description: attemptedQuiz.quizId.description,
            totalMarks: attemptedQuiz.quizId.totalMarks,
            marksObtained: attemptedQuiz.marks,
            timeTaken: attemptedQuiz.timeTaken,
            submittedAnswers: attemptedQuiz.submittedAnswers,
            correctAnswers // ✅ Include correct answers for each question
        });

    } catch (error) {
        console.error("Error fetching attempted quiz details:", error);
        res.status(500).json({ success: false, message: "Server error", error });
    }
};

// ✅ Get all attempted quizzes by a student
exports.getAllAttemptedQuizzes = async (req, res) => {
    try {
        const studentId = req.studentId;

        // ✅ Validate student existence
        const student = await Student.findById(studentId)
            .populate({
                path: "attemptedQuizzes.quizId",
                select: "title topic totalMarks rewardPoints duration startAt description"
            })
            .lean();

        if (!student) return res.status(404).json({ success: false, message: "Student not found." });

        // ✅ Map attempted quizzes
        const attemptedQuizzes = student.attemptedQuizzes.map(attempt => ({
            quizId: attempt.quizId._id,
            title: attempt.quizId.title,
            topic: attempt.quizId.topic,
            totalMarks: attempt.quizId.totalMarks,
            rewardPoints: attempt.quizId.rewardPoints,
            duration: attempt.quizId.duration,
            startAt: attempt.quizId.startAt,
            description: attempt.quizId.description,
            marksObtained: attempt.marks,
            timeTaken: attempt.timeTaken
        }));

        res.status(200).json({
            success: true,
            studentId,
            attemptedQuizzes
        });

    } catch (error) {
        console.error("Error fetching all attempted quizzes:", error);
        res.status(500).json({ success: false, message: "Server error", error });
    }
};

