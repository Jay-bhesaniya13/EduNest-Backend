const mongoose = require("mongoose");
const Module = require("./Module");
require('dotenv').config();

const COURSE_DISCOUNT_PERCENTAGE = process.env.COURSE_DISCOUNT_PERCENTAGE || 0;
const COURSE_PRICE_CHARGE_PERCENTAGE = process.env.COURSE_PRICE_CHARGE_PERCENTAGE || 0;

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  modules: [{ type: mongoose.Schema.Types.ObjectId, ref: "Module" }],

  price: { type: Number, required: true }, // Base price calculated from module prices
  sell_price: { type: Number, required: true }, // Final selling price including extra charges

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
  totalRating: { type: Number },
  ratedStudent: { type: Number },
  avgRating: { type: Number },

  // Sales Tracking Fields
  totalSell: { type: Number, default: 0 },
  lastMonthSell: { type: Number, default: 0 },
  last6MonthSell: { type: Number, default: 0 },
  lastYearSell: { type: Number, default: 0 },
});

// Pre-save hook to calculate final course price
courseSchema.pre("save", async function (next) {
  try {
   console.log("*****************pre is called.****************")
   console.log("COURSE_DISCOUNT_PERCENTAGE:"+COURSE_DISCOUNT_PERCENTAGE)

    const moduleDocs = await Module.find({ _id: { $in: this.modules } });

    const totalModulePrice = moduleDocs.reduce((sum, module) => sum + module.price, 0);

    // Apply discount percentage from config
    const discountAmount = (totalModulePrice * COURSE_DISCOUNT_PERCENTAGE) / 100;
    this.price = totalModulePrice - discountAmount;

    // Apply extra charges to get final sell price
    this.sell_price = this.price + (this.price * COURSE_PRICE_CHARGE_PERCENTAGE) / 100;
    console.log("sell_price:"+this.sell_price)
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
    course.lastYearSell -= course.lastMonthSell;
    course.last6MonthSell -= course.lastMonthSell;
    course.last6MonthSell = Math.max(course.last6MonthSell, 0);
    course.lastYearSell = Math.max(course.lastYearSell, 0);

    course.lastMonthSell = 0;

    await course.save();
  }
};

module.exports = mongoose.model("Course", courseSchema);
