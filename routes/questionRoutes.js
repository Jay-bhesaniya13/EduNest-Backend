const express = require("express");
const { getQuestionById, createQuestion } = require("../controllers/questionController");
const { authenticateAdmin } = require("../controllers/authController");

const router = express.Router();

router.get("/:questionId", authenticateAdmin, getQuestionById); // Protected: Only the creator can access
router.post("/create", authenticateAdmin, createQuestion); // Protected: Only admins can create

module.exports = router;
