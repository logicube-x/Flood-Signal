import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const router = express.Router();

/**
 * Safely retrieve the JWT signing secret from the environment.
 * Fails safely when JWT_SECRET is missing; never falls back to an insecure default.
 */
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    throw new Error('JWT_SECRET environment variable is missing or empty. Token operations cannot proceed.');
  }
  return secret;
};

/**
 * Reusable Authentication Middleware
 * Enforces verified session token on protected endpoints.
 */
export const requireAuth = (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (error) {
    if (error.message && error.message.includes('JWT_SECRET')) {
      console.error('Security Configuration Error in requireAuth:', error.message);
      return res.status(500).json({ error: 'Server authentication configuration error' });
    }
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Reusable Role-Based Authorization Middleware
 * Restricts access to authorized municipal responders and administrators.
 */
export const requireResponder = (req, res, next) => {
  if (!req.user || (req.user.role !== 'responder' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Access denied: Municipal privileges required' });
  }
  next();
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Hardcode role to 'citizen' for all public registrations
    // Explicitly ignores any client-supplied 'role' field
    const user = new User({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'citizen'
    });

    await user.save();

    // Create token using the mandatory configured secret
    const token = jwt.sign({ userId: user._id, role: user.role }, getJwtSecret(), { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });

  } catch (error) {
    if (error.message && error.message.includes('JWT_SECRET')) {
      console.error('Security Configuration Error in register:', error.message);
      return res.status(500).json({ error: 'Server authentication configuration error' });
    }
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Sign token using the mandatory configured secret
    const token = jwt.sign({ userId: user._id, role: user.role }, getJwtSecret(), { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });

  } catch (error) {
    if (error.message && error.message.includes('JWT_SECRET')) {
      console.error('Security Configuration Error in login:', error.message);
      return res.status(500).json({ error: 'Server authentication configuration error' });
    }
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving user' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: new Date(0)
  });
  res.json({ message: 'Logged out successfully' });
});

// PATCH /api/auth/profile - Safe profile editing for permitted fields (name)
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const allowedKeys = ['name'];
    const submittedKeys = Object.keys(req.body);
    const unauthorizedKeys = submittedKeys.filter(k => !allowedKeys.includes(k));
    if (unauthorizedKeys.length > 0) {
      return res.status(400).json({ 
        error: `Modifying unauthorized fields is not permitted: ${unauthorizedKeys.join(', ')}` 
      });
    }

    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Name cannot exceed 100 characters' });
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.name = name.trim();
    await user.save();

    res.json({
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

export default router;
