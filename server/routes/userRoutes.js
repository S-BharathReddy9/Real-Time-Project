const router = require('express').Router();
const { getProfile, updateProfile, followUser } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:id', getProfile);
router.put('/me', protect, updateProfile);
router.post('/:id/follow', protect, followUser);

module.exports = router;
