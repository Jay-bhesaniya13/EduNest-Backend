const Course = require("../models/Course");
const Teacher = require("../models/Teacher");
const Module = require("../models/Module");
const fs = require("fs");
const path = require("path");
const { bucket } = require("../firebase");
const COURSE_DISCOUNT_PERCENTAGE = process.env.COURSE_DISCOUNT_PERCENTAGE || 10;
const COURSE_PRICE_CHARGE_PERCENTAGE = process.env.COURSE_PRICE_CHARGE_PERCENTAGE || 10;

/**
 * @desc Create a new course
 * @route POST /courses/create
 * @access Public (Valid teacherId required)
 */

exports.createCourse = async (req, res) => {
  try {
    const { title, description, modules, level } = req.body;
    const teacherId = req.teacher._id;

    // Check if teacher exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    // Validate if all modules belong to the same teacher
    const moduleDocs = await Module.find({ _id: { $in: modules } });
    if (moduleDocs.some(module => module.teacherId.toString() !== teacherId.toString())) {
      return res.status(403).json({ message: "All modules must belong to the same teacher" });
    }

    let thumbnailUrl = "https://example.com/default-thumbnail.jpg"; // Default thumbnail URL

    // If a thumbnail file is uploaded, process it
    if (req.file) {
      // Validate file format (only jpg, jpeg allowed)
      const allowedFormats = ["image/jpeg", "image/jpg"];
      if (!allowedFormats.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Only JPG/JPEG format is allowed for thumbnails" });
      }

      // Upload file to Firebase Storage
      const filePath = req.file.path;
      const fileName = `course_thumbnail/${Date.now()}_${req.file.originalname}`;
      const fileUpload = bucket.file(fileName);

      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(fileUpload.createWriteStream({ metadata: { contentType: req.file.mimetype } }))
          .on("error", (err) => {
            console.error("Error uploading thumbnail:", err);
            reject(res.status(500).json({ error: "Error uploading thumbnail" }));
          })
          .on("finish", async () => {
            const [url] = await fileUpload.getSignedUrl({
              action: "read",
              expires: "03-01-2030",
            });
            thumbnailUrl = url; // Set uploaded file URL
            resolve();
          });
      });

      // Delete temporary file
      fs.unlink(filePath, (err) => {
        if (err) console.error("Failed to delete temp file:", err);
      });
    }


      // 🔥 Calculate Price & Sell Price
  
      const totalModulePrice = moduleDocs.reduce((sum, module) => sum + module.price, 0);
      const discountAmount = (totalModulePrice * COURSE_DISCOUNT_PERCENTAGE) / 100;
      const price = totalModulePrice - discountAmount;
      const sell_price = price + (price * COURSE_PRICE_CHARGE_PERCENTAGE) / 100;

    // Create new course
    const newCourse = new Course({
      title,
      description,
      modules,
      teacherId,
      thumbnail: thumbnailUrl, // Use the default or uploaded URL
      level,
      price,
      sell_price
    });

    await newCourse.save();

    // Update teacher's `course_created` count
    await Teacher.findByIdAndUpdate(teacherId, { $inc: { course_created: 1 } });

    res.status(201).json({ message: "Course created successfully", course: newCourse });

  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: "Server error" });
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
    res.json(courses);
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
    const { courseId, } = req.params;
    const teacherId = req.teacher._id;

    const course = await Course.findById(courseId).populate("modules");
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (course.teacherId.toString() !== teacherId) {
      return res.status(403).json({ message: "You are not authorized to view this course" });
    }

    res.json(course);
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ error: "Server error" });
  }
};


/**
 * @desc Get all courses created by a specific teacher
 * @route GET /courses/teacher
 * @access Public (Valid teacherId required)
 */
exports.getAllCoursesForTeacher = async (req, res) => {
  try {
    const teacherId = req.teacher._id;

    // Check if teacher exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    // Find courses by teacherId
    const courses = await Course.find({ teacherId }).populate("modules", "title price");

    res.json(courses);
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

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (course.teacherId.toString() !== teacherId) {
      return res.status(403).json({ message: "You are not authorized to update this course" });
    }

    // Validate if all modules belong to the same teacher
    const moduleDocs = await Module.find({ _id: { $in: modules } });
    if (moduleDocs.some(module => module.teacherId.toString() !== teacherId)) {
      return res.status(403).json({ message: "All modules must belong to the same teacher" });
    }

    let newThumbnailUrl = course.thumbnail;

    // Handle thumbnail update if a new file is provided
    if (req.file && req.file.fieldname === "thumbnail") {
      // Validate file format (only jpg, jpeg allowed)
      const allowedFormats = ["image/jpeg", "image/jpg"];
      if (!allowedFormats.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Only JPG/JPEG format is allowed for thumbnails" });
      }

      // Extract old file name from the stored URL
      const oldFileName = course.thumbnail.split("/").pop();

      // Delete old thumbnail from Firebase Storage
      if (oldFileName) {
        const oldFile = bucket.file(`course_thumbnail/${oldFileName}`);
        await oldFile.delete().catch(err => console.error("Error deleting old thumbnail:", err));
      }

      // Upload new thumbnail to Firebase Storage
      const filePath = req.file.path;
      const newFileName = `course_thumbnail/${Date.now()}_${req.file.originalname}`;
      const fileUpload = bucket.file(newFileName);

      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(fileUpload.createWriteStream({ metadata: { contentType: req.file.mimetype } }))
          .on("error", (err) => {
            console.error("Error uploading new thumbnail:", err);
            reject(res.status(500).json({ error: "Error uploading new thumbnail" }));
          })
          .on("finish", async () => {
            // Get the new public URL
            const [url] = await fileUpload.getSignedUrl({
              action: "read",
              expires: "03-01-2030",
            });

            newThumbnailUrl = url;
            resolve();
          });
      });

      // Delete temporary file
      fs.unlink(filePath, (err) => {
        if (err) console.error("Failed to delete temp file:", err);
      });
    }

    // Update course details
    course.title = title || course.title;
    course.description = description || course.description;
    course.modules = modules || course.modules;
    course.thumbnail = newThumbnailUrl; // Updated thumbnail URL
    course.level = level || course.level;

    // Recalculate price
    const totalModulePrice = moduleDocs.reduce((sum, module) => sum + module.price, 0);
    course.price = totalModulePrice;

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

    if (course.teacherId.toString() !== teacherId) {
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
