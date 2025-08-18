// models/Otp.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Otp = sequelize.define('Otp', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  email: { type: DataTypes.STRING(191), allowNull: false },
  code: { type: DataTypes.STRING(6), allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  consumed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, {
  tableName: 'Otps',
  timestamps: true,
});

module.exports = Otp;
