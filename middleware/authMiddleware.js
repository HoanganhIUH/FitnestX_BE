// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// Middleware để xác thực token
exports.authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Không tìm thấy token xác thực' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
      }
      
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Lỗi xác thực' });
  }
};
