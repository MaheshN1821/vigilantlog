import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { username, email, password, deviceName } = req.body;

    // Validation
    if (!username || !email || !password || !deviceName) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { deviceName }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({
          success: false,
          message: "Email already registered",
        });
      }
      if (existingUser.username === username) {
        return res.status(400).json({
          success: false,
          message: "Username already taken",
        });
      }
      if (existingUser.deviceName === deviceName) {
        return res.status(400).json({
          success: false,
          message: "Device Name already taken",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      deviceName,
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          deviceName: user.deviceName,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password, deviceName } = req.body;

    // Validation
    if (!email || !password || !deviceName) {
      return res.status(400).json({
        success: false,
        message: "Please provide email, password, and device name",
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check device name
    if (user.deviceName !== deviceName) {
      return res.status(401).json({
        success: false,
        message: "Invalid system name",
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          deviceName: user.deviceName,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

// @desc    Update system name
// @route   PUT /api/auth/system-name
// @access  Private
const updateSystemName = async (req, res) => {
  try {
    const { deviceName } = req.body;
    const userId = req.user.id; // Set by auth middleware

    // Validation
    if (!deviceName) {
      return res.status(400).json({
        success: false,
        message: "Please provide system name",
      });
    }

    if (deviceName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "System name must be at least 2 characters long",
      });
    }

    if (deviceName.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: "System name cannot exceed 50 characters",
      });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { deviceName: deviceName.trim() },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Device name updated successfully",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          deviceName: user.deviceName,
        },
      },
    });
  } catch (error) {
    console.error("Update system name error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during update",
    });
  }
};

export { register, login, updateSystemName };
