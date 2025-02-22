const Rating = require("../models/Rating");
const Enrollment = require("../models/Enrollment");

/**
 * Add or Update Rating for a Course
 */
const addOrUpdateRating = async (req, res) => {
    try {
        const { studentId, courseId, rating, comment } = req.body;

        // Validate required fields
        if (!studentId || !courseId || rating === undefined) {
            return res.status(400).json({ message: "studentId, courseId, and rating are required." });
        }

        // Check if student is enrolled in the course
        const enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
        if (!enrollment) {
            return res.status(403).json({ message: "You can only rate courses you are enrolled in." });
        }

        // Check if the student already rated this course
        let existingRating = await Rating.findOne({ student: studentId, course: courseId });

        if (existingRating) {
            // Update existing rating
            existingRating.rating = rating;
            existingRating.comment = comment || existingRating.comment;
            existingRating.updatedAt = new Date();
            await existingRating.save();
            return res.status(200).json({ message: "Rating updated successfully.", rating: existingRating });
        }

        // Create a new rating
        const newRating = new Rating({ student: studentId, course: courseId, rating, comment });
        await newRating.save();

        res.status(201).json({ message: "Rating added successfully.", rating: newRating });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error adding rating", error: error.message });
    }
};

/**
 * Get All Ratings for a Course
 */
const getCourseRatings = async (req, res) => {
    try {
        const { courseId } = req.params;

        const ratings = await Rating.find({ course: courseId }).populate("student", "name email");

        res.status(200).json({ ratings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching ratings", error: error.message });
    }
};

/**
 * Get Specific Student's Rating for a Course
 */
const getStudentRating = async (req, res) => {
    try {
        const { courseId, studentId } = req.params;

        if (!studentId) {
            return res.status(400).json({ message: "studentId is required." });
        }

        const rating = await Rating.findOne({ student: studentId, course: courseId });

        if (!rating) {
            return res.status(404).json({ message: "No rating found for this course by the student." });
        }

        res.status(200).json({ rating });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching rating", error: error.message });
    }
};

/**
 * Delete Rating (Only by the Student who Rated)
 */
const deleteRating = async (req, res) => {
    try {
        const { studentId } = req.body;
        const { ratingId } = req.params;

        if (!studentId) {
            return res.status(400).json({ message: "studentId is required." });
        }

        const rating = await Rating.findById(ratingId);
        if (!rating) {
            return res.status(404).json({ message: "Rating not found." });
        }

        // Ensure the student deleting the rating is the one who created it
        if (rating.student.toString() !== studentId) {
            return res.status(403).json({ message: "You can only delete your own rating." });
        }

        await Rating.findByIdAndDelete(ratingId);

        res.status(200).json({ message: "Rating deleted successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error deleting rating", error: error.message });
    }
};

module.exports = { addOrUpdateRating, getCourseRatings, getStudentRating, deleteRating };
