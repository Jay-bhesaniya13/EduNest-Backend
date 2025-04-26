require("dotenv").config();
const mongoose = require("mongoose");
const Teacher = require("./models/Teacher"); // adjust the path

const Mongo_URI = process.env.Mongo_URI;

mongoose
  .connect(Mongo_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully!"))
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err);
    process.exit(1);
  });

async function updateTeacherBalances() {
  try {
    const teachers = await Teacher.find({});

    if (!teachers.length) {
      console.log("No teachers found.");
      return;
    }

    console.log(`Found ${teachers.length} teachers. Updating balances...`);

    for (const teacher of teachers) {
      // Random multiple of 100 between 100 and 1000
      const randomMultiple = Math.floor(Math.random() * 10 + 1) * 100;

      await Teacher.findByIdAndUpdate(teacher._id, { balance: randomMultiple });

      console.log(`Updated ${teacher.name}'s balance to ₹${randomMultiple}`);
    }

    console.log("✅ All teacher balances updated!");
  } catch (error) {
    console.error("❌ Error updating balances:", error.message);
  } finally {
    mongoose.disconnect();
  }
}

updateTeacherBalances();
