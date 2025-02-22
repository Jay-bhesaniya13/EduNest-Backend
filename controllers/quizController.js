const Quiz = require("../models/Quiz");
const Question = require("../models/Question");

// ✅ Create a new quiz
exports.createQuiz = async (req, res) => {
  try {
    const { adminId, questions, topic, description, duration, startAt, rewardPoints } = req.body;

    // Fetch questions to calculate total points
    const questionDocs = await Question.find({ _id: { $in: questions } });
    const totalPoints = questionDocs.reduce((sum, q) => sum + (q.point || 1), 0);

    const newQuiz = new Quiz({
      admin: adminId,
      questions,
      topic,
      description,
      duration,
      startAt,
      rewardPoints,
      totalPoints
    });

    await newQuiz.save();
    res.status(201).json({ message: "Quiz created successfully", quiz: newQuiz });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Add a question to a quiz
exports.addQuestionToQuiz = async (req, res) => {
  try {
    const { quizId, questionId } = req.params;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    if (quiz.questions.includes(questionId))
      return res.status(400).json({ message: "Question already exists in this quiz" });

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    quiz.questions.push(questionId);
    quiz.totalPoints += question.point || 1; // Update total points
    await quiz.save();

    res.status(200).json({ message: "Question added successfully", quiz });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Remove a question from a quiz (ensuring it's not the last question)
exports.removeQuestionFromQuiz = async (req, res) => {
  try {
    const { quizId, questionId } = req.params;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    if (quiz.questions.length <= 1)
      return res.status(400).json({ message: "Cannot remove the last question from the quiz" });

    const questionIndex = quiz.questions.indexOf(questionId);
    if (questionIndex === -1)
      return res.status(400).json({ message: "Question not found in this quiz" });

    const question = await Question.findById(questionId);
    quiz.questions.splice(questionIndex, 1);
    quiz.totalPoints -= question?.point || 1; // Update total points
    await quiz.save();

    res.status(200).json({ message: "Question removed successfully", quiz });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get all quizzes
exports.getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find();
    res.status(200).json(quizzes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get a specific quiz by ID
exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId).populate("questions");
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    res.status(200).json(quiz);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Update quiz details
exports.updateQuiz = async (req, res) => {
  try {
    const updatedQuiz = await Quiz.findByIdAndUpdate(req.params.quizId, req.body, { new: true });
    if (!updatedQuiz) return res.status(404).json({ message: "Quiz not found" });

    res.status(200).json({ message: "Quiz updated successfully", quiz: updatedQuiz });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Mark quiz as inactive instead of deleting
exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    quiz.isActive = false;
    await quiz.save();

    res.status(200).json({ message: "Quiz marked as inactive" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
