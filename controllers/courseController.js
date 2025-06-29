const mongoose = require("mongoose");
const Course = require("../models/Course");
const Teacher = require("../models/Teacher");
const Module = require("../models/Module");
const fs = require("fs");
const { bucket } = require("../firebase");
require("dotenv").config();

const COURSE_DISCOUNT_PERCENTAGE = parseFloat(process.env.COURSE_DISCOUNT_PERCENTAGE) || 10;
const COURSE_PRICE_CHARGE_PERCENTAGE = parseFloat(process.env.COURSE_PRICE_CHARGE_PERCENTAGE) || 10;


const cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Upload Course Thumbnail
exports.uploadCourseThumbnail = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const allowedFormats = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedFormats.includes(file.mimetype)) {
      return res.status(400).json({ message: "Only JPG, JPEG, or PNG formats are allowed" });
    }

    const result = await cloudinary.uploader.upload(file.path, {
      folder: "course_thumbnails",
      resource_type: "image",
    });

    // Delete temp file
    fs.unlink(file.path, (err) => {
      if (err) console.error("Temp file deletion error:", err);
    });

    return res.status(200).json({
      message: "Thumbnail uploaded successfully",
      thumbnailUrl: result.secure_url,
    });
  } catch (error) {
    console.error("Thumbnail upload error:", error);
    return res.status(500).json({ message: "Failed to upload thumbnail" });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const { title, description, modules, level, thumbnail } = req.body;
    const teacherId = req.teacher._id;

    console.log("📘 Step 1: Validating teacher...");
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    let parsedModules = modules;
    if (typeof parsedModules === "string") {
      try {
        parsedModules = JSON.parse(parsedModules);
      } catch {
        return res.status(400).json({ message: "Modules must be an array or valid JSON string" });
      }
    }

    if (!Array.isArray(parsedModules) || parsedModules.length === 0) {
      return res.status(400).json({ message: "At least one module is required" });
    }

    if (!parsedModules.every(id => mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ message: "One or more module IDs are invalid" });
    }

    const moduleDocs = await Module.find({ _id: { $in: parsedModules } });
    if (moduleDocs.length !== parsedModules.length) {
      return res.status(400).json({ message: "One or more modules are invalid" });
    }

    if (moduleDocs.some(mod => mod.teacherId.toString() !== teacherId.toString())) {
      return res.status(403).json({ message: "All modules must belong to the current teacher" });
    }

    // ✅ Use thumbnail from body (uploaded already)
    const thumbnailUrl = thumbnail || "https://picsum.photos/1920/1080"; // fallback

    // ✅ Price Calculation
    const totalModulePrice = moduleDocs.reduce((sum, mod) => sum + mod.price, 0);
    const discount = (totalModulePrice * COURSE_DISCOUNT_PERCENTAGE) / 100;
    const price = totalModulePrice - discount;
    const sell_price = price + (price * COURSE_PRICE_CHARGE_PERCENTAGE) / 100;

    // ✅ Create and save course
    const newCourse = new Course({
      title,
      description,
      level,
      thumbnail: thumbnailUrl,
      modules: parsedModules,
      teacherId,
      price,
      sell_price,
    });

    await newCourse.save();
    await Teacher.findByIdAndUpdate(teacherId, { $inc: { course_created: 1 } });

    console.log("✅ Course saved");

    res.status(201).json({
      message: "Course created successfully",
      course: newCourse,
    });
  } catch (error) {
    console.error("❌ Error creating course:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * @desc Get all courses (Public)
 * @route GET /courses
 * @access Public
 */
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate("modules", "title price");

    // Fetch base64 thumbnails
    const coursesWithThumbnails = await Promise.all(
      courses.map(async (course) => {
        const thumbnailBase64 = await getBase64Thumbnail(course.thumbnail);
        return { ...course.toObject(), thumbnailBase64 };
      })
    );

    res.json(coursesWithThumbnails);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Server error" });
  }
};


/**
 * @desc Get a single course by ID (Only if teacherId matches)
 * @route GET /courses/:courseId
 * @access Public (Valid teacherId required)
 */
