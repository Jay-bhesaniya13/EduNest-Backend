const express = require("express");

const {
    getQuestionById,
    createQuestion
} = require("../controllers/questionController");

const router = express.Router();

// Get Question by ID
router.get('/:questionId', getQuestionById);

// Create new Question
router.post('/create', createQuestion);

module.exports = router; 
