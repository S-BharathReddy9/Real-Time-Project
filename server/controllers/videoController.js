const Video = require('../models/Video');
const fs = require('fs');
const mongoose = require('mongoose');

const getGridFsBucket = () => {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error('MongoDB connection is not ready yet');
  }

  return new mongoose.mongo.GridFSBucket(db, { bucketName: 'videos' });
};

const inferStorageFromVideoUrl = (videoUrl = '') => {
  if (!videoUrl) return 'external';
  return /^https?:\/\//i.test(videoUrl) ? 'external' : 'local';
};

const waitForStreamFinish = (stream) =>
  new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

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
    req.body.storage = req.body.storage || inferStorageFromVideoUrl(req.body.videoUrl);

    const video = await Video.create(req.body);
    res.status(201).json({ success: true, video });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Upload a video file to MongoDB GridFS
// @route   POST /api/videos/upload
// @access  Private
exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please attach a video file' });
    }

    if (!req.file.mimetype?.startsWith('video/')) {
      return res.status(400).json({ success: false, message: 'Only video files are supported' });
    }

    const bucket = getGridFsBucket();
    const gridFsFileId = new mongoose.Types.ObjectId();
    const videoId = new mongoose.Types.ObjectId();

    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      id: gridFsFileId,
      contentType: req.file.mimetype,
      metadata: {
        uploadedBy: req.user.id,
        title: req.body.title,
      },
    });

    const uploadPromise = waitForStreamFinish(uploadStream);
    uploadStream.end(req.file.buffer);
    await uploadPromise;

    const video = await Video.create({
      _id: videoId,
      title: req.body.title,
      description: req.body.description,
      thumbnailUrl: req.body.thumbnailUrl,
      uploadedBy: req.user.id,
      storage: 'gridfs',
      gridFsFileId,
      mimeType: req.file.mimetype,
      size: req.file.size,
      videoUrl: `/api/videos/${videoId}/stream`,
      tags: req.body.tags
        ? String(req.body.tags)
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
    });

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
    if (!video || (!video.videoUrl && !video.gridFsFileId)) {
      return res.status(404).send('Video not found');
    }

    if (video.storage === 'gridfs' && video.gridFsFileId) {
      const bucket = getGridFsBucket();
      const files = await bucket.find({ _id: video.gridFsFileId }).toArray();
      const fileInfo = files[0];

      if (!fileInfo) {
        return res.status(404).send('GridFS video file not found');
      }

      const fileSize = fileInfo.length;
      const contentType = fileInfo.contentType || video.mimeType || 'video/mp4';
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;

        res.status(206).set({
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': contentType,
        });

        return bucket.openDownloadStream(video.gridFsFileId, { start, end: end + 1 }).pipe(res);
      }

      res.status(200).set({
        'Accept-Ranges': 'bytes',
        'Content-Length': fileSize,
        'Content-Type': contentType,
      });

      return bucket.openDownloadStream(video.gridFsFileId).pipe(res);
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

      const chunkSize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
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
