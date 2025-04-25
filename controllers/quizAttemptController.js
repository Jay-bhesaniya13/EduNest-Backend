const Student = require("../models/Student");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Leaderboard = require("../models/LeaderBoard");
const mongoose = require("mongoose");

exports.getQuizById = async (req, res) => {
    try {
        const { quizId } = req.params;
        const studentId = req.studentId; // ✅ Ensure this is set via authentication middleware

        // ✅ Find the quiz by ID
        const quiz = await Quiz.findById(quizId)
            .populate({
                path: "questions",
                select: "_id question options marks"
            })
            .lean();

        if (!quiz) {
            return res.status(404).json({ success: false, message: "Quiz not found" });
        }

        // ✅ Check if the student has already attempted this quiz
        const student = await Student.findById(studentId).select("attemptedQuizzes").lean();

        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        student.attemptedQuizzes = student.attemptedQuizzes || []; // Ensure it's an array

        const hasAttempted = student.attemptedQuizzes.some(attempt => 
            attempt.quizId== quizId
        );

        if (hasAttempted) {
            return res.status(403).json({ 
                success: false, 
                message: "You have already attempted this quiz. You cannot access it again." 
            });
        }

        // ✅ Fetch students who attempted this quiz
        const students = await Student.find({ "attemptedQuizzes.quizId": quizId })
            .select("name email _id attemptedQuizzes.marks attemptedQuizzes.timeTaken")
            .lean();

        // ✅ Extract relevant student data
        const attemptedStudents = students.map(student => {
            const attempt = student.attemptedQuizzes.find(a => a.quizId == quizId);
            return {
                studentId: student._id,
                name: student.name,
                email: student.email,
                marksObtained: attempt?.marks || 0,
                timeTaken: attempt?.timeTaken || 0
            };
        });

        res.status(200).json({
            success: true,
            quiz: {
                ...quiz,
                attemptedStudents
            }
        });

    } catch (error) {
        console.error("Error fetching quiz by ID:", error);
        res.status(500).json({ success: false, message: "Internal server error", error });
    }
};


// ✅ Get all available quizzes (with attempted student data)
exports.availableAllQuizzes = async (req, res) => {
    try {
        // Fetch all quizzes
        const quizzes = await Quiz.find()
            .populate({
                path: "questions",
                select: "_id questionText options marks"
            })
            .lean();

        // Fetch all students who attempted quizzes
        const students = await Student.find({ "attemptedQuizzes.0": { $exists: true } })
            .select("name email _id attemptedQuizzes")
            .lean();

        // Create a mapping of attempted students per quiz
        const quizAttemptsMap = {};
        students.forEach(student => {
            student.attemptedQuizzes.forEach(attempt => {
                const quizId = attempt.quizId.toString();

                if (!quizAttemptsMap[quizId]) {
                    quizAttemptsMap[quizId] = [];
                }

                quizAttemptsMap[quizId].push({
                    studentId: student._id,
                    name: student.name,
                    email: student.email,
                    marksObtained: attempt.marks,
                    timeTaken: attempt.timeTaken
                });
            });
        });

        // Attach attempted students to each quiz
        const response = quizzes.map(quiz => ({
            id: quiz._id,
            title: quiz.title || "Untitled",
            topic: quiz.topic,
            totalMarks: quiz.totalMarks,
            rewardPoints: quiz.rewardPoints,
            duration: quiz.duration,
            startAt: quiz.startAt,
            description: quiz.description,
            totalQuestions: quiz.questions.length,
            attemptedStudents: quizAttemptsMap[quiz._id.toString()] || []
        }));

        res.status(200).json({ success: true, quizzes: response });
    } catch (error) {
        console.error("Error fetching available quizzes:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};


// Submit Quiz  ( attempt only per user )
exports.submitQuizAttempt = async (req, res) => {
    const session = await mongoose.startSession(); // 🛑 Start a MongoDB session
    session.startTransaction(); // 🔄 Begin transaction

    try {
        const { quizId, answers } = req.body;
        const studentId = req.studentId;

        console.log("Received quizId:", quizId);
        console.log("Received Answers:", answers);

        if (!quizId || !answers || !Array.isArray(answers)) {
            return res.status(400).json({ message: "Quiz ID and answers array are required." });
        }

        // ✅ Fetch the quiz
        const quiz = await Quiz.findById(quizId).session(session);
        if (!quiz) throw new Error("Quiz not found.");

        // ✅ Ensure quiz has started
        const currentTime = Date.now();
        if (quiz.startAt > currentTime) {
            throw new Error("Quiz has not started yet.");
        }

        // ✅ Fetch the student
        const student = await Student.findById(studentId).session(session);
        if (!student) throw new Error("Student not found.");

        // ❌ Prevent multiple attempts (Student can only attempt once)
        const hasAttempted = student.attemptedQuizzes.some(q => q.quizId== quizId);
        if (hasAttempted) throw new Error("You have already attempted this quiz.");

        // ✅ Calculate `timeTaken`
        const timeTaken = Math.floor((currentTime - quiz.startAt) / 1000);

        // ✅ Fetch all questions for this quiz
        const questionIds = answers.map(a => a.questionId);
        const questions = await Question.find({ _id: { $in: questionIds } }).session(session);

        if (questions.length !== answers.length) {
            throw new Error("Some questions are missing or invalid.");
        }

        let totalMarks = 0;
        let maxMarks = 0;
        let submittedAnswers = [];

        answers.forEach(answer => {
            const question = questions.find(q => q._id== answer.questionId);
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

        // ✅ Update both student and quiz
        await Promise.all([
            student.save({ session }),
            quiz.save({ session })
        ]);

        // ✅ Update leaderboard
        let leaderboard = await Leaderboard.findOne({ quizId }).session(session);

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

        await leaderboard.save({ session });

        // ✅ COMMIT Transaction (If everything goes well)
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            message: "Quiz attempt recorded successfully.",
            marksObtained: totalMarks,
            maxMarks,
            timeTaken,
            attempts: quiz.attempts,
            submittedAnswers,
            correctAnswers: questions.map(q => ({
                questionId: q._id,
                correctAnswerIndex: q.correctAnswerIndex
            }))
        });

    } catch (error) {
        console.error("Error in submitQuizAttempt:", error);

        // ❌ ROLLBACK Transaction on Error
        await session.abortTransaction();
        session.endSession();

        res.status(500).json({ message: "Server error", error: error.message || error });
    }
};
