// controllers/userController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Hàm trợ giúp để xử lý lỗi
const handleError = (res, error, message = 'Lỗi máy chủ, vui lòng thử lại sau') => {
  console.error(`Error: ${error.message}`, error);
  return res.status(500).json({ message });
};

// Hàm trợ giúp để tạo đối tượng user response
const createUserResponse = (user) => {
  // Parse goal nếu là JSON string
  let parsedGoal = user.goal;
  try {
    if (user.goal) {
      parsedGoal = JSON.parse(user.goal);
    }
  } catch (e) {
    console.log('Goal không phải là JSON string');
  }
  
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    age: user.age,
    gender: user.gender,
    height: user.height,
    weight: user.weight,
    goal: parsedGoal,
    createdAt: user.createdAt,
    status: user.status
  };
};

// Hàm trợ giúp để chuẩn bị dữ liệu cập nhật
const prepareUpdateData = ({ name, age, gender, height, weight, goals }) => {
  const updateData = {};
  
  if (name !== undefined) updateData.name = name;
  if (age !== undefined) updateData.age = Number(age);
  if (gender !== undefined) updateData.gender = gender;
  if (height !== undefined) updateData.height = Number(height);
  if (weight !== undefined) updateData.weight = Number(weight);
  if (goals !== undefined) updateData.goal = Array.isArray(goals) ? JSON.stringify(goals) : goals;
  
  return updateData;
};

// Lấy thông tin profile của user
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.sub;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin người dùng' });
    }
    
    return res.json(createUserResponse(user));
  } catch (error) {
    return handleError(res, error);
  }
};

// Cập nhật thông tin profile của user
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin người dùng' });
    }
    
    const updateData = prepareUpdateData(req.body);
    Object.keys(updateData).forEach(key => {
      user[key] = updateData[key];
    });
    
    await user.save();
    
    return res.json({ 
      message: 'Cập nhật thông tin thành công',
      user: createUserResponse(user)
    });
  } catch (error) {
    return handleError(res, error, 'Lỗi khi cập nhật thông tin');
  }
};

// Cập nhật thông tin profile sau khi đăng ký và xác thực OTP
exports.completeUserProfile = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'Thiếu thông tin người dùng' });
    }
    
    // Kiểm tra và xử lý userId để đảm bảo là ObjectId hợp lệ
    const mongoose = require('mongoose');
    let userObjectId;
    
    try {
      // Nếu userId là một chuỗi hợp lệ, chuyển đổi thành ObjectId
      if (mongoose.Types.ObjectId.isValid(userId)) {
        userObjectId = new mongoose.Types.ObjectId(userId);
      } else {
        console.error('Invalid userId format:', userId);
        return res.status(400).json({ message: 'ID người dùng không hợp lệ' });
      }
    } catch (idError) {
      console.error('Error converting userId to ObjectId:', idError);
      return res.status(400).json({ message: 'ID người dùng không hợp lệ' });
    }
    
    // Tìm user bằng ObjectId đã xác thực
    const user = await User.findById(userObjectId);
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin người dùng' });
    }
    
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'Tài khoản chưa được xác thực OTP' });
    }
    
    const updateData = prepareUpdateData(req.body);
    Object.keys(updateData).forEach(key => {
      user[key] = updateData[key];
    });
    
    await user.save();
    
    const token = jwt.sign(
      { sub: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    return res.json({ 
      message: 'Hoàn tất thông tin hồ sơ thành công',
      token,
      user: createUserResponse(user)
    });
  } catch (error) {
    console.error('Complete profile error details:', error);
    return handleError(res, error, 'Lỗi khi hoàn tất thông tin hồ sơ');
  }
};