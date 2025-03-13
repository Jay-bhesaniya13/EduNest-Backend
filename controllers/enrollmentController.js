const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const Module = require("../models/Module");
const Teacher = require("../models/Teacher");
const Student = require("../models/Student");
const BalanceHistory = require("../models/BalanceHistory");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();
const { COURSE_DISCOUNT_PERCENTAGE } = process.env.COURSE_DISCOUNT_PERCENTAGE;


// Work flow for course Purchase

// ✅ Validates input parameters
// ✅ Checks if the course and student exist and are active
// ✅ Verifies if the student is already enrolled
// ✅ Deducts sell_price from student’s reward points
// ✅ Enrolls the student in the course and all its modules
// ✅ Updates sales tracking for course and modules
// ✅ Increments teacher’s balance and logs balance history
// ✅ Uses transactions to rollback in case of failure

// Enroll student in all modules of a course with discounted price
exports.coursePurchaseEnrollment = async (req, res) => {
  const session = await mongoose.startSession(); // 🔹 Start a transaction session

  try {
    session.startTransaction();
    const { courseId } = req.body;
    const studentId = req.studentId;

    console.log("Student ID:", studentId);
    console.log("Course ID:", courseId);

    if (!studentId || !courseId) {
      return res.status(400).json({ message: "Student ID and Course ID are required" });
    }

    // ✅ Fetch Student
    const student = await Student.findById(studentId).session(session);
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (!student.isActive) return res.status(403).json({ message: "Student is deactivated and cannot enroll" });

    // ✅ Fetch Course with Modules
    const course = await Course.findById(courseId).populate("modules").session(session);
    if (!course) return res.status(404).json({ message: "Course not found" });

    const teacherId = course.teacherId;
    const modules = course.modules.map((module) => module._id);
    const coursePrice = course.price; // ✅ Base price for teacher
    const courseSellPrice = course.sell_price; // ✅ Price deducted from student

    if (modules.length === 0) {
      return res.status(400).json({ message: "No modules found in this course" });
    }

    // ✅ Check if student is already enrolled
    const existingEnrollment = await Enrollment.findOne({ studentId, courseId }).session(session);
    if (existingEnrollment) {
      return res.status(400).json({ message: "Student is already enrolled in this course" });
    }

    // ✅ Check if student has enough reward points
    if (student.rewardPoints < courseSellPrice) {
      return res.status(400).json({ message: "Not enough reward points to purchase this course" });
    }

    // ✅ Deduct Reward Points from Student
    student.rewardPoints -= courseSellPrice;
    await student.save({ session });

    // ✅ Create Enrollment
    const newEnrollment = new Enrollment({
      studentId,
      courseId,
      moduleIds: modules,
    });
    await newEnrollment.save({ session });
    console.log("✅ enroll completed of course");

    // ✅ Update Student's Enrollment
    await Student.enrollCourse(studentId, courseId, modules, session);

    console.log("✅ enroll completed in student object");

    // ✅ Update Course Sales Stats (Including Sell Price)
    await Course.findByIdAndUpdate(courseId, {
      $inc: {
        totalSell: 1,
        lastMonthSell: 1,
        last6MonthSell: 1,
        lastYearSell: 1,
        totalSellPrice: courseSellPrice, // ✅ Track total sell price
        lastMonthSellPrice: courseSellPrice,
        last6MonthSellPrice: courseSellPrice,
        lastYearSellPrice: courseSellPrice,
      },
    }, { session });



    // ✅ Update Module Sales Stats (Including Sell Price)
    for (let mod of course.modules) {
      await Module.findByIdAndUpdate(mod._id, {
        $inc: {
          totalSales: 1,
          monthlySales: 1,
          sixMonthSales: 1,
          yearlySales: 1,
          totalSellPrice: mod.sell_price, // ✅ Track module's sell price
          lastMonthSellPrice: mod.sell_price,
          last6MonthSellPrice: mod.sell_price,
          lastYearSellPrice: mod.sell_price,
        }
      }, { session });
    }

    // ✅ Update Teacher's Balance
    const teacher = await Teacher.findById(teacherId).session(session);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    teacher.balance += coursePrice; // ✅ Add Base Price to Teacher's Balance
    await teacher.save({ session });

    // ✅ Update Balance History
    let balanceHistory = await BalanceHistory.findOne({ teacherId }).session(session);
    if (!balanceHistory) {
      balanceHistory = new BalanceHistory({ teacherId, historyIncome: [] });
    }

    balanceHistory.historyIncome.push({
      income: coursePrice,
      reason: `Course ${course.title} purchased by ${student.name}`,
      date: new Date(),
    });

    await balanceHistory.save({ session });

    // ✅ Commit Transaction (Final Confirmation)
    await session.commitTransaction();
    session.endSession();

    // ✅ Response
    res.status(201).json({
      message: "Course purchased successfully",
      enrollment: newEnrollment,
      studentRewardPoints: student.rewardPoints,
      teacherBalance: teacher.balance,
    });

  } catch (error) {
    await session.abortTransaction(); // 🔴 Rollback all changes if any error occurs
    session.endSession();

    console.error("❌ Error in course purchase enrollment:", error);
    res.status(500).json({ error: "Server error, transaction failed" });
  }
};


// Work flow for Module purchase of Purchase

