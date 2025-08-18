// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const nodemailer = require('nodemailer');

const OTP_EXP_MIN = parseInt(process.env.OTP_EXP_MIN || '5', 10);
const PENDING_USER_EXP_HOURS = parseInt(process.env.PENDING_USER_EXP_HOURS || '24', 10);

// Mailer (tùy chọn: nếu thiếu cấu hình, sẽ log OTP ra console)
function buildTransporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendOtpEmail(email, code, isPasswordReset = false) {
  const transporter = buildTransporter();
  if (!transporter) {
    console.log(`[OTP] ${email}: ${code}${isPasswordReset ? ' (Password Reset)' : ''}`);
    return;
  }
  
  const subject = isPasswordReset ? 'Đặt lại mật khẩu - Mã OTP' : 'Mã xác thực OTP';
  const text = isPasswordReset
    ? `Mã OTP để đặt lại mật khẩu của bạn là ${code}. Mã này sẽ hết hạn sau ${OTP_EXP_MIN} phút.`
    : `Mã OTP của bạn là ${code}. Mã này sẽ hết hạn sau ${OTP_EXP_MIN} phút.`;
    
  await transporter.sendMail({
    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
    to: email,
    subject: subject,
    text: text,
  });
}

const genOtp = () => (Math.floor(100000 + Math.random() * 900000)).toString();

exports.register = async (req, res) => {
  try {
    const { email, name, password } = req.body;
    
    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Họ tên, email và mật khẩu là bắt buộc' });
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Email không hợp lệ' });
    }
    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }
    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Email đã tồn tại' });
    }
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    // Generate OTP for email verification
    const code = genOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_EXP_MIN * 60 * 1000);
    // Create new user with status pending
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'user',
      status: 'pending', // Trạng thái chờ xác thực OTP
      createdAt: new Date(),
    });
    
    // Delete any existing OTPs for this email
    await Otp.destroy({ where: { email } });
    
    // Create new OTP record
    await Otp.create({
      email,
      code,
      expiresAt: otpExpiresAt,
    });
    
    // Send verification email
    try {
      await sendOtpEmail(email, code);
      
      // Return success response
      return res.status(201).json({
        message: 'Đăng ký thành công. Vui lòng xác thực OTP trong email.',
        userId: user.id,
        email: user.email,
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      
      // Xóa user đã tạo nếu gửi email thất bại
      await user.destroy();
      
      return res.status(500).json({ message: 'Không thể gửi email xác thực. Vui lòng thử lại sau.' });
    }
  } catch (err) {
    console.error('Register error:', err);
    
    // Handle specific database errors
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors: err.errors });
    }
    
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'Email đã tồn tại' });
    }
    
    return res.status(500).json({ message: 'Đăng ký thất bại. Vui lòng thử lại sau.' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Thiếu email hoặc otp' });

    // Tìm OTP hợp lệ
    const record = await Otp.findOne({
      where: { email, code: otp, consumed: false },
      order: [['createdAt', 'DESC']],
    });
    
    // Kiểm tra OTP có tồn tại không
    if (!record) return res.status(400).json({ message: 'OTP không hợp lệ' });
    
    // Kiểm tra OTP có hết hạn không
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP đã hết hạn' });
    }

    // Đánh dấu OTP đã sử dụng
    await record.update({ consumed: true });
    
    // Tìm user trong bảng User với trạng thái pending
    const user = await User.findOne({ where: { email, status: 'pending' } });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy thông tin đăng ký' });

    // Cập nhật trạng thái người dùng thành active
    await user.update({ status: 'active' });

    return res.json({ 
      message: 'Xác thực OTP thành công',
      userId: user.id,
      email: user.email,
      name: user.name
    });
  } catch (err) {
    console.error('verifyOtp error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email và password là bắt buộc' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Sai email hoặc mật khẩu' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Sai email hoặc mật khẩu' });

    if (user.status === 'pending') {
      // Tài khoản chưa xác thực OTP
      return res.status(403).json({ 
        message: 'Tài khoản chưa được xác thực OTP. Vui lòng xác thực OTP trước khi đăng nhập.',
        isPending: true,
        email: user.email
      });
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// (Tùy chọn) cập nhật hồ sơ sau khi đăng ký
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc' });
    }
    
    // Kiểm tra xem email có trong bảng User với trạng thái pending không
    const pendingUser = await User.findOne({ where: { email, status: 'pending' } });
    if (!pendingUser) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin đăng ký hoặc tài khoản đã được xác thực' });
    }
    
    // Xóa OTP cũ
    await Otp.destroy({ where: { email } });
    
    // Tạo OTP mới
    const code = genOtp();
    await Otp.create({
      email,
      code,
      expiresAt: new Date(Date.now() + OTP_EXP_MIN * 60 * 1000),
    });
    
    // Gửi email OTP mới
    try {
      await sendOtpEmail(email, code);
      
      return res.json({ 
        message: 'OTP mới đã được gửi đến email của bạn',
        email
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return res.status(500).json({ message: 'Không thể gửi email xác thực. Vui lòng thử lại sau.' });
    }
  } catch (err) {
    console.error('resendOtp error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { email, userName, firstName, lastName, age, gender, height, weight, goals, timestamp } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });

    const name = userName || [firstName, lastName].filter(Boolean).join(' ').trim() || user.name;
    const payload = {
      name,
      age: age ? Number(age) : user.age,
      gender: gender ?? user.gender,
      height: height ? Number(height) : user.height,
      weight: weight ? Number(weight) : user.weight,
      goal: Array.isArray(goals) ? JSON.stringify(goals) : user.goal,
      createdAt: timestamp ? new Date(timestamp) : user.createdAt,
    };

    await user.update(payload);
    return res.json({ message: 'Cập nhật profile thành công' });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc' });
    }
    
    // Kiểm tra xem email có tồn tại trong hệ thống không
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Email không tồn tại trong hệ thống' });
    }
    
    // Xóa OTP cũ nếu có
    await Otp.destroy({ where: { email } });
    
    // Tạo OTP mới
    const code = genOtp();
    await Otp.create({
      email,
      code,
      expiresAt: new Date(Date.now() + OTP_EXP_MIN * 60 * 1000),
    });
    
    // Gửi email OTP với flag đặt lại mật khẩu
    try {
      await sendOtpEmail(email, code, true);
      
      return res.json({ 
        message: 'Mã OTP đã được gửi đến email của bạn để đặt lại mật khẩu',
        email
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return res.status(500).json({ message: 'Không thể gửi email. Vui lòng thử lại sau.' });
    }
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP và mật khẩu mới là bắt buộc' });
    }
    
    // Validate password length
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }
    
    // Tìm OTP hợp lệ
    const record = await Otp.findOne({
      where: { email, code: otp, consumed: false },
      order: [['createdAt', 'DESC']],
    });
    
    // Kiểm tra OTP có tồn tại không
    if (!record) {
      return res.status(400).json({ message: 'OTP không hợp lệ' });
    }
    
    // Kiểm tra OTP có hết hạn không
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({ message: 'OTP đã hết hạn' });
    }
    
    // Tìm user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    
    // Đánh dấu OTP đã sử dụng
    await record.update({ consumed: true });
    
    // Hash mật khẩu mới
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Cập nhật mật khẩu
    await user.update({ passwordHash });
    
    return res.json({ 
      message: 'Đặt lại mật khẩu thành công',
      email: user.email
    });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
};