// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/db');
const User = require('./models/User');
const Otp = require('./models/Otp');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL Database');
    
    // Đảm bảo các bảng được tạo theo đúng thứ tự
    await sequelize.sync({ alter: true }); // dev: tạo/cập nhật bảng nếu cần
    console.log('✅ Database tables synchronized');
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
  } catch (e) {
    console.error('DB connection error:', e);
    process.exit(1);
  }
})();
