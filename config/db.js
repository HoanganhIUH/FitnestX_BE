require('dotenv').config();
const mongoose = require('mongoose');

async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB Atlas');
  } catch (error) {
    console.error('❌ Unable to connect to MongoDB Atlas:', error);
    process.exit(1); // Thoát ứng dụng nếu không thể kết nối database
  }
}

connectDB();

module.exports = mongoose;
