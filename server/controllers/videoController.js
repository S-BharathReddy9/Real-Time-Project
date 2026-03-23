const Video = require('../models/Video');
const fs = require('fs');
const path = require('path');

// @desc    Get all videos
// @route   GET /api/videos
// @access  Public
exports.getVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: videos.length, videos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get single video
// @route   GET /api/videos/:id
// @access  Public
exports.getVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
        return res.status(404).json({ success: false, message: 'Video not found' });
    }
    res.status(200).json({ success: true, video });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create new video
// @route   POST /api/videos
// @access  Private
exports.createVideo = async (req, res) => {
  try {
    req.body.uploadedBy = req.user.id; // From auth middleware

    const video = await Video.create(req.body);
    res.status(201).json({ success: true, video });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Stream local video file
// @route   GET /api/videos/:id/stream
// @access  Public
exports.streamVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video || !video.videoUrl) {
      return res.status(404).send('Video not found');
    }

    const videoPath = video.videoUrl; // Assuming this might be an absolute path like C:\Home\video.mp4

    // Check if the file actually exists locally
    if (!fs.existsSync(videoPath)) {
      // If it's a web URL, we can redirect or just tell the client that it's an external link
      if (videoPath.startsWith('http')) return res.redirect(videoPath);
      return res.status(404).send('Local video file could not be found');
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };

      res.status(206).set(head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.status(200).set(head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    console.error('Video Stream Error:', error);
    res.status(500).send('Server Error');
  }
};
