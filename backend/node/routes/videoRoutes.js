const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadVideo, getVideos, streamVideo, getVideoById, deleteVideo,  handleLike, handleDislike} = require('../controllers/videoController');

const router = express.Router();

// Ensure videos directory exists
const videosDir = path.join(process.cwd(), 'videos');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, videosDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'video-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: function(req, file, cb) {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  }
});

router.post('/upload', upload.single('video'), uploadVideo);
router.get('/', getVideos);
router.get('/stream/:filename', streamVideo);
router.get('/:id', getVideoById);  // Add this line
router.delete('/:id', deleteVideo);
router.put('/:id/like', handleLike);
router.put('/:id/dislike', handleDislike);

module.exports = router;