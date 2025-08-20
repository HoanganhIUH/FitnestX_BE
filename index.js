// server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import MongoDB connection
require('./config/db'); // MongoDB connection is established in this file
const User = require('./models/User');
const Otp = require('./models/Otp');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// Khởi động server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API listening on http://localhost:${PORT}`);
});

// Xử lý lỗi không xử lý được
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
