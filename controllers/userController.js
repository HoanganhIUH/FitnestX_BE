// controllers/userController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Lấy thông tin profile của user
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.sub; // Lấy user ID từ token đã được xác thực
    
    const user = await User.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'age', 'gender', 'height', 'weight', 'goal', 'createdAt', 'status']
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin người dùng' });
    }
    
    // Parse goal nếu là JSON string
    let parsedGoal = user.goal;
    try {
      if (user.goal) {
        parsedGoal = JSON.parse(user.goal);
      }
    } catch (e) {
      console.log('Goal không phải là JSON string');
    }
    
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      age: user.age,
      gender: user.gender,
      height: user.height,
      weight: user.weight,
      goal: parsedGoal,
      createdAt: user.createdAt,
      status: user.status
    });
  } catch (error) {
    console.error('getUserProfile error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};

// Cập nhật thông tin profile của user
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.sub; // Lấy user ID từ token đã được xác thực
    const { name, age, gender, height, weight, goals } = req.body;
    
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin người dùng' });
    }
    
    // Chuẩn bị dữ liệu cập nhật
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (age !== undefined) updateData.age = Number(age);
    if (gender !== undefined) updateData.gender = gender;
    if (height !== undefined) updateData.height = Number(height);
    if (weight !== undefined) updateData.weight = Number(weight);
    if (goals !== undefined) updateData.goal = Array.isArray(goals) ? JSON.stringify(goals) : goals;
    
    // Cập nhật thông tin
    await user.update(updateData);
    
    return res.json({ 
      message: 'Cập nhật thông tin thành công',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        height: user.height,
        weight: user.weight,
        goal: user.goal,
        status: user.status
      }
    });
  } catch (error) {
    console.error('updateUserProfile error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};

// Cập nhật thông tin profile sau khi đăng ký và xác thực OTP
exports.completeUserProfile = async (req, res) => {
  try {
    const { userId, name, age, gender, height, weight, goals } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
    }
    
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin người dùng' });
    }
    
    // Kiểm tra xem người dùng đã xác thực OTP chưa
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Tài khoản chưa được xác thực OTP' });
    }
    
    // Chuẩn bị dữ liệu cập nhật
    const updateData = {};
    
    if (name !== undefined) updateData.name = name;
    if (age !== undefined) updateData.age = Number(age);
    if (gender !== undefined) updateData.gender = gender;
    if (height !== undefined) updateData.height = Number(height);
    if (weight !== undefined) updateData.weight = Number(weight);
    if (goals !== undefined) updateData.goal = Array.isArray(goals) ? JSON.stringify(goals) : goals;
    
    // Cập nhật thông tin
    await user.update(updateData);
    
    // Tạo token mới cho người dùng
    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    return res.json({ 
      message: 'Hoàn tất thông tin hồ sơ thành công',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        height: user.height,
        weight: user.weight,
        goal: user.goal,
        status: user.status
      }
    });
  } catch (error) {
    console.error('completeUserProfile error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};


