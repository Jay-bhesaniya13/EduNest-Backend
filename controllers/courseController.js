const Course = require("../models/Course");
const Module = require("../models/Module");
const Teacher = require("../models/Teacher");

/**
 * @desc Create a new course
 * @route POST /courses/create
 * @access Public (Valid teacherId required)
 */
exports.createCourse = async (req, res) => {
  try {
    const { teacherId, title, description, modules, thumbnail, level } = req.body;

    // Check if teacher exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    // Validate if all modules belong to the same teacher
    const moduleDocs = await Module.find({ _id: { $in: modules } });
    if (moduleDocs.some(module => module.teacherId.toString() !== teacherId)) {
      return res.status(403).json({ message: "All modules must belong to the same teacher" });
    }

    // Calculate total price based on modules
    const totalModulePrice = moduleDocs.reduce((sum, module) => sum + module.price, 0);

    const newCourse = new Course({
      title,
      description,
      modules,
      price: totalModulePrice,
      teacherId,
      thumbnail,
      level
    });

    await newCourse.save();
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
 * @route GET /courses/:courseId/:teacherId
 * @access Public (Valid teacherId required)
 */
exports.getCourseById = async (req, res) => {
  try {
    const { courseId, teacherId } = req.params;

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
 * @route GET /courses/teacher/:teacherId
 * @access Public (Valid teacherId required)
 */
exports.getAllCoursesForTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

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
    const { teacherId, title, description, modules, thumbnail, level } = req.body;
    const { courseId } = req.params;

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

    // Update course details
    course.title = title || course.title;
    course.description = description || course.description;
    course.modules = modules || course.modules;
    course.thumbnail = thumbnail || course.thumbnail;
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
    const { courseId, teacherId } = req.params;

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
    const { courseId, teacherId, moduleId } = req.body;
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
    const { courseId, teacherId, moduleId } = req.body;
    const course = await Course.findById(courseId);

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
