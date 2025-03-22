const Quiz = require("../models/Quiz");
const Question = require("../models/Question");
const LeaderBoard=require("../models/LeaderBoard")

// Create a new quiz (Admin only) - Also creates a leaderboard
exports.createQuiz = async (req, res) => {
  try {
      const { questions, topic, description, duration, startAt, rewardPoints } = req.body;

      const questionDocs = await Question.find({ _id: { $in: questions } });
      const totalMarks = questionDocs.reduce((sum, q) => sum + (q.marks || 1), 0);

      const newQuiz = new Quiz({
          admin: req.admin._id,
          questions,
          topic,
          description,
          duration,
          startAt,
          rewardPoints,
          totalMarks
      });

      await newQuiz.save();

       
      res.status(201).json({ message: "Quiz created successfully", quiz: newQuiz });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
};

// ✅ Add a question to a quiz (Only quiz creator can add)
exports.addQuestionToQuiz = async (req, res) => {
  try {
    const { quizId, questionId } = req.params;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    if (quiz.admin.toString() !== req.admin._id.toString())
      return res.status(403).json({ message: "Unauthorized. You are not the quiz owner." });

    if (quiz.questions.includes(questionId))
      return res.status(400).json({ message: "Question already exists in this quiz" });

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    quiz.questions.push(questionId);
    quiz.totalPoints += question.point || 1;
    await quiz.save();

    res.status(200).json({ message: "Question added successfully", quiz });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// ✅ Remove a question (Only quiz creator can remove)
exports.removeQuestionFromQuiz = async (req, res) => {
  try {
    const { quizId, questionId } = req.params;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    if (quiz.admin.toString() !== req.admin._id.toString())
      return res.status(403).json({ message: "Unauthorized. You are not the quiz owner." });

    if (quiz.questions.length <= 1)
      return res.status(400).json({ message: "Cannot remove the last question from the quiz" });

    const questionIndex = quiz.questions.indexOf(questionId);
    if (questionIndex === -1)
      return res.status(400).json({ message: "Question not found in this quiz" });

    const question = await Question.findById(questionId);
    quiz.questions.splice(questionIndex, 1);
    quiz.totalPoints -= question?.point || 1;
    await quiz.save();

    res.status(200).json({ message: "Question removed successfully", quiz });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get all quizzes (Only authenticated admin)
exports.getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find();
    res.status(200).json(quizzes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get a quiz by ID (Only if admin owns it)
exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.quizId, admin: req.admin._id }).populate("questions");
    if (!quiz) return res.status(404).json({ message: "Quiz not found or unauthorized." });

    res.status(200).json(quiz);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ✅ Update a quiz (Only quiz creator can update)
exports.updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    if (quiz.admin.toString() !== req.admin._id.toString())
      return res.status(403).json({ message: "Unauthorized. You are not the quiz owner." });

    Object.assign(quiz, req.body);
    await quiz.save();

    res.status(200).json({ message: "Quiz updated successfully", quiz });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Delete quiz (Mark as inactive) (Only creator can delete)
exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    if (quiz.admin.toString() !== req.admin._id.toString())
      return res.status(403).json({ message: "Unauthorized. You are not the quiz owner." });

    quiz.isActive = false;
    await quiz.save();

    res.status(200).json({ message: "Quiz marked as inactive" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
