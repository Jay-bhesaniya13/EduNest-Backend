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

const router = express.Router();

router.post("/create", createQuiz);
router.post("/:quizId/add-question/:questionId", addQuestionToQuiz);
router.delete("/:quizId/remove-question/:questionId", removeQuestionFromQuiz);
router.get("/", getAllQuizzes);
router.get("/:quizId", getQuizById);
router.put("/:quizId", updateQuiz);
router.delete("/:quizId", deleteQuiz);

module.exports = router;
