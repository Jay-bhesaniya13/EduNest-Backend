const mongoose = require("mongoose");

// For teacher Credit/Debit History
const balanceHistorySchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  historyIncome: [
    {
      income: { type: Number, required: true },
      reason: { type: String, required: true },
      date: { type: Date, default: Date.now },
    }
  ],
  historySalary: [
    {
      salary: { type: Number, required: true },
      reason: { type: String, required: true },
      date: { type: Date, default: Date.now },
    }
  ],
});

module.exports = mongoose.model("BalanceHistory", balanceHistorySchema);
