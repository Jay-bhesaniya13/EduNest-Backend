const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ✅ Register (Create Admin)
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, contactNumber, balance } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin with this email already exists" });
    }

    const newAdmin = new Admin({ name, email, password, contactNumber, balance });
    await newAdmin.save();

    res.status(201).json({ message: "Admin created successfully" ,newAdmin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Login Admin
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    // Generate JWT
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get all Admins (Protected)
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find();
    res.status(200).json({ admins });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Get Admin by ID (Only authenticated admin)
exports.getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id); // Fetch only the logged-in admin
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    res.status(200).json({ admin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Update Admin (Only the authenticated admin can update their details)
exports.updateAdmin = async (req, res) => {
  try {
    const updatedAdmin = await Admin.findByIdAndUpdate(req.admin._id, req.body, { new: true });

    if (!updatedAdmin) return res.status(404).json({ message: "Admin not found" });

    res.status(200).json({ message: "Admin updated successfully", admin: updatedAdmin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Delete Admin (Only authenticated admin can delete their account)
exports.deleteAdmin = async (req, res) => {
  try {
    const deletedAdmin = await Admin.findByIdAndDelete(req.admin._id);

    if (!deletedAdmin) return res.status(404).json({ message: "Admin not found" });

    res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
