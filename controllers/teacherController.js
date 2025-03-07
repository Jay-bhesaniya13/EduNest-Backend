const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Teacher = require("../models/Teacher");
const TempTeacher = require("../models/TempTeacher");
const sendEmail = require("../utils/sendEmail");

require("dotenv").config();

const jwtSecret = process.env.JWT_SECRET;

// **1. Generate OTP**
function otpGenerator() {
  return Math.floor(100000 + Math.random() * 900000);
}

 // **2. Register Teacher (Temporary Storage)**
exports.registerTeacher = async (req, res) => {
  try {
    const { name, email, password, contactNumber, profilepicURL, about, areas_of_expertise, city } = req.body;

    if (!name || !email || !password || !profilepicURL) {
      return res.status(400).json({ error: "Name, Email, Password, and Profile Picture are required." });
    }

    const existingTeacher = await Teacher.findOne({ email });
    const existingTempTeacher = await TempTeacher.findOne({ email });

    if (existingTeacher) {
      return res.status(400).json({ error: "Teacher already registered with this email." });
    }
    if (existingTempTeacher) {
      return res.status(400).json({ error: "OTP already sent. Please check & verify OTP." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = otpGenerator();
    const otpExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const tempTeacher = new TempTeacher({ 
      name, email, password: hashedPassword, contactNumber, profilepicURL, about, areas_of_expertise, city, otp, otpExpiresAt 
    });

    await tempTeacher.save();

    // Send OTP Email
    const emailContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 400px; margin: auto; background-color: #f9f9f9;">
        <h2 style="color: #2c3e50; text-align: center;">EduNest Account Verification</h2>
        <p style="font-size: 16px; text-align: center;">Your One-Time Password (OTP) for registration is:</p>
        <div style="font-size: 22px; font-weight: bold; text-align: center; padding: 10px; background-color: #2ecc71; color: white; border-radius: 5px;">
          ${otp}
        </div>
        <p style="font-size: 14px; text-align: center; color: #e74c3c; margin-top: 10px;">This OTP will expire in 2 hours.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; text-align: center; color: #7f8c8d;">If you didn't request this, please ignore this email.</p>
      </div>
    `;

    await sendEmail(email, "Verify Your EduNest Account - OTP", emailContent);

    res.status(200).json({ message: "OTP sent to your email. Verify to complete registration." });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


 // **3. Verify OTP & Move Data to Teacher Collection**
exports.verifyTeacherOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required." });
    }

    const tempTeacher = await TempTeacher.findOne({ email });
    if (!tempTeacher || tempTeacher.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP or expired. Please register again." });
    }

    const newTeacher = new Teacher({ 
      name: tempTeacher.name, 
      email: tempTeacher.email, 
      password: tempTeacher.password, 
      contactNumber: tempTeacher.contactNumber, 
      profilepicURL: tempTeacher.profilepicURL, 
      about: tempTeacher.about, 
      areas_of_expertise: tempTeacher.areas_of_expertise, 
      city: tempTeacher.city, 
      join_date: new Date() 
    });

    await newTeacher.save();
    await TempTeacher.deleteOne({ email });

    // Send Welcome Email
    const emailContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 500px; margin: auto; background-color: #f9f9f9;">
        <h2 style="color: #2c3e50; text-align: center;">🎉 Welcome to EduNest! 🎉</h2>
        <p style="font-size: 16px; text-align: center;">Dear ${tempTeacher.name},</p>
        <p style="font-size: 14px; text-align: center;">Congratulations! Your teacher account has been successfully created on <strong>EduNest</strong>.</p>
        <div style="text-align: center; margin: 20px 0;">
          <img src="https://your-logo-url.com/logo.png" alt="EduNest Logo" style="max-width: 150px;">
        </div>
        <p style="font-size: 14px; text-align: center;">Now you can create courses, interact with students, and share your expertise with the world. 🚀</p>
        <p style="font-size: 14px; text-align: center;">Click below to log in:</p>
        <div style="text-align: center; margin-top: 10px;">
          <a href="https://edunest.com/login" style="display: inline-block; padding: 10px 20px; background-color: #2ecc71; color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">Login to EduNest</a>
        </div>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; text-align: center; color: #7f8c8d;">If you didn't create this account, please contact our support team.</p>
      </div>
    `;

    await sendEmail(email, "🎉 Welcome to EduNest! Your Account is Ready", emailContent);

    res.status(201).json({ message: "Teacher registered successfully.", newTeacher });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


 // **4. Resend OTP**
exports.resendTeacherOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const existingTempTeacher = await TempTeacher.findOne({ email });

    if (!existingTempTeacher) {
      return res.status(400).json({ error: "No pending OTP request found. Please register first." });
    }

    const newOTP = otpGenerator();
    existingTempTeacher.otp = newOTP;
    existingTempTeacher.otpExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await existingTempTeacher.save();

    // Send New OTP Email
    const emailContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 400px; margin: auto; background-color: #f9f9f9;">
        <h2 style="color: #2c3e50; text-align: center;">EduNest Account Verification</h2>
        <p style="font-size: 16px; text-align: center;">Your new OTP for verification is:</p>
        <div style="font-size: 22px; font-weight: bold; text-align: center; padding: 10px; background-color: #3498db; color: white; border-radius: 5px;">
          ${newOTP}
        </div>
        <p style="font-size: 14px; text-align: center; color: #e74c3c; margin-top: 10px;">This OTP will expire in 2 hours.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="font-size: 12px; text-align: center; color: #7f8c8d;">If you didn't request this, please ignore this email.</p>
      </div>
    `;

    await sendEmail(email, "Resend OTP - EduNest Account Verification", emailContent);

    res.status(200).json({ message: "New OTP sent. Please verify." });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// **5. Login Teacher**
exports.loginTeacher = async (req, res) => {
  try {
    const { email, password } = req.body;
    const teacher = await Teacher.findOne({ email, isActive: true });

    if (!teacher || !(await bcrypt.compare(password, teacher.password))) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = jwt.sign({ id: teacher._id, email: teacher.email }, jwtSecret , { expiresIn: "7d" });
    res.json({ message: "Login successful.", token });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// **6. Get Teacher's Own Profile**
exports.getTeacherProfile = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.teacher.id);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found." });
    }
    res.status(200).json(teacher);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// **7. Update Teacher's Own Profile**
// **7. Update Teacher's Own Profile**
exports.updateTeacherProfile = async (req, res) => {
  try {
    const teacherId=req.teacher.id;
    // Define allowed fields
    const allowedFields = ["name", "contactNumber", "profilepicURL", "about", "areas_of_expertise", "city"];
    
    // Filter request body to only include allowed fields
    const updatedData = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updatedData[key] = req.body[key];
      }
    });

    if (Object.keys(updatedData).length === 0) {
      return res.status(400).json({ error: "No valid fields provided for update." });
    }

    const teacher = await Teacher.findByIdAndUpdate(teacherId, updatedData, { new: true });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found." });
    }

    res.status(200).json(teacher);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// **8. Deactivate Teacher's Own Account**
exports.deactivateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.teacher.id);
    if (!teacher || !teacher.isActive) {
      return res.status(400).json({ error: "Teacher is already deactivated or not found." });
    }

    teacher.isActive = false;
    await teacher.save();
    res.status(200).json({ message: "Teacher deactivated successfully." });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ✅ **Get All Teachers (Admin Only)**
exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.status(200).json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};