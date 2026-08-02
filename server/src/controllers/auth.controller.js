import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../config/db.js';
import { users } from '../config/schema.js';

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
export const signup = async (req, res) => {
  try {
    const { name, email, password, college } = req.body;

    // Validation
    if (!name || !email || !password || !college) {
      return res.status(400).json({ error: 'Please provide all required fields' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const [userExists] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (userExists) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const [user] = await db.insert(users).values({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      college: college.trim(),
    }).returning();

    if (user) {
      res.status(201).json({
        token: generateToken(user.id),
        user: {
          _id: user.id, // Keep _id format for frontend compatibility if needed
          name: user.name,
          email: user.email,
          college: user.college,
        },
      });
    } else {
      res.status(400).json({ error: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Match password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.status(200).json({
      token: generateToken(user.id),
      user: {
        _id: user.id,
        name: user.name,
        email: user.email,
        college: user.college,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Server error during login' });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    // req.user is set by protect middleware
    res.status(200).json({
      user: {
        _id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        college: req.user.college,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({ error: 'Server error retrieving profile' });
  }
};
