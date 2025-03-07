const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const Module = require("../models/Module");
const BalanceHistory = require("../models/BalanceHistory");
const Teacher = require("../models/Teacher");
const Transaction = require("../models/Transaction");
const AccountIncome = require("../models/AccountIncome");
const dotenv = require("dotenv");
dotenv.config();
const { COURSE_DISCOUNT_PERCENTAGE } = process.env.COURSE_DISCOUNT_PERCENTAGE;

// Enroll student in all modules of a course with discounted price
exports.coursePurchaseEnrollment = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({ message: "studentId and courseId are required" });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (!student.isActive) return res.status(403).json({ message: "Student is deactivated and cannot enroll" });

    const course = await Course.findById(courseId).populate("modules");
    if (!course) return res.status(404).json({ message: "Course not found" });

    const teacherId = course.teacherId;
    
    const modules = course.modules.map((module) => ({
      moduleId: module._id,
      price: module.price - (module.price * COURSE_DISCOUNT_PERCENTAGE) / 100,
    }));

    if (modules.length === 0) {
      return res.status(400).json({ message: "No modules found in this course" });
    }

    let enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
    if (enrollment) {
      return res.status(400).json({ message: "Student is already enrolled in this course" });
    }

    const newEnrollment = new Enrollment({
      student: studentId,
      course: courseId,
      modules: modules.map((mod) => mod.moduleId),
      modulePrices: modules.map((mod) => mod.price),
    });
    await newEnrollment.save();

    const moduleIds = modules.map((mod) => mod.moduleId);

    // Update student document
    await Student.findByIdAndUpdate(studentId, {
      $addToSet: { courses_enrolled: courseId, modules_enrolled: { $each: moduleIds } }
    });

    await Course.findByIdAndUpdate(courseId, { $inc: { totalSales: 1, monthlySales: 1, sixMonthSales: 1, yearlySales: 1 } });

    for (let mod of modules) {
      await Module.findByIdAndUpdate(mod.moduleId, { $inc: { totalSales: 1, monthlySales: 1, sixMonthSales: 1, yearlySales: 1 } });
    }


    // ✅ Update Teacher's Balance & BalanceHistory
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // Add total original price of modules to teacher's balance
    const totalOriginalPrice = modules.reduce((sum, mod) => sum + mod.originalPrice, 0);
    teacher.balance += totalOriginalPrice;
    await teacher.save();

    let balanceHistory = await BalanceHistory.findOne({ teacherId });
    if (!balanceHistory) {
      balanceHistory = new BalanceHistory({ teacherId, historyIncome: [], historyExpense: [] });
    }

    balanceHistory.historyIncome.push({
      income: totalOriginalPrice ,
      reason: `Full ${course.title} enrolled by ${student.name}`,
      date,
    });

    await balanceHistory.save();

    res.status(201).json({ message: "Course purchased successfully", enrollment: newEnrollment });
  } catch (error) {
    console.error("Error in course purchase enrollment:", error);
    res.status(500).json({ error: "Server error" });
  }
};


