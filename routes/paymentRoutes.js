const express = require("express");
const { createOrderController, verifyPaymentController } = require("../controllers/paymentController");

const router = express.Router();

// Create Order
router.post("/create-order", createOrderController);

// Verify Payment
router.post("/verify-payment", verifyPaymentController);

module.exports = router;
