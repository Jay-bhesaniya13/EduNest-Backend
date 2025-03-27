const Rating = require("../models/Rating")
const Module = require("../models/Module")
const Course = require("../models/Course")
const Student = require("../models/Student")
const mongoose = require("mongoose")

/**
 * @desc Add or update a rating for a module
 * @route POST /ratings/rate
 * @access Private (Student only)
 */
exports.rateModule = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { moduleId, courseId, rating, comment } = req.body
    const studentId = req.studentId

    if (!moduleId || !courseId || !rating) {
      return res.status(400).json({ message: "Module ID, Course ID, and rating are required" })
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" })
    }

    // Check if the module and course exist
    const module = await Module.findById(moduleId).session(session)
    if (!module) {
      await session.abortTransaction()
      session.endSession()
      return res.status(404).json({ message: "Module not found" })
    }

    const course = await Course.findById(courseId).session(session)
    if (!course) {
      await session.abortTransaction()
      session.endSession()
      return res.status(404).json({ message: "Course not found" })
    }

    // Check if the module belongs to the course
    if (!course.modules.includes(moduleId)) {
      await session.abortTransaction()
      session.endSession()
      return res.status(400).json({ message: "Module does not belong to the specified course" })
    }

    // Check if student is enrolled in the module
    const student = await Student.findById(studentId).session(session)
    if (!student) {
      await session.abortTransaction()
      session.endSession()
      return res.status(404).json({ message: "Student not found" })
    }

    // Check if student is enrolled in this module
    const isEnrolled = student.courses_enrolled.some(
      (enrollment) =>
        enrollment.courseId.toString() === courseId.toString() &&
        enrollment.modules.some((m) => m.toString() === moduleId.toString()),
    )

    if (!isEnrolled) {
      await session.abortTransaction()
      session.endSession()
      return res.status(403).json({
        message: "You can only rate modules you are enrolled in",
      })
    }

    // Check if student has already rated this module
    const existingRating = await Rating.findOne({ studentId, moduleId }).session(session)
    let isUpdate = false

    if (existingRating) {
      // Update existing rating
      isUpdate = true
      existingRating.rating = rating
      existingRating.comment = comment || existingRating.comment
      existingRating.updatedAt = Date.now()
      await existingRating.save({ session })
    } else {
      // Create new rating
      const newRating = new Rating({
        studentId,
        moduleId,
        courseId,
        rating,
        comment,
      })
      await newRating.save({ session })
    }

    // Update module's average rating
    const moduleRatings = await Rating.find({ moduleId }).session(session)
    const totalRating = moduleRatings.reduce((sum, item) => sum + item.rating, 0)
    const avgRating = totalRating / moduleRatings.length

    module.totalRating = totalRating
    module.ratedStudents = moduleRatings.length
    module.avgRating = avgRating
    await module.save({ session })

    // Update course's average rating
    await updateCourseRating(courseId, session)

    await session.commitTransaction()
    session.endSession()

    res.status(200).json({
      message: isUpdate ? "Rating updated successfully" : "Rating added successfully",
      avgRating,
    })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    console.error("Error rating module:", error)
    res.status(500).json({ error: "Server error" })
  }
}

/**
 * @desc Get all ratings for a module
 * @route GET /ratings/module/:moduleId
 * @access Public
 */
exports.getModuleRatings = async (req, res) => {
  try {
    const { moduleId } = req.params

    const ratings = await Rating.find({ moduleId }).populate("studentId", "name profilepicURL").sort({ createdAt: -1 })

    const module = await Module.findById(moduleId).select("avgRating ratedStudents")

    res.status(200).json({
      ratings,
      avgRating: module?.avgRating || 0,
      ratedStudents: module?.ratedStudents || 0,
    })
  } catch (error) {
    console.error("Error fetching module ratings:", error)
    res.status(500).json({ error: "Server error" })
  }
}

/**
 * @desc Get all ratings given by a student
 * @route GET /ratings/student
 * @access Private (Student only)
 */
exports.getStudentRatings = async (req, res) => {
  try {
    const studentId = req.studentId

    const ratings = await Rating.find({ studentId })
      .populate("moduleId", "title")
      .populate("courseId", "title")
      .sort({ updatedAt: -1 })

    res.status(200).json(ratings)
  } catch (error) {
    console.error("Error fetching student ratings:", error)
    res.status(500).json({ error: "Server error" })
  }
}

