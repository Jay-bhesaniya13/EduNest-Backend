const express = require("express");
const { 
  createModule, 
  getAllModules, 
  getModuleById, 
  updateModule, 
  deleteModule ,
  teacherModule
} = require("../controllers/moduleController");
const {authenticateTeacher, authenticateStudent}=require("../controllers/authController")

const router = express.Router();

// Create a new module
router.post("/create",authenticateTeacher, createModule);

// Get all modules
router.get("/",authenticateTeacher, getAllModules);

// Get a specific module by ID
router.get("/:moduleId",  getModuleById);

// Update a module by ID
router.put("/:moduleId",authenticateTeacher, updateModule);

// Delete a module by ID
router.delete("/:moduleId",authenticateTeacher, deleteModule);

// teacher specific all modules
router.get("/teacherModule",authenticateTeacher, teacherModule);

module.exports = router;
