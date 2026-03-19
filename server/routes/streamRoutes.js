const router = require('express').Router();
const { createStream, getLiveStreams, getStream, goLive, endStream } = require('../controllers/streamController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', getLiveStreams);
router.get('/:id', getStream);
router.post('/', protect, createStream);
router.patch('/:id/live', protect, goLive);
router.patch('/:id/end', protect, endStream);

module.exports = router;
