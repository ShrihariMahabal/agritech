const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  filename: {
    type: String,
    required: true,
    unique: true
  },
  filepath: {
    type: String,
    required: true
  },
  duration: {
    type: Number, // in seconds
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number, // in bytes
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for video URL
VideoSchema.virtual('url').get(function() {
  return '/videos/' + this.filename;
});

const Video = mongoose.model('Video', VideoSchema);
module.exports = Video;