const express = require('express');
const { getVideos, getVideo, createVideo, streamVideo } = require('../controllers/videoController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/')
  .get(getVideos)
  .post(protect, createVideo);

router.route('/:id')
  .get(getVideo);

router.route('/:id/stream')
  .get(streamVideo);

module.exports = router;
