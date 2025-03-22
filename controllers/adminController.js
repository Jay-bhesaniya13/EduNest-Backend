const Admin = require("../models/Admin");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Student = require("../models/Student");
const Teacher = require("../models/Teacher");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const mongoose = require("mongoose");

// ✅ Register (Create Admin with JWT)
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, contactNumber, bio, city, profilepicURL } = req.body;

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin with this email already exists" });
    }

    // Create new admin object, only including optional fields if provided
    const newAdminData = { name, email, password, contactNumber };
    if (bio) newAdminData.bio = bio;
    if (city) newAdminData.city = city;
    if (profilepicURL) newAdminData.profilepicURL = profilepicURL;

    const newAdmin = new Admin(newAdminData);
    await newAdmin.save();

    // Generate JWT token
    const token = jwt.sign({ id: newAdmin._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ message: "Admin created successfully", token, admin: newAdmin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Login Admin (Returns JWT Token)
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    // Generate JWT
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    console.log("generated token for admin:"+token)
    res.status(200).json({ message: "Login successful", token, admin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// ✅ Get all Admins (Protected Route)
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select("-password"); // Exclude passwords
    res.status(200).json({ admins });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get Admin by ID (Fetch logged-in admin details)
exports.getAdminById = async (req, res) => {
  try {
    res.status(200).json({ admin: req.admin }); // No need to query the database again
  } catch (error) {
    console.log(" error for admin access persist is :"+error.message)
    res.status(500).json({ error: error.message });
  }
};

// ✅ Update Admin (Admin can update only their details)
exports.updateAdmin = async (req, res) => {
  try {
    const updateData = {};

    // Add only provided fields
    if (req.body.name) req.admin.name = req.body.name;
    if (req.body.email) req.admin.email = req.body.email;
    if (req.body.contactNumber) req.admin.contactNumber = req.body.contactNumber;
    if (req.body.bio) req.admin.bio = req.body.bio;
    if (req.body.city) req.admin.city = req.body.city;
    if (req.body.profilepicURL) req.admin.profilepicURL = req.body.profilepicURL;

    // If updating password, hash it before saving
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      req.admin.password = await bcrypt.hash(req.body.password, salt);
    }

    await req.admin.save(); // Save the updated admin

    res.status(200).json({ message: "Admin updated successfully", admin: req.admin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Delete Admin (Admin can delete only their account)
exports.deleteAdmin = async (req, res) => {
  try {
    await req.admin.deleteOne(); // Delete the logged-in admin

    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// to get all details of admin for dashboard
exports.dashboardDetails = async (req, res) => {
  try {
    const adminId = req.admin._id; // Get admin from request object
    const admin = await Admin.findById(adminId).select("name profilepicURL");
    
    if (!admin) return res.status(404).json({ message: "Admin not found." });

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    // Fetch Total Counts
    const totalStudents = await Student.countDocuments();
    const totalTeachers = await Teacher.countDocuments();
    const totalCourses = await Course.countDocuments();

    // Fetch Counts in Last 30 Days
    const studentsLast30Days = await Student.countDocuments({ createdAt: { $gte: last30Days } });
    const teachersLast30Days = await Teacher.countDocuments({ createdAt: { $gte: last30Days } });
    const coursesLast30Days = await Course.countDocuments({ createdAt: { $gte: last30Days } });

    // Fetch Top 3 Courses based on enrollments and ratings
    const topCourses = await Course.aggregate([
      {
        $lookup: {
          from: "enrollments", // Assuming Enrollment model stores enrollments
          localField: "_id",
          foreignField: "courseId",
          as: "enrollments"
        }
      },
      {
        $addFields: {
          totalEnrollments: { $size: "$enrollments" },
          averageRating: { $avg: "$ratings" }
        }
      },
      {
        $sort: { totalEnrollments: -1, averageRating: -1 }
      },
      {
        $limit: 3
      },
      {
        $project: {
          title: 1,
          totalEnrollments: 1,
          averageRating: { $ifNull: ["$averageRating", 0] },
          price: 1
        }
      }
    ]);

    res.status(200).json({
      admin,
      statistics: {
        totalStudents,
        totalTeachers,
        totalCourses,
        studentsLast30Days,
        teachersLast30Days,
        coursesLast30Days
      },
      topCourses
    });

  } catch (error) {
    console.error("Error fetching dashboard details:", error);
    res.status(500).json({ message: "Internal server error.", error: error.message });
  }
};
