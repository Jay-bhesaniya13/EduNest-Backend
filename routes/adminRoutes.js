const express = require("express");
const {
  createAdmin,
  loginAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin
} = require("../controllers/adminController");
const { authenticateAdmin } = require("../controllers/authController");

const router = express.Router();

router.post("/register", createAdmin); // Public Route
router.post("/login", loginAdmin); // Public Route
router.get("/", authenticateAdmin, getAllAdmins); // Protected Route
router.get("/me", authenticateAdmin, getAdminById); // Protected: Fetch logged-in admin
router.put("/update", authenticateAdmin, updateAdmin); // Protected: Admin can update only their details
router.delete("/delete", authenticateAdmin, deleteAdmin); // Protected: Admin can delete only their account

module.exports = router;
