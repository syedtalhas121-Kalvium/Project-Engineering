import bcrypt from 'bcrypt'
import User from '../models/User.js'
import jwt from 'jsonwebtoken'

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 12)

// @desc    Register user
// @route   POST /api/auth/signup
export const signup = async (req, res) => {
  try {
    const { email, password } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' })
    }

    // Hash before persistence. The plaintext password never reaches MongoDB.
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await User.create({
      email,
      password: passwordHash,
    })

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    })

    res.status(201).json({ token, user: { id: user._id, email: user.email } })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

// @desc    Authenticate user
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Compare the submitted plaintext against the stored bcrypt hash.
    const passwordMatches = await bcrypt.compare(password, user.password)
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    })

    res.status(200).json({ token, user: { id: user._id, email: user.email } })
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}

// @desc    Get user profile
// @route   GET /api/auth/profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.status(200).json(user)
  } catch (error) {
    res.status(500).json({ message: 'Server error' })
  }
}
