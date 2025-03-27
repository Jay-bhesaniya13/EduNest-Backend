const express = require("express");
const { createOrderController, verifyPaymentController } = require("../controllers/paymentController");
const { authenticateStudent}=require("../controllers/authController")

const router = express.Router();

// Create Order
router.post("/create-order",authenticateStudent,  createOrderController);

// Verify Payment
router.post("/verify-payment",authenticateStudent, verifyPaymentController);

module.exports = router;
