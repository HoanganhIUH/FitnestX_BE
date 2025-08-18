require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
    dialectModule: require('mysql2'),
  }
);

async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL Database:', process.env.DB_NAME);
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
}

connectDB();

module.exports = sequelize;
