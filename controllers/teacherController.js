const Teacher = require("../models/Teacher");
 
exports.createTeacher = async (req, res) => {
  try {
    const { name, email, password, contactNumber } = req.body;

    // Check if Teacher already exists
    const existsTeacher = await Teacher.findOne({ email });
    if (existsTeacher) {
      if (!existsTeacher.isActive) {
        existsTeacher.isActive = true;
        await existsTeacher.save();
        return res.status(201).json({
          message: "User activated successfully",
          user: existsTeacher
        });
      }
      return res.status(400).json({ message: "Teacher already exists and is active." });
    }

    // Create new Teacher
    const newTeacher = new Teacher({
      name,
      email,
      password,
      contactNumber
    });

    const savedTeacher = await newTeacher.save();

    res.status(201).json({
      message: "Teacher created successfully",
      user: savedTeacher,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Controller to get all users
exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.status(200).json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller to get a single user by ID
exports.getTeacherById = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findById(teacherId);
    
    if (!teacher) {
      return res.status(404).json({ error: "teacher not found" });
    }

    res.status(200).json(teacher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller to update a user
exports.updateTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const updatedData = req.body;

    const teacher = await Teacher.findByIdAndUpdate(teacherId, updatedData, { new: true });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    res.status(200).json(teacher);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Controller to delete a Teacher (set `isActive` to false)
exports.deleteTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Find the Teacher by ID
    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    if (!teacher.isActive) {
      return res.status(400).json({ message: "Teacher is already deactivated." });
    }

    // Deactivate the teacher
    teacher.isActive = false;
    await teacher.save();

    res.status(200).json({
      message: "Teacher deactivated successfully.",
      teacher: teacher
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
 

// // Get all courses for a specific teacher by teacherId
// exports.getAllCoursesForTeacher = async (req, res) => {
//   try {
//     const { teacherId } = req.params;

//     // Validate teacherId format
//     if (!mongoose.Types.ObjectId.isValid(teacherId)) {
//       return res.status(400).json({ message: "Invalid teacherId" });
//     }

//     const courses = await Course.find({ teacherId })
//       .populate("modules")
//       .sort({ createdAt: -1 });

//     if (!courses || courses.length === 0) {
//       return res.status(404).json({ message: "No courses found for this teacher" });
//     }

//     res.status(200).json({ success: true, courses });
//   }
//    catch (error) {
//     console.error("Error fetching courses:", error);
//     res.status(500).json({ message: "Server error" });
//   }

// };

