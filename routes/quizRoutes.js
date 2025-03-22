const express = require("express");
const {
  createQuiz,
  addQuestionToQuiz,
  removeQuestionFromQuiz,
  getAllQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz
} = require("../controllers/quizController");
const { authenticateAdmin } = require("../controllers/authController");

const router = express.Router();
// For Admin Only
router.post("/create", authenticateAdmin, createQuiz);
router.post("/:quizId/add-question/:questionId", authenticateAdmin, addQuestionToQuiz);
router.delete("/:quizId/remove-question/:questionId", authenticateAdmin, removeQuestionFromQuiz);
router.get("/", authenticateAdmin, getAllQuizzes);
router.get("/:quizId", authenticateAdmin, getQuizById);
router.put("/:quizId", authenticateAdmin, updateQuiz);
router.delete("/:quizId", authenticateAdmin, deleteQuiz);

module.exports = router;
