const  Admin = require("../models/Admin");
const Question = require("../models/Question");

// Create a new question
exports.createQuestion = async (req, res) => {
    try {
        const { question, options, correctAnswerIndex, points } = req.body;
        const newQuestion = new Question({
            question, options, correctAnswerIndex, points
        });
        await newQuestion.save();
        res.status(201).json({ message: "Question created successfully", Question: newQuestion });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
 
// Get Question By ID
exports.getQuestionById = async (req, res) => {
    try {
        const { questionId } = req.params;

        // ✅ Fix: Await the database query
        const question = await Question.findById(questionId);

        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        res.status(200).json({ message: "Question retrieved successfully", question });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
