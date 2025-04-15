const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    amount: { type: Number, required: true },
    rewardPoints: { type: Number, default: 0 },
    // paymentMethod: { type: String, enum: ["credit_card", "debit_card", "upi", "net_banking"] },
    paymentMethod: { type: String, enum: ["card", "upi", "net_banking"] },
    transactionId: { type: String },
    orderId: { type: String, required: true },
    status: { type: String, enum: ["success", "failed", "pending"], default: "pending" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transaction", transactionSchema);
