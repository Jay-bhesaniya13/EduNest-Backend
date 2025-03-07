const express = require("express");
const { 
  createModule, 
  getAllModules, 
  getModuleById, 
  updateModule, 
  deleteModule ,
  teacherModule
} = require("../controllers/moduleController");

const router = express.Router();

// Create a new module
router.post("/create", createModule);

// Get all modules
router.get("/", getAllModules);

// Get a specific module by ID
router.get("/:moduleId", getModuleById);

// Update a module by ID
router.put("/:moduleId", updateModule);

// Delete a module by ID
router.delete("/:moduleId", deleteModule);

// teacher specific all modules
router.get("/teacher/:teacherId", teacherModule);

module.exports = router;
