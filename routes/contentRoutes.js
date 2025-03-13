const express = require('express');
const router = express.Router();
const { handleFileUpload ,getContent,getAllContent,deleteContent} = require('../controllers/contentController'); // Import the controller
const multer = require('multer');
const {authTeacher}=require("../controllers/authController")

// Multer configuration to handle file upload
const upload = multer({ dest: 'uploads/' }); // Temp folder for file storage

// Route to upload content (image/video/text)
router.post('/create', upload.single('mediaFile'), handleFileUpload); // Handle file upload for content


 router.get("/get/:contentId", getContent); // Get Content by ID
router.get("/all",getAllContent); // Get All Content
router.delete("/delete/:contentId", deleteContent); // Delete Content by ID



module.exports = router;
