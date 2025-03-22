const Student = require("../models/Student");
const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const Leaderboard = require("../models/LeaderBoard");


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
        const { quizId, answers } = req.body; // ❌ Removed `timeTaken` from request
        const studentId = req.studentId;

        if (!quizId || !answers || !Array.isArray(answers)) {
            return res.status(400).json({ message: "Quiz ID and answers array are required." });
        }

        // ✅ Fetch the quiz (get start time from DB)
        const quiz = await Quiz.findById(quizId);
        if (!quiz) return res.status(404).json({ message: "Quiz not found." });

        // ✅ Ensure quiz has already started
        const currentTime = Date.now();
        if (quiz.startAt > currentTime) {
            return res.status(403).json({ message: "Quiz has not started yet." });
        }

        // ✅ Calculate `timeTaken` (from quiz’s actual start time)
        const timeTaken = Math.floor((currentTime - quiz.startAt) / 1000); // Time in seconds

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

        // ✅ Fetch the student
        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ message: "Student not found." });

        // ✅ Check if the student already attempted this quiz
        const existingAttemptIndex = student.attemptedQuizzes.findIndex(q => q.quizId.toString() === quizId);

        if (existingAttemptIndex !== -1) {
            const existingAttempt = student.attemptedQuizzes[existingAttemptIndex];
            if (totalMarks > existingAttempt.marks || (totalMarks === existingAttempt.marks && timeTaken < existingAttempt.timeTaken)) {
                student.attemptedQuizzes[existingAttemptIndex] = { quizId, marks: totalMarks, timeTaken, submittedAnswers };
            }
        } else {
            student.attemptedQuizzes.push({ quizId, marks: totalMarks, timeTaken, submittedAnswers });
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
            timeTaken, // ✅ Correctly calculated using backend quiz start time
            submittedAnswers,
            correctAnswers: questions.map(q => ({
                questionId: q._id,
                correctAnswerIndex: q.correctAnswerIndex
            }))
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error", error });
    }
};
