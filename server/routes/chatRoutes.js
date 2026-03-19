const router = require('express').Router();
const { getMessages } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:streamId/messages', protect, getMessages);

module.exports = router;
