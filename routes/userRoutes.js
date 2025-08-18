// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

// GET /api/user/profile - Lấy thông tin profile của user
router.get('/profile', authenticateToken, userController.getUserProfile);

// PUT /api/user/profile - Cập nhật thông tin profile của user
router.put('/profile', authenticateToken, userController.updateUserProfile);

// POST /api/user/complete-profile - Hoàn tất thông tin profile sau đăng ký và xác thực OTP
router.post('/complete-profile', userController.completeUserProfile);

module.exports = router;
