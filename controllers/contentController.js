const fs = require("fs");
const { admin, db, projectId } = require("../firebase");
const Content = require("../models/Content");
const ffmpeg = require("fluent-ffmpeg");
const multer = require("multer");
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const ffprobeInstaller = require("@ffprobe-installer/ffprobe");

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

require("dotenv").config();
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});


// Allowed file types
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ["image/jpeg", "image/png", "image/gif"];
  const allowedVideoTypes = ["video/mp4", "video/mov", "video/avi"];

  if (req.body.type === "image" && !allowedImageTypes.includes(file.mimetype)) {
    return cb(new Error("Invalid image file type. Allowed: JPG, PNG, GIF."), false);
  }

  if (req.body.type === "video" && !allowedVideoTypes.includes(file.mimetype)) {
    return cb(new Error("Invalid video file type. Allowed: MP4, MOV, AVI."), false);
  }

  cb(null, true);
};

// Multer config
const upload = multer({ dest: "uploads/", fileFilter });
exports.uploadMiddleware = upload.single("file"); // 👈 use in your route

// Get video duration
const getVideoDuration = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration);
    });
  });
};

// Main handler
exports.handleFileUpload = async (req, res) => {
  const { type, header, text, link } = req.body;
  const mediaFile = req.file;
console.log("Content create....")
  try {
    if (!["text", "image", "video", "link"].includes(type)) {
      return res.status(400).json({ message: "Invalid content type." });
    }

    let contentData = { type, header, text, link, createdAt: new Date() };

    // ✅ Validations for text and link
    if (type === "text" && !text) {
      return res.status(400).json({ message: "Text is required for text content." });
    }
    if (type === "link" && !link) {
      return res.status(400).json({ message: "Link is required for link content." });
    }
    if ((type === "image" || type === "video") && !mediaFile) {
      return res.status(400).json({ message: "Media file is required for image/video content." });
    }

    // ✅ Handle media (Cloudinary upload)
    if (type === "image" || type === "video") {
      const filePath = mediaFile.path;

      // Get duration for videos
      if (type === "video") {
        const durationInSeconds = await getVideoDuration(filePath);
        contentData.durationHours = Math.floor(durationInSeconds / 3600);
        contentData.durationMinutes = Math.floor((durationInSeconds % 3600) / 60);
      }

      const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
        resource_type: type === "video" ? "video" : "image",
        folder: type === "video" ? "content_videos" : "content_images",
      });

      contentData.mediaUrl = cloudinaryResult.secure_url;

      // Delete temp file
      fs.unlink(filePath, (err) => {
        if (err) console.error("Failed to delete temp file:", err);
      });
    }

    // ✅ Save content to MongoDB
    const newContent = new Content(contentData);
    await newContent.save();

    res.status(201).json({ message: "✅ Content uploaded successfully", newContent });
  } catch (error) {
    console.error("❌ Error uploading content:", error);
    res.status(500).json({ message: "Error uploading content", error: error.message });
  }
};


/**
 * Retrieves media by ID (Image or Video)
 */
exports.getMedia = async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!["image", "video"].includes(type)) {
      return res.status(400).json({ message: "Invalid media type." });
    }

    let mediaCollection = type === "image" ? "images" : "videos";
    let mediaDoc = await db.collection(mediaCollection).doc(id).get();

    if (!mediaDoc.exists) {
      console.warn(`⚠️ Media not found in ${mediaCollection}. Trying 'media' collection...`);

      // Try fetching from the 'media' collection
      mediaCollection = "media";
      mediaDoc = await db.collection(mediaCollection).doc(id).get();
    }

    if (!mediaDoc.exists) {
      console.error(`❌ Media not found in Firestore. Checked collections: images, videos, media. ID: ${id}`);
      return res.status(404).json({ message: "Media not found" });
    }

    console.log(`✅ Media found in Firestore. Collection: ${mediaCollection}, ID: ${id}`);

    const mediaData = mediaDoc.data();
    const base64Media = Buffer.from(mediaData.mediaData, "base64");

    res.setHeader("Content-Type", mediaData.mediaType);
    res.send(base64Media);
  } catch (error) {
    console.error("❌ Error fetching media:", error);
    res.status(500).json({ message: "Error retrieving media" });
  }
};


/**
 * Retrieves content from MongoDB, including media from Firestore
 */
exports.getContent = async (req, res) => {
  try {
    const { contentId } = req.params;
    const contentData = await Content.findById(contentId);

    if (!contentData) {
      return res.status(404).json({ message: "Content not found in MongoDB." });
    }

    if (contentData.type === "image" || contentData.type === "video") {
      const mediaUrlParts = contentData.mediaUrl.split("/");
      const mediaId = mediaUrlParts[mediaUrlParts.length - 1];
      let mediaCollection = contentData.type === "image" ? "images" : "videos";

      console.log(`🔍 Extracted mediaId: ${mediaId}, Expected Collection: ${mediaCollection}`);

      let mediaDoc = await db.collection(mediaCollection).doc(mediaId).get();

      if (!mediaDoc.exists) {
        console.warn(`⚠️ Media not found in ${mediaCollection}. Trying 'media' collection...`);

        // Try fetching from 'media' collection as a fallback
        mediaCollection = "media";
        mediaDoc = await db.collection(mediaCollection).doc(mediaId).get();
      }

      if (!mediaDoc.exists) {
        console.error(`❌ Media not found in Firestore. Checked collections: images, videos, media. ID: ${mediaId}`);
        return res.status(404).json({ message: "Media not found in Firestore." });
      }

      console.log(`✅ Media retrieved successfully. Collection: ${mediaCollection}, ID: ${mediaId}`);

      const mediaData = mediaDoc.data();
      const base64Media = `data:${mediaData.mediaType};base64,${mediaData.mediaData}`;

      return res.status(200).json({
        content: { ...contentData.toObject(), mediaUrl: base64Media },
      });
    }

    res.status(200).json({ content: contentData });
  } catch (error) {
    console.error("❌ Error retrieving content:", error);
    res.status(500).json({ message: "Error retrieving content", error: error.message });
  }
};


/**
 * Deletes content from MongoDB and Firestore
 */
exports.deleteContent = async (req, res) => {
  const { contentId } = req.params;

  try {
    const contentData = await Content.findById(contentId);
    if (!contentData) {
      return res.status(404).json({ message: "Content not found in MongoDB." });
    }

    if (contentData.type === "image" || contentData.type === "video") {
      const mediaId = contentData.mediaUrl.split("/").pop();
      const mediaCollection = contentData.type === "image" ? "images" : "videos";

      await db.collection(mediaCollection).doc(mediaId).delete();
      console.log(`✅ Media ${mediaId} deleted from Firestore.`);
    }

    await Content.findByIdAndDelete(contentId);
    res.status(200).json({ message: "✅ Content deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting content:", error);
    res.status(500).json({ message: "Error deleting content", error: error.message });
  }
};
