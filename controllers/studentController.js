const Student = require("../models/Student");
const Reward = require("../models/Reward");
const config = require("../models/config")

// create new student with New reward object
exports.createStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      contactNumber,
      profilepicURL,
      about,
      skills,
      city,
    } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, Email, and Password are required." });
    }

    // Check if the student already exists
    const existStudent = await Student.findOne({ email });
    if (existStudent) {
      if (!existStudent.isActive) {
        existStudent.isActive = true;
        await existStudent.save();
        return res.status(201).json({
          message: "Student activated successfully",
          student: existStudent
        });
      }
      return res.status(400).json({ message: "Student already exists and is active." });
    }

    // Create new student
    const newStudent = new Student({
      name,
      email,
      password,
      contactNumber,
      profilepicURL,
      about,
      skills,
      city,
      join_date: new Date(), // Default to current date
      rewardPoint: config.REWARD_POINT_ON_ACCOUNT_CREATION
    });

    const savedStudent = await newStudent.save();

    // Create reward history
    try {
      const newReward = new Reward({
        student: savedStudent._id,
        pointsChanged: [config.REWARD_POINT_ON_ACCOUNT_CREATION],
        reasons: ["Account Created"],
        timestamps: [Date.now()]
      });

      await newReward.save();

      return res.status(201).json({
        message: "Student created successfully with reward points history.",
        student: savedStudent,
        rewardHistory: newReward
      });

    } catch (rewardError) {
      await Student.findByIdAndDelete(savedStudent._id); // Rollback student creation if reward creation fails
      return res.status(500).json({ error: "Failed to create reward, student registration rolled back." + rewardError });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Controller to modify reward points (Example of adding points or applying penalty)
exports.modifyReward = async (req, res) => {
  try {
    const { studentId, pointsChange, reason } = req.body;

    if (!studentId || pointsChange === undefined || !reason) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Add reward points and create history
    const newReward = await createReward(studentId, pointsChange, reason);

    res.status(200).json({
      message: "Reward points updated successfully.",
      rewardHistory: newReward
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller to get all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find();
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller to get a single student by ID
exports.getStudentById = async (req, res) => {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller to update a student
exports.updateStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { name, email, contactNumber, password, newEmail } = req.body;

    // Find the student by ID
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // If newEmail is provided, check if it matches the student's current email
    if (newEmail) {
      if (student.email !== email) {
        return res.status(400).json({ error: "Old email does not match the provided email" });
      }
      student.email = newEmail;
    } else {
      // If no newEmail provided, ensure the email matches the student's current email
      if (student.email !== email) {
        return res.status(400).json({ error: "Email does not match the student's current email" });
      }
    }

    // Prepare the data to be updated
    const updatedData = { name, email: student.email, contactNumber, password };

    // Update the student data
    const updatedStudent = await Student.findByIdAndUpdate(studentId, updatedData, { new: true });

    res.status(200).json(updatedStudent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// Controller to delete a student (set `isActive` to false)
exports.deleteStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Find the student by ID
    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (!student.isActive) {
      return res.status(400).json({ message: "Student is already deactivated." });
    }

    // Deactivate the student
    student.isActive = false;
    await student.save();

    res.status(200).json({
      message: "Student deactivated successfully.",
      student: student
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
