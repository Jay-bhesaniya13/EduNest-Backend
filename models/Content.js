const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema(
  {
    // teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
        type: {
      type: String,
      enum: ['text', 'image', 'video', 'link'],
      required: true,
    },
    header: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      validate: {
        validator: function (value) {
          return this.type === 'text' ? !!value : true;
        },
        message: 'Text is required when content type is text.',
      },
    },

    mediaUrl: {
      type: String,
      validate: {
        validator: function (value) {
          return ['image', 'video'].includes(this.type) ? !!value : true;
        },
        message: 'Media URL is required for image and video content.',
      },
    },
    link: {
      type: String,
      validate: {
        validator: function (value) {
          return this.type === 'link' ? !!value : true;
        },
        message: 'Link is required when content type is link.',
      },
    },
    durationHours: {
      type: Number,
      validate: {
        validator: function (value) {
          return this.type === 'video' ? value !== undefined : true;
        },
        message: 'Duration is required for video content.',
      },
    },
    durationMinutes: {
      type: Number,
      validate: {
        validator: function (value) {
          return this.type === 'video' ? value !== undefined : true;
        },
        message: 'Duration is required for video content.',
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Content', contentSchema);
