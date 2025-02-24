require("dotenv").config();
const jwtSecret = process.env.JWT_SECRET;
const REWARD_POINT_ON_ACCOUNT_CREATION=process.REWARD_POINT_ON_ACCOUNT_CREATION

const Student = require("../models/Student");
const Reward = require("../models/Reward");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

  

// 🔹 Function to generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// 🔹 Configure Nodemailer for email OTP delivery
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS 
  }
});

// 1️⃣ **REGISTER STUDENT & SEND OTP**
exports.registerStudent = async (req, res) => {
  try {
    const { name, email, password, contactNumber, profilepicURL, about, skills, city } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, Email, and Password are required." });
    }

    const existStudent = await Student.findOne({ email });
    if (existStudent) {
      return res.status(400).json({ message: "Student already exists. Please login." });
    }

    // 🔹 Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

    const newStudent = new Student({
      name,
      email,
      password: hashedPassword, // Store hashed password
      contactNumber,
      profilepicURL,
      about,
      skills,
      city,
      otp, // Save OTP in DB
      otpExpiry,
      isVerified: false, // Default: false until OTP is verified
      rewardPoint: REWARD_POINT_ON_ACCOUNT_CREATION
    });

    await newStudent.save();

    // 🔹 Send OTP via Email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify Your EduNest Account - OTP",
      text: `Your OTP for registration is: ${otp}. This OTP will expire in 10 minutes.`
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: "OTP sent to your email. Verify to complete registration." });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// 2️⃣ **VERIFY OTP & ACTIVATE ACCOUNT**
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const student = await Student.findOne({ email });

    if (!student) {
      return res.status(400).json({ error: "Student not found." });
    }

    if (student.isVerified) {
      return res.status(400).json({ message: "Student already verified." });
    }

    if (!student.otp || student.otpExpiry < new Date()) {
      return res.status(400).json({ error: "OTP expired. Request a new one." });
    }

    if (student.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP." });
    }

    // 🔹 Mark student as verified
    student.isVerified = true;
    student.otp = null; // Remove OTP after verification
    student.otpExpiry = null;
    await student.save();

    // 🔹 Reward student
    const newReward = new Reward({
      student: student._id,
      pointsChanged: [REWARD_POINT_ON_ACCOUNT_CREATION],
      reasons: ["Account Verified"],
      timestamps: [Date.now()]
    });

    await newReward.save();

    return res.status(200).json({
      message: "Student verified successfully!",
      student
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// 3️⃣ **RESEND OTP IF EXPIRED**
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const student = await Student.findOne({ email });

    if (!student) {
      return res.status(400).json({ error: "Student not found." });
    }

    if (student.isVerified) {
      return res.status(400).json({ message: "Student already verified." });
    }

    // 🔹 Generate new OTP
    const newOTP = generateOTP();
    student.otp = newOTP;
    student.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await student.save();

    // 🔹 Send new OTP via Email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Resend OTP - EduNest",
      text: `Your new OTP is: ${newOTP}. This OTP will expire in 10 minutes.`
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ message: "New OTP sent to your email." });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// 4️⃣ **LOGIN WITH VERIFIED ACCOUNT**
exports.loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and Password are required." });
    }

    const student = await Student.findOne({ email });
    if (!student || !student.isActive) {
      return res.status(404).json({ error: "Student not found or inactive." });
    }

    if (!student.isVerified) {
      return res.status(403).json({ error: "Account not verified. Please verify OTP first." });
    }

    // 🔹 Compare the password
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // 🔹 Generate JWT Token
    const token = jwt.sign({ id: student._id }, jwtSecret , { expiresIn: "7d" });

    return res.status(200).json({
      message: "Login successful.",
      token,
      student
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

//  // Controller to modify reward points (Example of adding points or applying penalty)
// exports.modifyReward = async (req, res) => {
//   try {
//     const { studentId, pointsChange, reason } = req.body;

//     if (!studentId || pointsChange === undefined || !reason) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     // Add reward points and create history
//     const newReward = await createReward(studentId, pointsChange, reason);

//     res.status(200).json({
//       message: "Reward points updated successfully.",
//       rewardHistory: newReward
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

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