exports.getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate("modules");

    if (!course) return res.status(404).json({ message: "Course not found" });

    const thumbnailBase64 = await getBase64Thumbnail(course.thumbnail);

    res.status(200).json({ ...course.toObject(), thumbnailBase64 });
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ message: "Error retrieving course" });
  }
};



/**
 * @desc Get all courses created by a specific teacher
 * @route GET /courses/teacher
 * @access Public (Valid teacherId required)
 */
exports.getAllCoursesForTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Validate teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const courses = await Course.find({ teacherId }).populate("modules", "title price");

    // Fetch base64 thumbnails
    const coursesWithThumbnails = await Promise.all(
      courses.map(async (course) => {
        const thumbnailBase64 = await getBase64Thumbnail(course.thumbnail);
        return { ...course.toObject(), thumbnailBase64 };
      })
    );

    res.json(coursesWithThumbnails);
  } catch (error) {
    console.error("Error fetching teacher's courses:", error);
    res.status(500).json({ error: "Server error" });
  }
};


/**
 * @desc Update a course (Only if teacherId matches)
 * @route PUT /courses/:courseId
 * @access Public (Valid teacherId required)
 */
exports.updateCourse = async (req, res) => {
  try {
    const { title, description, level } = req.body;
    const { courseId } = req.params;
    const teacherId = req.teacher._id;
  console.log("updating course:::::::")
  console.log("title: "+title+" description: "+description + " level: ")
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (course.teacherId.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: "You are not authorized to update this course" });
    }

    let newThumbnailUrl = course.thumbnail;

    // ✅ Handle thumbnail update if a new file is provided
    if (req.file && req.file.fieldname === "thumbnail") {
      const allowedFormats = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedFormats.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Only JPG, JPEG or PNG format is allowed for thumbnails" });
      }

      // ✅ Upload new thumbnail to Cloudinary
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "course_thumbnails",
          resource_type: "image",
        });

        newThumbnailUrl = result.secure_url;

        // ✅ Delete temp file
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting temp file:", err);
        });
      } catch (err) {
        console.error("Cloudinary upload error:", err);
        return res.status(500).json({ message: "Failed to upload thumbnail to Cloudinary" });
      }
    }

    // ✅ Update course fields
    course.title = title || course.title;
    course.description = description || course.description;
    course.thumbnail = newThumbnailUrl;
    course.level = level || course.level;

    await course.save();

    res.json({ message: "Course updated successfully", course });
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ error: "Server error" });
  }
};


/**
 * @desc Delete a course (Only if teacherId matches)
 * @route DELETE /courses/:courseId/:teacherId
 * @access Public (Valid teacherId required)
 */
exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.teacher._id;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (course.teacherId.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: "You are not authorized to delete this course" });
    }

    await course.deleteOne();
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * @desc Add a module to a course (Only if teacherId matches)
 * @route POST /courses/addmodule
 * @access Public (Valid teacherId required)
 */
exports.addModuleToCourse = async (req, res) => {
  try {
    const { courseId, moduleId } = req.body;
    const teacherId = req.teacher._id;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    const course = await Course.findById(courseId);

    if (!course) return res.status(404).json({ message: "Course not found" });

    if (course.teacherId.toString() !== teacherId) {
      return res.status(403).json({ message: "Unauthorized to modify this course" });
    }

    course.modules.push(moduleId);
    await course.save();
    res.json({ message: "Module added successfully", course });
  } catch (error) {
    console.error("Error adding module:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * @desc Remove a module from a course (Only if teacherId matches)
 * @route PUT /courses/removemodule
 * @access Public (Valid teacherId required)
 */
exports.removeModuleFromCourse = async (req, res) => {
  try {
    const { courseId, moduleId } = req.body;
    const teacherId = req.teacher._id;
    const course = await Course.findById(courseId);

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    if (!course) return res.status(404).json({ message: "Course not found" });

    if (course.teacherId.toString() !== teacherId) {
      return res.status(403).json({ message: "Unauthorized to modify this course" });
    }

    course.modules = course.modules.filter(id => id.toString() !== moduleId);
    await course.save();
    res.json({ message: "Module removed successfully", course });
  } catch (error) {
    console.error("Error removing module:", error);
    res.status(500).json({ error: "Server error" });
  }
};
