const mongoose = require("mongoose");
const Module = require("./Module");
const { COURSE_DISCOUNT_PERCENTAGE } = require("./config");

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  modules: [{ type: mongoose.Schema.Types.ObjectId, ref: "Module" }],
  price: { type: Number, required: true }, // Auto-updated based on module prices
  isActivate: { type: Boolean, default: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  createdAt: { type: Date, default: Date.now },

  // New fields
  thumbnail: { type: String, required: true }, // Image URL
  level: { 
    type: String, 
    enum: ["beginner", "intermediate", "advanced"], 
    required: true 
  },
  totalRating:{type:Number},
  ratedStudent:{type:Number},
  avgRating:{type:Number},
  totalSell: { type: Number, default: 0 }, // Total sales ever
  lastMonthSell: { type: Number, default: 0 }, // Sales in the last month
  last6MonthSell: { type: Number, default: 0 }, // Sales in the last 6 months
  lastYearSell: { type: Number, default: 0 }, // Sales in the last year
});

// Pre-save hook to calculate final course price
courseSchema.pre("save", async function (next) {
  try {
    const moduleDocs = await Module.find({ _id: { $in: this.modules } });

    const totalModulePrice = moduleDocs.reduce((sum, module) => sum + module.price, 0);

    // Apply discount percentage from config
    const discountAmount = (totalModulePrice * COURSE_DISCOUNT_PERCENTAGE) / 100;
    this.price = totalModulePrice - discountAmount;

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Function to update sales stats on the first day of each month
 */
courseSchema.statics.updateMonthlySales = async function () {
  const courses = await this.find();

  for (const course of courses) {
    // Move sales data down
    course.lastYearSell -= course.lastMonthSell;
    course.last6MonthSell -= course.lastMonthSell;
    course.last6MonthSell = Math.max(course.last6MonthSell, 0); // Ensure it doesn't go negative
    course.lastYearSell = Math.max(course.lastYearSell, 0);

    // Reset last month sales
    course.lastMonthSell = 0;

    await course.save();
  }
};

module.exports = mongoose.model("Course", courseSchema);
