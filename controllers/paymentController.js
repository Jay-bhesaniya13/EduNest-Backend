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
exports.verifyPaymentController = async (req, res) => {
    try {
        console.log("verify order controller entred")
        const { order_id, payment_id, signature } = req.body;
        const studentId = req.studentId; // Get studentId from auth middleware
        console.log("requesting for verify payment for studentId:"+studentId)
        console.log(`he had pay ${amount} by payment method:{paymentMethod} then only generate payment id`)
        if (!order_id || !payment_id || !signature) {
            return res.status(400).json({ message: "Invalid request. Missing required fields." });
        }

        console.log(`🟢 Verifying payment: Order ID: ${order_id}, Payment ID: ${payment_id}`);

        const generatedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(order_id + "|" + payment_id)
            .digest("hex");

        if (generatedSignature !== signature) {
            await Transaction.findOneAndUpdate({ orderId: order_id }, { status: "failed" });
            return res.status(400).json({ message: "Payment verification failed" });
        }

        // Update Transaction Status
        const transaction = await Transaction.findOneAndUpdate(
            { orderId: order_id },
            { transactionId: payment_id, status: "success", updatedAt: Date.now() },
            { new: true }
        );

        if (transaction) {
            console.log(`✅ Payment verified! Reward points added: ${transaction.rewardPoints}`);
            await Reward.findOneAndUpdate(
                { student: studentId },
                {
                    $push: {
                        pointsChanged: transaction.rewardPoints,
                        reasons: `Added reward points via payment transaction id: ${payment_id}`,
                        timestamps: Date.now(),
                    },
                },
                { upsert: true, new: true }
            );
        }
        console.log("verify order controller exited")


        res.json({ success: true, message: "Payment successful, rewards added!" });
    } catch (error) {
        console.error("❌ Error verifying payment:", error.message);
        res.status(500).json({ error: "Error verifying payment", details: error.message });
    }
};
