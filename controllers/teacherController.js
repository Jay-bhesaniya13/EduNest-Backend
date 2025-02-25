const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Teacher = require("../models/Teacher");
const TempTeacher = require("../models/TempTeacher");
 
function otpGenerator(){
  return  Math.floor(100000 + Math.random() * 900000);
}

require("dotenv").config();
const jwtSecret = process.env.JWT_SECRET;

// **1. Register Teacher (Temporary Storage)**
exports.registerTeacher = async (req, res) => {
  try {
    const { name, email, password, contactNumber, profilepicURL, about, areas_of_expertise, city } = req.body;

    // Validate required fields
    if (!name || !email || !password || !profilepicURL) {
      return res.status(400).json({ error: "Name, Email, Password, and Profile Picture are required." });
    }

    // Check if the teacher already exists in Temp or Main DB
    const existingTeacher = await Teacher.findOne({ email });
    const existingTempTeacher = await TempTeacher.findOne({ email });

    if (existingTeacher) {
      return res.status(400).json({ error: "Teacher already registered." });
    }

    if (existingTempTeacher) {
      return res.status(400).json({ error: "OTP already sent. Please verify OTP." });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = otpGenerator();
    const otpExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // OTP expires in 2 hours

    // Save in TempTeacher collection
    const tempTeacher = new TempTeacher({
      name,
      email,
      password: hashedPassword,
      contactNumber,
      profilepicURL,
      about,
      areas_of_expertise,
      city,
      otp,
      otpExpiresAt
    });

    await tempTeacher.save();

    // TODO: Send OTP via Email/SMS
    console.log(`OTP for ${email}: ${otp}`);

    res.status(200).json({ message: "OTP sent to your email. Verify to complete registration." });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// **2. Verify OTP & Move Data to Main Teacher Collection**
exports.verifyTeacherOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required." });
    }

    // Find temp record
    const tempTeacher = await TempTeacher.findOne({ email });

    if (!tempTeacher) {
      return res.status(400).json({ error: "OTP expired or invalid. Please register again." });
    }

    // Check if OTP matches
    if (tempTeacher.otp !== otp) {
      return res.status(400).json({ error: "Incorrect OTP. Please try again." });
    }

    // Move data to Teacher collection
    const newTeacher = new Teacher({
      name: tempTeacher.name,
      email: tempTeacher.email,
      password: tempTeacher.password,
      contactNumber: tempTeacher.contactNumber,
      profilepicURL: tempTeacher.profilepicURL,
      about: tempTeacher.about,
      areas_of_expertise: tempTeacher.areas_of_expertise,
      city: tempTeacher.city,
      join_date: new Date(),
    });

    await newTeacher.save();

    // Delete from TempTeacher collection
    await TempTeacher.deleteOne({ email });

    // Generate JWT Token
    const token = jwt.sign({ id: newTeacher._id, email: newTeacher.email }, jwtSecret);

    res.status(201).json({ message: "Teacher registered successfully.", token });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// **3. Resend OTP**
exports.resendTeacherOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const existingTempTeacher = await TempTeacher.findOne({ email });

    if (!existingTempTeacher) {
      return res.status(400).json({ error: "No pending OTP request found. Please register first." });
    }

    // Generate new OTP
    const newOTP = otpGenerator.generate(6, { digits: true, alphabets: false, upperCase: false });
    existingTempTeacher.otp = newOTP;
    existingTempTeacher.otpExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // Reset expiry

    await existingTempTeacher.save();

    // TODO: Send OTP via Email/SMS
    console.log(`New OTP for ${email}: ${newOTP}`);

    res.status(200).json({ message: "New OTP sent. Please verify." });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// **4. Login Teacher**
exports.loginTeacher = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and Password are required." });
    }

    const teacher = await Teacher.findOne({ email, isActive: true });
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found or inactive." });
    }

    const isPasswordValid = await bcrypt.compare(password, teacher.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = jwt.sign({ id: teacher._id, email: teacher.email }, jwtSecret);

    res.json({ message: "Login successful.", token });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};



// Controller to get all users
exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.status(200).json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller to get a single user by ID
exports.getTeacherById = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      return res.status(404).json({ error: "teacher not found" });
    }

    res.status(200).json(teacher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller to update a user
exports.updateTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const updatedData = req.body;

    const teacher = await Teacher.findByIdAndUpdate(teacherId, updatedData, { new: true });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    res.status(200).json(teacher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller to delete a Teacher (set `isActive` to false)
exports.deleteTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Find the Teacher by ID
    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    if (!teacher.isActive) {
      return res.status(400).json({ message: "Teacher is already deactivated." });
    }

    // Deactivate the teacher
    teacher.isActive = false;
    await teacher.save();

    res.status(200).json({
      message: "Teacher deactivated successfully.",
      teacher: teacher
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// // Get all courses for a specific teacher by teacherId
// exports.getAllCoursesForTeacher = async (req, res) => {
//   try {
//     const { teacherId } = req.params;

//     // Validate teacherId format
//     if (!mongoose.Types.ObjectId.isValid(teacherId)) {
//       return res.status(400).json({ message: "Invalid teacherId" });
//     }

//     const courses = await Course.find({ teacherId })
//       .populate("modules")
//       .sort({ createdAt: -1 });

//     if (!courses || courses.length === 0) {
//       return res.status(404).json({ message: "No courses found for this teacher" });
//     }

//     res.status(200).json({ success: true, courses });
//   }
//    catch (error) {
//     console.error("Error fetching courses:", error);
//     res.status(500).json({ message: "Server error" });
//   }

// };