// 1. Validate input: Ensure studentId, courseId, and moduleId are provided.
// 2. Fetch Student, Course, and Module: Ensure all exist and are active.
// 3. Check if the module belongs to the course.
// 4. Check student’s reward points: Ensure they have enough to buy the module.
// 5. Deduct sell_price from student's reward points.
// 6. Enroll the student in the module:
//     * If the student is not enrolled in the course, create a new enrollment.
//     * If the student is already enrolled, add the module (if not already enrolled).
// 7. Update module sales stats (totalSellPrice, etc.).
// 8. Update teacher’s balance and balance history.
// 9. Commit transaction.
// 10.  If any error occurs, rollback everything.

// Enroll student in a specific module
exports.createEnrollmentModule = async (req, res) => {
  const session = await mongoose.startSession(); // 🔹 Start a transaction session
  session.startTransaction();

  try {
    const { courseId, moduleId } = req.body;
    const studentId = req.studentId;

    console.log("Student ID:", studentId);
    console.log("Course ID:", courseId);
    console.log("Module Id:" + moduleId);

    if (!studentId || !courseId || !moduleId) {
      return res.status(400).json({ message: "studentId, courseId & moduleId are required" });
    }

    const student = await Student.findById(studentId).session(session);
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (!student.isActive) return res.status(403).json({ message: "Student is deactivated and cannot enroll" });

    let course = await Course.findById(courseId).populate("modules").session(session);
    if (!course) return res.status(404).json({ message: "Course not found" });

    let module = await Module.findById(moduleId).session(session);
    if (!module) return res.status(404).json({ message: "Module not found" });

    // ✅ Ensure the module belongs to the provided course
    const moduleExists = course.modules.some(module => module._id.toString() === moduleId);

    if (!moduleExists) {
      return res.status(400).json({ message: "Module does not belong to the provided course" });
    }


    const teacherId = course.teacherId;
    const moduleSellPrice = module.sell_price;
    const modulePrice = module.price; // Base price for teacher earnings

    // ✅ Check if student has enough reward points
    if (student.rewardPoints < moduleSellPrice) {
      return res.status(400).json({ message: "Not enough reward points to enroll in this module" });
    }

    // ✅ Deduct `sell_price` from student's reward points
    student.rewardPoints -= moduleSellPrice;

    // ✅ Update student's enrolled courses/modules list
     await Student.enrollModule(studentId, courseId, module, session);

    await student.save({ session }); // ✅ Ensure session is used

    // 🔹 Check if student is already enrolled in the course
    let enrollment = await Enrollment.findOne({ student: studentId, course: courseId }).session(session);


     if (!enrollment) {
       
      let ModuleId;
      if (!Array.isArray(moduleId)) {
         ModuleId = [moduleId]; // Convert to array if it's not already one
      }
       
      enrollment = new Enrollment({
         studentId,
         courseId,
         moduleIds: ModuleId // ✅ Ensure it's an array
      });
      await enrollment.save({ session });
    } else {
      // ✅ If already enrolled, check if the module is already added
      if (!enrollment.modules.includes(moduleId)) {
        enrollment.modules.push(moduleId);
         // ✅ Update module sales tracking stats
        await Module.findByIdAndUpdate(moduleId, {
          $inc: {
            totalSales: 1,
            monthlySales: 1,
            sixMonthSales: 1,
            yearlySales: 1,
            totalSellPrice: moduleSellPrice,
            lastMonthSellPrice: moduleSellPrice,
            last6MonthSellPrice: moduleSellPrice,
            lastYearSellPrice: moduleSellPrice,
          }
        }, { session });
        await enrollment.save({ session });
      } else {
        return res.status(400).json({ message: "Module already enrolled" });
      }
    }

    console.log("✅ enroll completed of course-module");

    // ✅ Update Teacher's Balance
    const teacher = await Teacher.findById(teacherId).session(session);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { $addToSet: { enrolledStudents: studentId } }, // Ensures no duplicates
      { new: true }
    ).session(session) ;
    
    if (!updatedTeacher) {
      await session.abortTransaction();
      return res.status(500).json({ message: "Error updating teacher's enrolled students" });
    }

    teacher.balance += modulePrice;
    await teacher.save({ session });

    // ✅ Update Teacher’s Balance History
    let balanceHistory = await BalanceHistory.findOne({ teacherId }).session(session);
    if (!balanceHistory) {
      balanceHistory = new BalanceHistory({ teacherId, historyIncome: [], historyExpense: [] });
    }

    balanceHistory.historyIncome.push({
      income: modulePrice,
      reason: `Module '${module.title}' from '${course.title}' enrolled by ${student.name}`,
      date: new Date(),
    });

    await balanceHistory.save({ session });

    // ✅ Commit Transaction (Final Confirmation)
    await session.commitTransaction();
    session.endSession();

    // ✅ Response
    res.status(200).json({
      message: "Module enrolled successfully, reward points deducted",
      enrollment,
      studentRewardPoints: student.rewardPoints,
      teacherBalance: teacher.balance,
    });

  } catch (error) {
    await session.abortTransaction(); // 🔴 Rollback all changes if any error occurs
    session.endSession();

    console.error("❌ Error in module enrollment:", error);
    res.status(500).json({ error: "Server error, enrollment failed" });
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
