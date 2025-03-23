// const fs = require("fs");
// const ffmpeg = require("fluent-ffmpeg");
// const multer = require("multer");
// const { admin, db, projectId } = require("../firebase");
// const Content = require("../models/Content");

// // Define file type filters for image and video
// const fileFilter = (req, file, cb) => {
//   const allowedImageTypes = ["image/jpeg", "image/png", "image/gif"];
//   const allowedVideoTypes = ["video/mp4", "video/mov", "video/avi"];

//   if (req.body.type === "image" && !allowedImageTypes.includes(file.mimetype)) {
//     return cb(new Error("Invalid image file type. Only JPG, PNG, and GIF are allowed."), false);
//   }

//   if (req.body.type === "video" && !allowedVideoTypes.includes(file.mimetype)) {
//     return cb(new Error("Invalid video file type. Only MP4, MOV, and AVI are allowed."), false);
//   }

//   cb(null, true);
// };

// // Multer storage (Temporary file storage)
// const upload = multer({ dest: "uploads/", fileFilter });

// /**
//  * Extracts video duration using fluent-ffmpeg
//  */
// const getVideoDuration = (filePath) => {
//   return new Promise((resolve, reject) => {
//     ffmpeg.ffprobe(filePath, (err, metadata) => {
//       if (err) reject(err);
//       else resolve(metadata.format.duration); // Returns duration in seconds
//     });
//   });
// };

// /**
//  * Handles file uploads (Text, Image, Video, Link)
//  */
// exports.handleFileUpload = async (req, res) => {
//   console.log("Request body:", req.body);
//   console.log("Received file:", req.file);

//   const { type, header, text, link } = req.body;
//   const mediaFile = req.file;

//   try {
//     if (!["text", "image", "video", "link"].includes(type)) {
//       return res.status(400).json({ message: "Invalid content type." });
//     }

//     let contentData = { type, header, text, link, createdAt: new Date() };

//     // Validate required fields
//     if (type === "text" && !text) {
//       return res.status(400).json({ message: "Text is required for text content." });
//     }
//     if (type === "link" && !link) {
//       return res.status(400).json({ message: "Link is required for link content." });
//     }
//     if ((type === "image" || type === "video") && !mediaFile) {
//       return res.status(400).json({ message: "Media file is required for image/video content." });
//     }

//     // Process media files (Image & Video)
//     if (type === "image" || type === "video") {
//       const filePath = mediaFile.path;
//       const fileBuffer = fs.readFileSync(filePath);
//       const base64Data = fileBuffer.toString("base64");

//       let mediaCollection = type === "image" ? "images" : "videos";

//       // Extract video duration if it's a video
//       if (type === "video") {
//         const durationInSeconds = await getVideoDuration(filePath);
//         contentData.durationHours = Math.floor(durationInSeconds / 3600);
//         contentData.durationMinutes = Math.floor((durationInSeconds % 3600) / 60);
//       }

//       // Save Base64 data to Firestore in separate collections
//       const mediaDoc = await db.collection(mediaCollection).add({
//         mediaData: base64Data,
//         mediaType: mediaFile.mimetype,
//         createdAt: admin.firestore.Timestamp.now(),
//       });

//       contentData.mediaUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${mediaCollection}/${mediaDoc.id}`;

//       // Remove temporary file
//       fs.unlink(filePath, (err) => {
//         if (err) console.error("Failed to delete temp file:", err);
//       });
//     }

//     // Save content in MongoDB
//     const newContent = new Content(contentData);
//     await newContent.save();

//     res.status(201).json({ message: "Content uploaded successfully", newContent });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Error uploading content", error: error.message });
//   }
// };

// exports.getMedia = async (req, res) => {
//   try {
//     const { type, id } = req.params;
//     if (!["image", "video"].includes(type)) {
//       return res.status(400).json({ message: "Invalid media type." });
//     }

//     const mediaDoc = await db.collection(type === "image" ? "images" : "videos").doc(id).get();

//     if (!mediaDoc.exists) {
//       return res.status(404).json({ message: "Media not found" });
//     }

//     const mediaData = mediaDoc.data();
//     const base64Media = Buffer.from(mediaData.mediaData, "base64");

//     res.setHeader("Content-Type", mediaData.mediaType);
//     res.send(base64Media);
//   } catch (error) {
//     console.error("Error fetching media:", error);
//     res.status(500).json({ message: "Error retrieving media" });
//   }
// };

// /**
//  * Retrieves media by ID (Image or Video)
//  */
// // exports.getMedia = async (req, res) => {
// //   try {
// //     const { type, id } = req.params;
// //     if (!["image", "video"].includes(type)) {
// //       return res.status(400).json({ message: "Invalid media type." });
// //     }

// //     const mediaDoc = await db.collection(type === "image" ? "images" : "videos").doc(id).get();

// //     if (!mediaDoc.exists) {
// //       return res.status(404).json({ message: "Media not found" });
// //     }

// //     const mediaData = mediaDoc.data();
// //     const base64Media = Buffer.from(mediaData.mediaData, "base64");

