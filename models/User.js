// models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  name: { type: DataTypes.STRING(150), allowNull: true },
  email: { type: DataTypes.STRING(191), allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'user' },
  age: { type: DataTypes.INTEGER, allowNull: true },
  gender: { type: DataTypes.STRING(20), allowNull: true },
  height: { type: DataTypes.INTEGER, allowNull: true }, // cm
  weight: { type: DataTypes.INTEGER, allowNull: true }, // kg
  goal: { type: DataTypes.TEXT, allowNull: true },      // có thể JSON.stringify([...])
  createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' }, // pending | active
}, {
  tableName: 'Users',
  updatedAt: 'updatedAt',
});

module.exports = User;
