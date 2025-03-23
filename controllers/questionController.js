const Question = require("../models/Question");

// ✅ Create a new question (Only authenticated admins)
exports.createQuestion = async (req, res) => {
  try {
    const { question, options, correctAnswerIndex, marks } = req.body;
    const newQuestion = new Question({
      question,
      options,
      correctAnswerIndex,
      marks,
      admin: req.admin._id, // Set the authenticated admin as creator
    });
    console.log("New Question Body for Crete:  "+newQuestion)

    await newQuestion.save();
    res.status(201).json({ message: "Question created successfully", question: newQuestion });
  } catch (error) {
    console.log("Errorin Question:"+error.message)
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get Question By ID (Only the admin who created it can access)
exports.getQuestionById = async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    // Ensure the requesting admin is the one who created the question
    if (question.admin.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ message: "Access denied. You are not the owner of this question." });
    }

    res.status(200).json({ message: "Question retrieved successfully", question });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
