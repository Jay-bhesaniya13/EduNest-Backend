const  Module  = require("../models/Module");

// Create a new module
exports.createModule = async (req, res) => {
  try {
    const { 
      title, 
      content, 
      contentType, 
      mediaUrl, 
      durationMinutes, 
      durationHours, 
      price, 
      prerequisites, 
      teacherId,
    } = req.body;

    // Validate mediaUrl requirement based on contentType
    if (contentType !== "text+image" && contentType !== "text+video") {
      return res.status(400).json({ message: "Invalid contentType. Allowed values: text+image, text+video" });
    }

    if ((contentType !== "text+image" && contentType !== "text+video") && mediaUrl) {
      return res.status(400).json({ message: "mediaUrl should only be provided for text+image or text+video contentType." });
    }

    // Create new module
    const newModule = new Module({
      title,
      content,
      contentType,
      mediaUrl: contentType !== "text" ? mediaUrl : null, // Set mediaUrl only if required
      durationMinutes,
      durationHours,
      price,
      prerequisites,
      teacherId
    });

    await newModule.save();
    res.status(201).json({ message: "Module created successfully", module: newModule });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Get all modules
exports.getAllModules = async (req, res) => {
  try {
    const modules = await Module.find();
    res.status(200).json(modules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a specific module by ID
exports.getModuleById = async (req, res) => {
  try {
    const module = await Module.findById(req.params.moduleId);
    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }
    res.status(200).json(module);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update module details
exports.updateModule = async (req, res) => {
  try {
    const updatedModule = await Module.findByIdAndUpdate(req.params.moduleId, req.body, {
      new: true,
    });
    if (!updatedModule) {
      return res.status(404).json({ message: "Module not found" });
    }
    res.status(200).json({ message: "Module updated successfully", module: updatedModule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

 // Delete a module
exports.deleteModule = async (req, res) => {
    try {
      const module = await Module.findById(req.params.moduleId);
      const title=module.title;
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      await Module.deleteOne({ _id: req.params.moduleId }); // Correct deletion method
      res.status(200).json({ message: `Module deleted successfully` });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  


// Teacher Module
exports.teacherModule = async (req, res) => {
  const teacherId = req.params.teacherId;
  try {
    const modules = await Module.find({ teacherId: teacherId })
      .sort({ createdAt: -1 });  // Sorting by creation time, descending (newest first)
    res.status(200).json(modules); // Return all modules found for the teacher
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


 
  