const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No authorization header, access denied' });
    }

    // Handle both "Bearer <token>" and raw token formats
    let token;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else {
      token = authHeader;
    }

    if (!token || token === 'undefined' || token === 'null') {
      return res.status(401).json({ success: false, message: 'No token provided, access denied' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user and attach to request
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found, token invalid' });
    }

    // Attach user to request — accessible as req.user._id and req.user.id
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired, please login again' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    res.status(401).json({ success: false, message: 'Authentication failed' });
  }
};

module.exports = auth;
