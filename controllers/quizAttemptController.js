const Student = require("../models/Student");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Leaderboard = require("../models/LeaderBoard");

exports.availableAllQuizzes =
async (req, res) => {
    try {
        const currentTime = new Date();

        const quizzes = await Quiz.find({
            $expr: {
                $gt: [
                    { $add: ["$startAt", { $multiply: ["$duration", 60000] }] }, // Expiry time
                    currentTime
                ]
            }
        }).select("_id title topic totalMarks rewardPoints duration startAt description questions");

        // Format response
        const response = quizzes.map(quiz => ({
            id:quiz._id,
            title: quiz.title || "Untitled",
            topic: quiz.topic,
            totalMarks: quiz.totalMarks,
            rewardPoints: quiz.rewardPoints,
            duration: quiz.duration,
            startAt: quiz.startAt,
            description: quiz.description,
            totalQuestions: quiz.questions.length
        }));

        res.status(200).json({ success: true, quizzes: response });
    } catch (error) {
        console.error("Error fetching quizzes:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// ✅ Get Quiz by ID (Without Answers)
exports.getQuizById = async (req, res) => {
    try {
        const { quizId } = req.params;

        if (!quizId) {
            return res.status(400).json({ message: "Quiz ID is required." });
        }

        // ✅ Fetch the quiz
        const quiz = await Quiz.findById(quizId).populate("questions");

        if (!quiz) {
            return res.status(404).json({ message: "Quiz not found." });
        }

        // ✅ Check if the quiz is allowed to be accessed
        const currentTime = Date.now();
        if (quiz.startAt > currentTime) {
            return res.status(403).json({ message: "Quiz has not started yet." });
        }

        // ✅ Remove correct answers from questions
        const sanitizedQuestions = quiz.questions.map(q => ({
            _id: q._id,
            questionText: q.questionText,
            options: q.options,
            marks: q.marks
        }));

        // ✅ Send response (with the correct backend-controlled start time)
        res.status(200).json({
            quizId: quiz._id,
            topic: quiz.topic,
            description: quiz.description,
            duration: quiz.duration,
            totalMarks: quiz.totalMarks,
            startAt: quiz.startAt, // ✅ Start time is from DB (not user input)
            rewardPoints: quiz.rewardPoints,
            questions: sanitizedQuestions
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error", error });
    }
};


exports.submitQuizAttempt = async (req, res) => {
    try {
        const { quizId, answers } = req.body;
        const studentId = req.studentId;

        if (!quizId || !answers || !Array.isArray(answers)) {
            return res.status(400).json({ message: "Quiz ID and answers array are required." });
        }

        // ✅ Fetch the quiz
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found." });

        // ✅ Ensure quiz has already started
        const currentTime = Date.now();
        if (quiz.startAt > currentTime) {
            return res.status(403).json({ message: "Quiz has not started yet." });
        }

        // ✅ Fetch the student
        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ message: "Student not found." });

        // ❌ Prevent multiple attempts (Student can only attempt once)
        const hasAttempted = student.attemptedQuizzes.some(q => q.quizId.toString() === quizId);
        if (hasAttempted) {
            return res.status(403).json({ message: "You have already attempted this quiz." });
        }

        // ✅ Calculate `timeTaken`
        const timeTaken = Math.floor((currentTime - quiz.startAt) / 1000);

        // ✅ Fetch all questions for this quiz
        const questionIds = answers.map(a => a.questionId);
        const questions = await Question.find({ _id: { $in: questionIds } });

        if (questions.length !== answers.length) {
            return res.status(400).json({ message: "Some questions are missing or invalid." });
        }

        let totalMarks = 0;
        let maxMarks = 0;
        let submittedAnswers = [];

        answers.forEach(answer => {
            const question = questions.find(q => q._id.toString() === answer.questionId);
            if (question) {
                maxMarks += question.marks;
                if (question.correctAnswerIndex === answer.selectedAnswerIndex) {
                    totalMarks += question.marks;
                }
                submittedAnswers.push({
                    questionId: question._id,
                    selectedAnswerIndex: answer.selectedAnswerIndex
                });
            }
        });

        // ✅ Store the attempt in the student's record
        student.attemptedQuizzes.push({ quizId, marks: totalMarks, timeTaken, submittedAnswers });

        // ✅ Increment `quiz.attempts`
        quiz.attempts += 1;

        // ✅ Update both student and quiz simultaneously
        await Promise.all([student.save(), quiz.save()]);

        // ✅ Update leaderboard
        let leaderboard = await Leaderboard.findOne({ quizId });

        if (!leaderboard) {
            leaderboard = new Leaderboard({ quizId, topStudents: [] });
        }

        // ✅ Add student to leaderboard
        leaderboard.topStudents.push({ studentId, marks: totalMarks, timeTaken });

        // ✅ Sort leaderboard by marks (desc) and timeTaken (asc)
        leaderboard.topStudents = leaderboard.topStudents.sort((a, b) => {
            if (b.marks === a.marks) return a.timeTaken - b.timeTaken; // Less time is better
            return b.marks - a.marks;
        });

        await leaderboard.save();

        res.status(200).json({
            message: "Quiz attempt recorded successfully.",
            marksObtained: totalMarks,
            maxMarks,
            timeTaken,
            attempts: quiz.attempts, // 🆕 Return the updated number of attempts
            submittedAnswers,
            correctAnswers: questions.map(q => ({
                questionId: q._id,
                correctAnswerIndex: q.correctAnswerIndex
            }))
        });

    } catch (error) {
        console.error("Error in submitQuizAttempt:", error);
        res.status(500).json({ message: "Server error", error: error.message || error });
    }
};
