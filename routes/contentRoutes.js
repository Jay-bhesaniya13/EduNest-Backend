const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  handleFileUpload,
  getMedia,
  getContent,
//   getAllContent,
  deleteContent,
} = require("../controllers/contentController");

// Multer configuration to handle file upload
const upload = multer({ dest: "uploads/" });

// Route to upload content (image/video/text)
router.post("/create", upload.single("mediaFile"), handleFileUpload);

// Route to retrieve media from Firestore (Image or Video)
router.get("/media/:type/:id", getMedia);

// Get Content by ID
router.get("/:contentId", getContent);

// Get All Content
// router.get("/all", getAllContent);

// Delete Content by ID
router.delete("/delete/:contentId", deleteContent);

module.exports = router;