// //     res.setHeader("Content-Type", mediaData.mediaType);
// //     res.send(base64Media);
// //   } catch (error) {
// //     console.error("Error fetching media:", error);
// //     res.status(500).json({ message: "Error retrieving media" });
// //   }
// // };

// exports.getContent = async (req, res) => {
//   try {
//     const { contentId } = req.params;

//     // Find content in MongoDB
//     const contentData = await Content.findById(contentId);
//     if (!contentData) {
//       return res.status(404).json({ message: "Content not found in MongoDB." });
//     }

//     // If content is image or video, fetch media from Firestore
//     if (contentData.type === "image" || contentData.type === "video") {
//       const mediaId = contentData.mediaUrl.split("/").pop();
//       console.log("Extracted mediaId:", mediaId);

//       const mediaDoc = await db.collection(contentData.type === "image" ? "images" : "videos").doc(mediaId).get();

//       if (!mediaDoc.exists) {
//         return res.status(404).json({ message: "Media not found in Firestore." });
//       }

//       const mediaData = mediaDoc.data();
//       const base64Media = `data:${mediaData.mediaType};base64,${mediaData.mediaData}`;

//       return res.status(200).json({
//         content: { ...contentData.toObject(), mediaUrl: base64Media },
//       });
//     }

//     res.status(200).json({ content: contentData });
//   } catch (error) {
//     console.error("Error retrieving content:", error);
//     res.status(500).json({ message: "Error retrieving content", error: error.message });
//   }
// };



// /**
//  * Retrieves all content from MongoDB
//  */
// exports.getAllContent = async (req, res) => {
//   try {
//     const contents = await Content.find();
//     res.status(200).json({ contents });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Error retrieving content", error: error.message });
//   }
// };

// /**
//  * Deletes content by ID (Text, Image, Video, Link)
//  */
// exports.deleteContent = async (req, res) => {
//   const { contentId } = req.params;

//   try {
//     const contentData = await Content.findById(contentId);
//     if (!contentData) {
//       return res.status(404).json({ message: "Content not found in MongoDB." });
//     }

//     // Check if the content has a media file (Image/Video)
//     if (contentData.type === "image" || contentData.type === "video") {
//       if (contentData.mediaUrl) {
//         const mediaId = contentData.mediaUrl.split("/").pop();

//         // Check if media exists in Firestore
//         const mediaDoc = await db.collection("media").doc(mediaId).get();
//         if (mediaDoc.exists) {
//           await db.collection("media").doc(mediaId).delete();
//           console.log(`Media ${mediaId} deleted from Firestore.`);
//         } else {
//           console.log(`Media ${mediaId} not found in Firestore, skipping deletion.`);
//         }
//       }
//     }

//     // Delete content from MongoDB
//     await Content.findByIdAndDelete(contentId);

//     res.status(200).json({ message: "Content deleted successfully" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Error deleting content", error: error.message });
//   }
// };
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const multer = require("multer");
const { admin, db, projectId } = require("../firebase");
const Content = require("../models/Content");

// Define allowed file types
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

// Multer temporary file storage
const upload = multer({ dest: "uploads/", fileFilter });

/**
 * Extracts video duration using fluent-ffmpeg
 */
const getVideoDuration = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata.format.duration); // Returns duration in seconds
    });
  });
};

/**
 * Handles file uploads (Text, Image, Video, Link)
 */
exports.handleFileUpload = async (req, res) => {
  console.log("🔹 Request body:", req.body);
  console.log("📂 Received file:", req.file);

  const { type, header, text, link } = req.body;
  const mediaFile = req.file;

  try {
    if (!["text", "image", "video", "link"].includes(type)) {
      return res.status(400).json({ message: "Invalid content type." });
    }

    let contentData = { type, header, text, link, createdAt: new Date() };

    // Validate required fields
    if (type === "text" && !text) {
      return res.status(400).json({ message: "Text is required for text content." });
    }
    if (type === "link" && !link) {
      return res.status(400).json({ message: "Link is required for link content." });
    }
    if ((type === "image" || type === "video") && !mediaFile) {
      return res.status(400).json({ message: "Media file is required for image/video content." });
    }

    // Process media files (Image & Video)
    if (type === "image" || type === "video") {
      const filePath = mediaFile.path;
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString("base64");

      let mediaCollection = type === "image" ? "images" : "videos";

      // Extract video duration if it's a video
      if (type === "video") {
        const durationInSeconds = await getVideoDuration(filePath);
        contentData.durationHours = Math.floor(durationInSeconds / 3600);
        contentData.durationMinutes = Math.floor((durationInSeconds % 3600) / 60);
      }

      // Save Base64 data to Firestore in separate collections
      const mediaDoc = await db.collection(mediaCollection).add({
        mediaData: base64Data,
        mediaType: mediaFile.mimetype,
        createdAt: admin.firestore.Timestamp.now(),
      });

      console.log(`✅ Media saved in Firestore. Collection: ${mediaCollection}, ID: ${mediaDoc.id}`);

      contentData.mediaUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${mediaCollection}/${mediaDoc.id}`;

      // Remove temporary file
      fs.unlink(filePath, (err) => {
        if (err) console.error("❌ Failed to delete temp file:", err);
      });
    }

    // Save content in MongoDB
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
