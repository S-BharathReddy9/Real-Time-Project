const express = require('express');
const multer = require('multer');
const { getVideos, getVideo, createVideo, uploadVideo, streamVideo } = require('../controllers/videoController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.route('/')
  .get(getVideos)
  .post(protect, createVideo);

router.route('/upload')
  .post(protect, upload.single('video'), uploadVideo);

router.route('/:id')
  .get(getVideo);

router.route('/:id/stream')
  .get(streamVideo);

module.exports = router;
