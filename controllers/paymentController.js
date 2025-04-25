const express = require("express");
const Razorpay = require("razorpay");
const Transaction = require("../models/Transaction");
const crypto = require("crypto");
const Reward = require("../models/Reward");
const Student = require("../models/Student");
const nodemailer = require("nodemailer"); // ✅ Missing import added
require("dotenv").config();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
});

// ✅ Map Razorpay's method to allowed payment methods
const mapRazorpayMethod = (method) => {
    if (method === "upi") return "upi";
    if (method === "netbanking") return "net_banking";
    if (method === "card") return "card";
    return null; // Ignore invalid method
};

// ✅ Create Razorpay Order (No Payment Method Stored Yet)
exports.createOrderController = async (req, res) => {
    try {
        const { amount } = req.body;
        const studentId = req.studentId;

        if (!studentId || !amount) {
            console.log("in create order: ")
            console.log("amount:"+amount)
            console.log("studentId:"+studentId)
            return res.status(400).json({ message: "Invalid request. Student ID or amount missing." });
        }

        console.log(`🟢 Creating order: Amount: ₹${amount}`);

        const order = await razorpay.orders.create({
            amount: amount * 100, // Convert to paisa
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        });

        const transaction = new Transaction({
            student: studentId,
            amount,
            rewardPoints: amount, // 1 Rs = 1 Reward Point
            orderId: order.id,
            transactionId: "",
            status: "pending",
            paymentMethod: "", // ✅ Payment method will be updated after successful payment
        });

        await transaction.save();
        res.json({ success: true, order });

    } catch (error) {
        console.error("❌ Error creating order:", error.message);
        res.status(500).json({ error: "Error creating order", details: error.message });
    }
};

// ✅ Function to Send Email
const sendPaymentSuccessEmail = async (studentEmail, studentName, amount, rewardPoints) => {
    try {
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        let mailOptions = {
            from: process.env.EMAIL_USER,
            to: studentEmail,
            subject: "Payment Successful - Reward Points Added!",
            html: `
                <h2>Payment Successful</h2>
                <p>Dear ${studentName},</p>
                <p>Your payment of ₹${amount} has been successfully processed.</p>
                <p>You have earned <strong>${rewardPoints} reward points</strong> as part of this transaction.</p>
                <p>Thank you for using our platform!</p>
                <br>
                <p>Best Regards,</p>
                <p>EduNest Team</p>
            `,
        };

        await transporter.sendMail(mailOptions);
        console.log("📧 Payment success email sent to:", studentEmail);
    } catch (error) {
        console.error("❌ Error sending email:", error.message);
    }
};

// ✅ Verify Razorpay Payment & Store Actual Payment Method
exports.verifyPaymentController = async (req, res) => {
    try {
        const { order_id, payment_id, signature } = req.body;
        const studentId = req.studentId;

        if (!order_id || !payment_id || !signature) {
            return res.status(400).json({ message: "Invalid request. Missing required fields." });
        }

        // ✅ Verify Signature
        const generatedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(order_id + "|" + payment_id)
            .digest("hex");

        if (generatedSignature !== signature) {
            await Transaction.findOneAndUpdate({ orderId: order_id }, { status: "failed" });
            return res.status(400).json({ message: "Payment verification failed. Signature mismatch." });
        }

        // ✅ Fetch actual payment details from Razorpay
        const payment = await razorpay.payments.fetch(payment_id);
        const actualMethod = mapRazorpayMethod(payment.method);
        if (!actualMethod) {
            return res.status(400).json({ message: "Invalid payment method detected from Razorpay!" });
        }

        // ✅ Update Transaction
        const transaction = await Transaction.findOneAndUpdate(
            { orderId: order_id },
            {
                transactionId: payment_id,
                status: "success",
                paymentMethod: actualMethod
            },
            { new: true }
        );

        if (!transaction) {
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
                    timestamps: Date.now() // ✅ fixed
                }
            },
            { upsert: true, new: true }
        );

        // ✅ Update Total Reward Points in Student
        const reward = await Reward.findOne({ student: studentId });
        if (reward) {
            const totalPoints = reward.pointsChanged.reduce((acc, pts) => acc + pts, 0);
            await Student.findByIdAndUpdate(studentId, { rewardPoints: totalPoints });
        }

        // ✅ Send Confirmation Email
        const student = await Student.findById(studentId);
        if (student) {
            sendPaymentSuccessEmail(student.email, student.name, transaction.amount, transaction.rewardPoints);
        }

        res.json({ success: true, message: "Payment successful, rewards added!" });

    } catch (error) {
        console.error("❌ Error verifying payment:", error.message);
        res.status(500).json({ error: "Error verifying payment", details: error.message });
    }
};
