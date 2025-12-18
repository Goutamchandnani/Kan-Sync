import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';
import { OAuth2Client } from 'google-auth-library';
import fetch from 'node-fetch';
const router = express.Router();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Validation middleware
const validateRegistration = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Register new user
router.post('/register', validateRegistration, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, message: errors.array()[0].msg, code: 400 });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: true, message: 'User already exists', code: 400 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      name,
      email,
      passwordHash
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Server error', code: 500 });
    next(err);
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, message: errors.array()[0].msg, code: 400 });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: true, message: 'Invalid credentials', code: 400 });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: true, message: 'Invalid credentials', code: 400 });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    console.log('Request Origin:', req.headers.origin);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (err) {
    res.status(500).json({ error: true, message: 'Server error', code: 500 });
    next(err);
  }
});

// Google Login
router.post('/google-login', async (req, res, next) => {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      // Register new user
      user = new User({
        name,
        email,
        avatar: picture,
        passwordHash: await bcrypt.hash(email + Date.now(), 10) // Dummy password for social login
      });
      await user.save();
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(200).json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });

  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ error: true, message: 'Google login failed', code: 500 });
    next(err);
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: true, message: 'User not found', code: 404 });
    }
    res.json(user);
  } catch (err) {
    console.error('Error in /me endpoint:', err);
    res.status(500).json({ error: true, message: 'Server error', code: 500 });
    next(err);
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Invalid email address'),
  body('avatar').optional().isURL().withMessage('Invalid avatar URL')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: true, message: errors.array()[0].msg, code: 400 });
    }

    const { name, email, avatar } = req.body;
    const userId = req.user.id;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (avatar) updateFields.avatar = avatar;

    // If email is being updated, check if it already exists for another user
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && !existingUser._id.equals(userId)) {
        return res.status(400).json({ error: true, message: 'Email already in use', code: 400 });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields, updatedAt: Date.now() },
      { new: true, select: '-passwordHash' }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: true, message: 'User not found', code: 404 });
    }

    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
});

// Get user notifications
router.get('/notifications', authenticateToken, async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort('-timestamp')
      .limit(50); // Limit to latest 50 notifications
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: true, message: 'Server error', code: 500 });
    next(err);
  }
});

// Mark notification as read
router.put('/notifications/:id/read', authenticateToken, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isRead: true },
      { new: true }
    );

export default router;
    if (!notification) {
      return res.status(404).json({ error: true, message: 'Notification not found', code: 404 });
    }

    res.json(notification);
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: true, message: 'Server error', code: 500 });
    next(err);
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', authenticateToken, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: true, message: 'Server error', code: 500 });
    next(err);
  }
});



export default router;