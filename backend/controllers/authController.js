const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require("crypto");
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const PasswordResetToken = require("../models/PasswordResetToken");
const { sendResetEmail } = require("../services/emailService");

const JWT_SECRET = process.env.JWT_SECRET;

const generateToken = (userId) => {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }
  return jwt.sign({ userId: userId.toString() }, JWT_SECRET, { expiresIn: '30d' });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Input validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check if user already exists (case-insensitive)
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User already exists with this email' });
    }

    // Create user — password is hashed by the pre-save hook in User model
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role,
      phone: phone ? phone.trim() : undefined
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'User already exists with this email' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Find user by email (case-insensitive)
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Compare password using the model method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let profile = { ...user.toObject() };

    if (user.role === 'teacher') {
      const teacherProfile = await Teacher.findOne({ userId: user._id });
      if (teacherProfile) {
        profile.teacherProfile = teacherProfile;
      }
    }

    res.json({ success: true, user: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return res.json({ success: true, message: "If an account with that email exists, a reset link has been sent." });
    }

    await PasswordResetToken.deleteMany({ userId: user._id });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 15 * 60 * 1000;

    await PasswordResetToken.create({
      userId: user._id,
      token,
      expiresAt,
    });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendResetEmail(email, resetLink);

    res.json({ success: true, message: "If an account with that email exists, a reset link has been sent." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    const record = await PasswordResetToken.findOne({ token });
    if (!record || record.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    res.json({ success: true, valid: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const record = await PasswordResetToken.findOne({ token });
    if (!record || record.expiresAt < Date.now()) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    const user = await User.findById(record.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // The pre-save hook will hash the password
    user.password = password;
    await user.save();

    await PasswordResetToken.deleteMany({ userId: user._id });

    res.json({ success: true, message: "Password reset successful!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  forgotPassword,
  validateResetToken,
  resetPassword
};
