const express = require("express");
const {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin
} = require("../controllers/adminController");

const router = express.Router();

// Create a new admin
router.post("/create", createAdmin);

// Get all admins
router.get("/", getAllAdmins);

// Get a specific admin by ID
router.get("/:adminId", getAdminById);

// Update an admin by ID
router.put("/:adminId", updateAdmin);

// Delete an admin by ID
router.delete("/:adminId", deleteAdmin);

module.exports = router;
