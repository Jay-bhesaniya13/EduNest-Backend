
// for teacher only
const mongoose = require("mongoose");

const balanceHistorySchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    historyIncome: [
      {
        income: { type: Number, required: true },
        reason: { type: String, required: true },
        date: { type: Date, default: Date.now },
      }],
    historySalary: [
      {
        salary: { type: Number, required: true },
        reason: { type: String, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
  });
  
  
  const BalanceHistory = mongoose.model("BalanceHistory", balanceHistorySchema);
  module.exports = { BalanceHistory };
  