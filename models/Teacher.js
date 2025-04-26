const mongoose = require("mongoose");
const BalanceHistory = require("./BalanceHistory");


const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  contactNumber: { type: String },
  profilepicURL: { type: String, required: true },
  about: { type: String },
  areas_of_expertise: [{ type: String }],
  city: { type: String },
  accountNo: { type: String, required: true }, // Dummy 12-digit account number ( "123456789012" )
  ifscCode: { type: String, required: true },  // Razorpay test IFSC ( "RAZOR0000001" )
  
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }], // Reference to Student model
  
  balance: { type: Number, default: 0 },
  totalEarning: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 }, // Added default value
  total_students: { type: Number, default: 0 }, // Added default value
  course_created: { type: Number, default: 0 },
  join_date: { type: Date, required: true, default: Date.now }, // Added default value
  isVerified: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// Middleware to create a BalanceHistory entry when a new teacher is created
teacherSchema.post("save", async function (doc, next) {
    try {
    await BalanceHistory.create({
      teacherId: doc._id,
      historyIncome: [],
      historyExpense: [],
    });
    next();
  } catch (error) {
    console.error("Error creating balance history:", error);
    next(error);
  }
});

module.exports = mongoose.model("Teacher", teacherSchema);