// Create enrollment for selected modules
exports.createEnrollmentModules = async (req, res) => {
  try {
    const { studentId, courseId, modules } = req.body;

    if (!studentId || !courseId || !modules || modules.length === 0) {
      return res.status(400).json({ message: "studentId, courseId & modules are required" });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (!student.isActive) return res.status(403).json({ message: "Student is deactivated and cannot enroll" });

    const existingCourse = await Course.findById(courseId);
    if (!existingCourse) return res.status(404).json({ message: "Course not found" });

    const teacherId = existingCourse.teacherId;
     
    let enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
    if (enrollment) {
      for (let module of modules) {
        if (!enrollment.modules.includes(module.moduleId)) {
          sell_price+=module.sell_price;
          price+=module.price;
          enrollment.modules.push(module.moduleId);
          await Module.findByIdAndUpdate(module.moduleId, { $inc: { totalSales: 1, monthlySales: 1, sixMonthSales: 1, yearlySales: 1 } });
        }
      }
      await enrollment.save();
    } else {
      enrollment = new Enrollment({
        student: studentId,
        course: courseId,
        modules: modules.map((module) => module.moduleId),
        modulePrices: modules.map((module) => module.price),
      });
      await enrollment.save();
    }
 

    // ✅ Update Teacher's Balance & BalanceHistory
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
  

    // Add total original price of modules to teacher's balance
    const totalOriginalPrice = modules.reduce((sum, mod) => sum + mod.originalPrice, 0);
    teacher.balance += totalOriginalPrice;
    await teacher.save();

 

    let balanceHistory = await BalanceHistory.findOne({ teacherId });
    if (!balanceHistory) {
      balanceHistory = new BalanceHistory({ teacherId, historyIncome: [], historyExpense: [] });
    }

    balanceHistory.historyIncome.push({
      income: transactionAmount,
      reason: `Modules from ${existingCourse.title} enrolled by ${student.name}`,
      date,
    });

    await balanceHistory.save();

    res.status(200).json({ message: "Modules added to enrollment successfully", enrollment });
  } catch (error) {
    console.error("Error creating enrollment:", error);
    res.status(500).json({ error: "Server error" });
  }
};



// Get all enrollments (only if adminId is valid)
exports.getAllEnrollments = async (req, res) => {
  try {
    // Fetch all enrollments
    const enrollments = await Enrollment.find().populate("student course modules"); // Populate details

    res.status(200).json({ success: true, enrollments });
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get a specific enrollment by ID
exports.getEnrollmentById = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    if (!enrollmentId || enrollmentId.length !== 24) {
      return res.status(400).json({ message: "Invalid enrollment ID format" });
    }

    const enrollment = await Enrollment.findById(enrollmentId);

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    res.status(200).json(enrollment);
  } catch (error) {
    console.error("Error fetching enrollment:", error);
    res.status(500).json({ error: "Server error" });
  }
};


// Update enrollment details
exports.updateEnrollment = async (req, res) => {
  try {
    const { adminId, courseId, modules } = req.body; // Extract adminId, courseId, and modules

    // Check if adminId is provided
    if (!adminId) {
      return res.status(403).json({ message: "Access denied: Admin ID required" });
    }

    // Verify if the admin exists and is active
    const admin = await Admin.findById(adminId);
    if (!admin || !admin.isActive) {
      return res.status(403).json({ message: "Access denied: Invalid admin ID" });
    }

    // Ensure modules array is provided and valid
    if (!Array.isArray(modules) || modules.length === 0) {
      return res.status(400).json({ message: "Modules array is required" });
    }

    // Validate courseId is provided
    if (!courseId) {
      return res.status(400).json({ message: "Course ID is required" });
    }

    // Check if the course exists and is valid
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Find the enrollment by ID
    const enrollment = await Enrollment.findById(req.params.enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    // Ensure the courseId matches the course in the enrollment (for security)
    if (enrollment.course.toString() !== courseId) {
      return res.status(400).json({ message: "Course ID does not match the enrollment" });
    }

    // Update only the modules field
    enrollment.modules = modules;
    await enrollment.save();

    res.status(200).json({ message: "Modules updated successfully", enrollment });

  } catch (error) {
    console.error("Error updating enrollment:", error);
    res.status(500).json({ error: "Server error" });
  }
};


// Delete enrollment (only if student is the owner)
exports.deleteEnrollment = async (req, res) => {
  try {
    const { studentId } = req.body; // Student requesting deletion
    const { enrollmentId } = req.params;

    // Find the enrollment
    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    // Ensure the student is the owner of the enrollment
    if (enrollment.student.toString() !== studentId) {
      return res.status(403).json({ message: "Unauthorized: You are not the owner of this enrollment" });
    }

    // Mark the enrollment as inactive instead of deleting
    enrollment.isActive = false;
    await enrollment.save();

    res.status(200).json({ message: "Enrollment marked as inactive" });
  } catch (error) {
    console.error("Error deleting enrollment:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get enrolled students for a course (only if the teacher owns the course)
exports.getEnrolledStudents = async (req, res) => {
  try {
    const { courseId, teacherId } = req.params;

    // Validate courseId
    if (!courseId || courseId.length !== 24) {
      return res.status(400).json({ message: "Invalid courseId" });
    }

    // Validate teacherId
    if (!teacherId || teacherId.length !== 24) {
      return res.status(400).json({ message: "Invalid teacherId" });
    }

    // Check if the course belongs to the teacher
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    if (course.teacherId.toString() !== teacherId) {
      return res.status(403).json({ message: "Unauthorized: You do not own this course" });
    }

    // Find all enrollments for the given courseId and return only student IDs
    const enrollments = await Enrollment.find({ course: courseId }).select("student");

    if (!enrollments.length) {
      return res.status(404).json({ message: "No students enrolled in this course" });
    }

    // Extract student IDs from enrollments
    const studentIds = enrollments.map((enrollment) => enrollment.student);

    res.status(200).json({ success: true, students: studentIds });
  } catch (error) {
    console.error("Error fetching enrolled students:", error);
    res.status(500).json({ message: "Server error" });
  }
};
