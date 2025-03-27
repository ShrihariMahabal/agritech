const Video = require("../models/Video");
const fs = require("fs");
const path = require("fs");

// Upload video
const uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No video file uploaded" });
    }

    const { title, description, duration } = req.body;

    const video = await Video.create({
      title,
      description,
      filename: req.file.filename,
      filepath: req.file.path,
      duration: parseInt(duration),
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    return res.status(201).json({ 
      success: true, 
      data: video,
      url: `/videos/${video.filename}`
    });
  } catch (err) {
    console.error("Error uploading video:", err);
    return res
      .status(500)
      .json({ success: false, message: err.message || "Failed to upload video" });
  }
};

// Get all videos
const getVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort("-createdAt");
    return res.status(200).json({ success: true, data: videos });
  } catch (err) {
    console.error("Error fetching videos:", err);
    return res
      .status(500)
      .json({ success: false, message: err.message || "Failed to fetch videos" });
  }
};

// Stream video
const streamVideo = async (req, res) => {
  try {
    const video = await Video.findOne({ filename: req.params.filename });
    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    const videoPath = video.filepath;
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": video.mimeType,
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": video.mimeType,
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (err) {
    console.error("Error streaming video:", err);
    return res
      .status(500)
      .json({ success: false, message: err.message || "Failed to stream video" });
  }
};

// Delete video
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the video in database
    const video = await Video.findById(id);
    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }

    // Delete the file from storage
    fs.unlink(video.filepath, (err) => {
      if (err) {
        console.error("Error deleting video file:", err);
        // Continue with DB deletion even if file deletion fails
      }
    });

    // Delete from database
    await Video.findByIdAndDelete(id);

    return res.status(200).json({ 
      success: true, 
      message: "Video deleted successfully" 
    });

  } catch (err) {
    console.error("Error deleting video:", err);
    return res
      .status(500)
      .json({ success: false, message: err.message || "Failed to delete video" });
  }
};

// Get single video by ID
const getVideoById = async (req, res) => {
    try {
        // Find by filename instead of _id
        const video = await Video.findOne({ filename: req.params.id })
          .select('title description')
          .lean();
    
        if (!video) {
          return res.status(404).json({ 
            success: false, 
            message: "Video not found" 
          });
        }
    
        return res.status(200).json({ 
          success: true, 
          data: {
            title: video.title,
            description: video.description,
            createdAt: video.createdAt,
            likes: video.likes,
            dislikes: video.dislikes
          } 
        });
      } catch (err) {
        console.error("Error fetching video details:", err);
        return res.status(500).json({ 
          success: false, 
          message: "Failed to fetch video details" 
        });
      }
    };

// Add these functions to your videoController.js

const handleLike = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    
    video.likes += 1;
    await video.save();
    
    res.status(200).json({
      success: true,
      data: video
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const handleDislike = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    
    video.dislikes += 1;
    await video.save();
    
    res.status(200).json({
      success: true,
      data: video
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Export the new functions
module.exports = {
  uploadVideo,
  getVideos,
  getVideoById,
  streamVideo,
  deleteVideo,
  handleLike,
  handleDislike
};