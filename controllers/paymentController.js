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


const sendRewardEmail = async (studentId, points, reason) => {
    try {
        const student = await Student.findById(studentId);
        if (!student || !student.email) return;

        const color = points > 0 ? "green" : "yellow";
        const sign = points > 0 ? "+" : "";

        // Email Body
        const emailHTML = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
                <div style="max-width: 500px; margin: auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
                    <h2 style="color: green; text-align: center;">EduNest Reward Points Update</h2>
                    <p style="font-size: 16px; color: #333;">Dear <strong>${student.name}</strong>,</p>
                    <p style="font-size: 16px; color: #333;">Your reward points have been updated.</p>
                    <div style="padding: 10px; border-radius: 5px; background-color: ${color}; color: white; text-align: center; font-size: 18px;">
                        <strong>${sign}${points} Points</strong>
                    </div>
                    <p style="font-size: 16px; color: #333;">Reason: <strong>${reason}</strong></p>
                    <p style="text-align: center; margin-top: 20px;">
                        <a href="https://edunest.com/rewards" style="background: green; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px;">View Rewards</a>
                    </p>
                </div>
            </div>
        `;

        // Email Configuration
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: `"EduNest" <${process.env.EMAIL_USER}>`,
            to: student.email,
            subject: "Your Reward Points Have Been Updated",
            html: emailHTML
        });

        console.log(`📧 Reward email sent to ${student.email}`);
    } catch (error) {
        console.error("❌ Error sending reward email:", error.message);
    }
};


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

        // ✅ Calculate total reward points and update Student model
        const reward = await Reward.findOne({ student: studentId });

        if (reward) {
            const totalPoints = reward.pointsChanged.reduce((acc, points) => acc + points, 0);

            await Student.findByIdAndUpdate(studentId, { rewardPoints: totalPoints });

            console.log(`✅ Student (${studentId}) reward points updated to: ${totalPoints}`);

            // ✅ Send Reward Email
            await sendRewardEmail(studentId, transaction.rewardPoints, `Added via payment: ${payment_id}`);
        }

        res.json({ success: true, message: "Payment successful, rewards added!" });

    } catch (error) {
        console.error("❌ Error verifying payment:", error.message);
        res.status(500).json({ error: "Error verifying payment", details: error.message });
    }
};
