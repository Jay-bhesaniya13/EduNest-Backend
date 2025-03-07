const Module = require("../models/Module");
const Content = require("../models/Content");

// Create a new module
exports.createModule = async (req, res) => {
  try {
    const { title, price, prerequisites, teacherId, content } = req.body;

    // Validate required fields
    if (!title || !price || !teacherId || !Array.isArray(content) || content.length === 0) {
      return res.status(400).json({ message: "Missing required fields or content must be a non-empty array." });
    }

    // Validate that all content items exist
    const contentDocs = await Content.find({ _id: { $in: content } });
    if (contentDocs.length !== content.length) {
      return res.status(400).json({ message: "Some content IDs are invalid or missing." });
    }

    // Create new module (duration and sell_price will be auto-calculated in pre-save hook)
    const newModule = new Module({
      title,
      content,
      teacherId,
      price,
      prerequisites,
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
    const modules = await Module.find()
      .populate("content")
      .populate("teacherId");

    res.status(200).json(modules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a specific module by ID
exports.getModuleById = async (req, res) => {
  try {
    const module = await Module.findById(req.params.moduleId)
      .populate("content")
      .populate("teacherId");

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
    const { price, content, ...updates } = req.body;

    if (price !== undefined) {
      updates.price = price; // Update price (sell_price will be recalculated automatically)
    }

    if (content) {
      // Validate new content array if provided
      const contentDocs = await Content.find({ _id: { $in: content } });
      if (contentDocs.length !== content.length) {
        return res.status(400).json({ message: "Some content IDs are invalid or missing." });
      }

      updates.content = content;
    }

    // Ensure `sell_price`, `durationHours`, and `durationMinutes` are NOT manually updated
    delete updates.sell_price;
    delete updates.durationHours;
    delete updates.durationMinutes;

    const updatedModule = await Module.findByIdAndUpdate(req.params.moduleId, updates, { new: true });

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
    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }

    await Module.deleteOne({ _id: req.params.moduleId });
    res.status(200).json({ message: "Module deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get modules created by a specific teacher
exports.teacherModule = async (req, res) => {
  try {
    const teacherId = req.params.teacherId;
    const modules = await Module.find({ teacherId }).populate("content").sort({ createdAt: -1 });
    res.status(200).json(modules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
