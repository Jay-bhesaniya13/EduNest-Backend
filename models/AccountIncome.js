const mongoose = require("mongoose");

const accountIncomeSchema = new mongoose.Schema({
  month: { type: Number, required: true }, // 1 - 12 (January - December)
  year: { type: Number, required: true }, // Year value (e.g., 2025)
  income: [{ type: Number, required: true }], // Income values corresponding to each reason
  reason: [{ type: String, required: true }], // Reason for income (matches income array)
  time: [{ type: String, required: true }], // Time when income was recorded
  date: [{ type: Date, required: true }], // Date when income was recorded
});

// Ensure a unique month-year combination
accountIncomeSchema.index({ month: 1, year: 1 }, { unique: true });

const AccountIncome = mongoose.model("AccountIncome", accountIncomeSchema);

module.exports = AccountIncome;
