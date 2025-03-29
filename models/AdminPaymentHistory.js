const mongoose = require("mongoose");

const adminPaymentHistorySchema = new mongoose.Schema({
  payments: [
    {
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      teachersPaid: [
        {
          teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
          name: String,
          username: String,
          email: String,
          paidAmount: Number,
        },
      ],
    },
  ],
});

module.exports = mongoose.model("AdminPaymentHistory", adminPaymentHistorySchema);