/**
 * @desc Delete a rating
 * @route DELETE /ratings/:ratingId
 * @access Private (Student only)
 */
exports.deleteRating = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { ratingId } = req.params
    const studentId = req.studentId

    const rating = await Rating.findById(ratingId).session(session)

    if (!rating) {
      await session.abortTransaction()
      session.endSession()
      return res.status(404).json({ message: "Rating not found" })
    }

    if (rating.studentId.toString() !== studentId.toString()) {
      await session.abortTransaction()
      session.endSession()
      return res.status(403).json({ message: "Not authorized to delete this rating" })
    }

    const moduleId = rating.moduleId
    const courseId = rating.courseId

    await Rating.deleteOne({ _id: ratingId }).session(session)

    // Update module's average rating
    const moduleRatings = await Rating.find({ moduleId }).session(session)
    const module = await Module.findById(moduleId).session(session)

    if (moduleRatings.length > 0) {
      const totalRating = moduleRatings.reduce((sum, item) => sum + item.rating, 0)
      const avgRating = totalRating / moduleRatings.length

      module.totalRating = totalRating
      module.ratedStudents = moduleRatings.length
      module.avgRating = avgRating
    } else {
      module.totalRating = 0
      module.ratedStudents = 0
      module.avgRating = 0
    }

    await module.save({ session })

    // Update course's average rating
    await updateCourseRating(courseId, session)

    await session.commitTransaction()
    session.endSession()

    res.status(200).json({ message: "Rating deleted successfully" })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    console.error("Error deleting rating:", error)
    res.status(500).json({ error: "Server error" })
  }
}

/**
 * @desc Check if a student can rate a module
 * @route GET /ratings/can-rate/:moduleId/:courseId
 * @access Private (Student only)
 */
exports.canRateModule = async (req, res) => {
  try {
    const { moduleId, courseId } = req.params
    const studentId = req.studentId

    // Check if student is enrolled in the module
    const student = await Student.findById(studentId)
    if (!student) {
      return res.status(404).json({ message: "Student not found" })
    }

    // Check if student is enrolled in this module
    const isEnrolled = student.courses_enrolled.some(
      (enrollment) =>
        enrollment.courseId.toString() === courseId.toString() &&
        enrollment.modules.some((m) => m.toString() === moduleId.toString()),
    )

    if (!isEnrolled) {
      return res.status(200).json({
        canRate: false,
        message: "You must be enrolled in this module to rate it",
      })
    }

    // Check if student has already rated this module
    const existingRating = await Rating.findOne({ studentId, moduleId })

    res.status(200).json({
      canRate: true,
      hasRated: !!existingRating,
      rating: existingRating ? existingRating.rating : null,
      comment: existingRating ? existingRating.comment : null,
    })
  } catch (error) {
    console.error("Error checking if student can rate module:", error)
    res.status(500).json({ error: "Server error" })
  }
}

/**
 * Helper function to update a course's average rating
 * @param {ObjectId} courseId - The course ID
 * @param {ClientSession} session - MongoDB session
 */
async function updateCourseRating(courseId, session) {
  try {
    const course = await Course.findById(courseId).session(session)
    if (!course) return

    // Get all modules in the course
    const moduleIds = course.modules

    // Get all modules with their ratings
    const modules = await Module.find({
      _id: { $in: moduleIds },
      ratedStudents: { $gt: 0 }, // Only include modules that have ratings
    }).session(session)

    if (modules.length > 0) {
      // Calculate weighted average based on number of ratings
      let totalWeightedRating = 0
      let totalRatings = 0

      modules.forEach((module) => {
        totalWeightedRating += module.avgRating * module.ratedStudents
        totalRatings += module.ratedStudents
      })

      course.avgRating = totalRatings > 0 ? totalWeightedRating / totalRatings : 0
      course.ratedStudent = totalRatings
      course.totalRating = totalWeightedRating
    } else {
      course.avgRating = 0
      course.ratedStudent = 0
      course.totalRating = 0
    }

    await course.save({ session })
  } catch (error) {
    console.error("Error updating course rating:", error)
    throw error
  }
}

