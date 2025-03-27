const express = require("express");
const Razorpay = require("razorpay");
const Transaction = require("../models/Transaction");
require("dotenv").config();
const crypto = require("crypto");
const Reward = require("../models/Reward");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
});

// ✅ Create Razorpay Order
exports.createOrderController = async (req, res) => {
    try {
        console.log("create order controller entred")
        const { amount, paymentMethod } = req.body;
        const studentId = req.studentId; // Get studentId from auth middleware
      console.log("requesting for create order for studentId:"+studentId)
      console.log(`he will pay ${amount} by payment method:{paymentMethod}`)
        if (!studentId || !amount) {
            return res.status(400).json({ message: "Invalid request. Student ID or amount missing." });
        }

          // ✅ Payment method validation
          const validPaymentMethods = ["credit_card", "debit_card", "upi", "net_banking"];
          if (!validPaymentMethods.includes(paymentMethod)) {
              return res.status(400).json({ message: "Invalid payment method. Choose from: credit_card, debit_card, upi, net_banking" });
          }

        console.log(`🟢 Creating order: Amount: ₹${amount}, Payment Method: ${paymentMethod}`);

        const order = await razorpay.orders.create({
            amount: amount * 100, // Convert to paisa
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        });

        const transaction = new Transaction({
            student: studentId,
            amount,
            rewardPoints: amount, // 1 Rs = 1 Reward Point
            paymentMethod,
            orderId: order.id,
            transactionId: "",
            status: "pending",
        });

        await transaction.save();
        console.log("create order controller exited")
        res.json({ success: true, order });
        
    } catch (error) {
        console.error("❌ Error creating order:", error.message);
        res.status(500).json({ error: "Error creating order", details: error.message });
    }
};

// ✅ Verify Razorpay Payment
// ✅ Verify Razorpay Payment
exports.verifyPaymentController = async (req, res) => {
    try {
        console.log("🔍 verifyPaymentController entered");

        const { order_id, payment_id, signature } = req.body;
        const studentId = req.studentId;

        console.log("🔍 Verifying payment for Student ID:", studentId);
        console.log(`🔹 Received Order ID: ${order_id}, Payment ID: ${payment_id}, Signature: ${signature}`);

        if (!order_id || !payment_id || !signature) {
            console.error("❌ Missing required fields:", req.body);
            return res.status(400).json({ message: "Invalid request. Missing required fields." });
        }

        const generatedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(order_id + "|" + payment_id)
            .digest("hex");

        console.log("🔍 Expected Signature:", generatedSignature);
        console.log("🔍 Received Signature:", signature);

        if (generatedSignature !== signature) {
            console.error("❌ Signature Mismatch! Payment verification failed.");
            await Transaction.findOneAndUpdate({ orderId: order_id }, { status: "failed" });
            return res.status(400).json({ message: "Payment verification failed. Signature mismatch." });
        }

        // ✅ Update Transaction Status
        const transaction = await Transaction.findOneAndUpdate(
            { orderId: order_id },
            { transactionId: payment_id, status: "success" },
            { new: true }
        );

        if (!transaction) {
            console.error("❌ Transaction record not found for Order ID:", order_id);
            return res.status(404).json({ message: "Transaction not found" });
        }

        console.log(`✅ Payment verified! Reward points to add: ${transaction.rewardPoints}`);

        // ✅ Add Reward Points
        await Reward.findOneAndUpdate(
            { student: studentId },
            { 
                $push: { 
                    pointsChanged: transaction.rewardPoints,
                    reasons: `Added via payment: ${payment_id}`,
                    timestamps: Date.now()
                } 
            },
            { upsert: true, new: true }
        );
        

        console.log(`✅ Reward points (${transaction.rewardPoints}) added for Student ID: ${studentId}`);

        res.json({ success: true, message: "Payment successful, rewards added!" });

    } catch (error) {
        console.error("❌ Error verifying payment:", error.message);
        res.status(500).json({ error: "Error verifying payment", details: error.message });
    }
};
