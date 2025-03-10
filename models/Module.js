const mongoose = require("mongoose");
require('dotenv').config();

const moduleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: [{ type: mongoose.Schema.Types.ObjectId, ref: "Content", required: true }],
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    
    price: { type: Number, required: true }, // Base price set by teacher
    sell_price: { type: Number, required: true }, // Final selling price including extra charges
    
    prerequisites: { type: [String] },
    isActive: { type: Boolean, default: true },
    durationHours: { type: Number, default: 0 },
    durationMinutes: { type: Number, default: 0 },

    // 🛒 Sales Tracking Fields
    totalSales: { type: Number, default: 0 },
    monthlySales: { type: Number, default: 0 },
    sixMonthSales: { type: Number, default: 0 },
    yearlySales: { type: Number, default: 0 },


    totalSellPrice: { type: Number, default: 0 },
lastMonthSellPrice: { type: Number, default: 0 },
last6MonthSellPrice: { type: Number, default: 0 },
lastYearSellPrice: { type: Number, default: 0 },

  },
  { timestamps: true }
);

// 🔄 Method to recalculate duration from video content
moduleSchema.methods.calculateDuration = async function () {
  const contentDocs = await mongoose.model("Content").find({ _id: { $in: this.content } });
  let totalMinutes = 0;

  contentDocs.forEach(content => {
    if (content.type === "video") {
      totalMinutes += (content.durationHours || 0) * 60 + (content.durationMinutes || 0);
    }
  });

  this.durationHours = Math.floor(totalMinutes / 60);
  this.durationMinutes = totalMinutes % 60;
};

// 🔄 Automatically update duration and sell price before saving
moduleSchema.pre("save", async function (next) {
  await this.calculateDuration();
  
  const COURSE_PRICE_CHARGE_PERCENTAGE = process.env.COURSE_PRICE_CHARGE_PERCENTAGE || 10;
  this.sell_price = this.price + (this.price * COURSE_PRICE_CHARGE_PERCENTAGE) / 100;

  next();
});

// 🔄 Method to update sales stats at the start of each month
moduleSchema.statics.updateMonthlySales = async function () {
  try {
    const modules = await this.find();

    for (const module of modules) {
      module.yearlySales -= module.monthlySales;
      module.sixMonthSales -= module.monthlySales;
      module.monthlySales = 0;

      module.yearlySales = Math.max(module.yearlySales, 0);
      module.sixMonthSales = Math.max(module.sixMonthSales, 0);

      await module.save();
    }

    console.log("✅ Module sales data updated successfully.");
  } catch (error) {
    console.error("❌ Error updating module sales data:", error);
  }
};

module.exports = mongoose.model("Module", moduleSchema);
