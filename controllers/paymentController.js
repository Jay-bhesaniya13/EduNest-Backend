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
        const { studentId, amount, paymentMethod } = req.body;
        if (!studentId || !amount) {
            return res.status(400).json({ message: "Invalid request" });
        }

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
        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ error: "Error creating order", details: error.message });
    }
};

// ✅ Verify Razorpay Payment
exports.verifyPaymentController = async (req, res) => {
    try {
        const { order_id, payment_id, signature, studentId } = req.body;

        if (!order_id || !payment_id || !signature) {
            return res.status(400).json({ message: "Invalid request" });
        }

        const generatedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(order_id + "|" + payment_id)
            .digest("hex");

        if (generatedSignature !== signature) {
            await Transaction.findOneAndUpdate({ orderId: order_id }, { status: "failed" });
            return res.status(400).json({ message: "Payment verification failed" });
        }

        const transaction = await Transaction.findOneAndUpdate(
            { orderId: order_id },
            { transactionId: payment_id, status: "success", updatedAt: Date.now() },
            { new: true }
        );

        if (transaction) {
            await Reward.findOneAndUpdate(
                { student: studentId },
                {
                    $push: {
                        pointsChanged: transaction.rewardPoints,
                        reasons: "Added reward points via payment",
                        timestamps: Date.now(),
                    },
                },
                { upsert: true, new: true }
            );
        }

        res.json({ success: true, message: "Payment successful, rewards added!" });
    } catch (error) {
        res.status(500).json({ error: "Error verifying payment", details: error.message });
    }
};
