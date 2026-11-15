const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const User = require("../models/User");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");
const ApiError = require("../utils/ApiError");

const router = express.Router();

const password = z.string().min(8, "Password must be at least 8 characters").max(100);

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password,
});
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: password,
});

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

// POST /api/auth/register  (public registration always creates "staff";
// the very first account in an empty database becomes "admin")
router.post("/register", validate(registerSchema), async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.findOne({ email })) throw new ApiError(409, "Email already registered");

  const isFirstUser = (await User.countDocuments()) === 0;
  const user = await User.create({ name, email, password, role: isFirstUser ? "admin" : "staff" });

  res.status(201).json({ message: "User registered successfully", token: signToken(user), user: user.toSafeJSON() });
});

// POST /api/auth/login
router.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, "Invalid email or password");
  if (!user.isActive) throw new ApiError(403, "This account has been disabled");

  res.json({ message: "Login successful", token: signToken(user), user: user.toSafeJSON() });
});

// POST /api/auth/logout  (JWT is stateless: the client deletes its token)
router.post("/logout", protect, (req, res) => res.json({ message: "Logged out" }));

// GET /api/auth/me
router.get("/me", protect, (req, res) => res.json({ user: req.user.toSafeJSON() }));

// PUT /api/auth/password
router.put("/password", protect, validate(changePasswordSchema), async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(req.body.currentPassword))) throw new ApiError(400, "Current password is incorrect");
  user.password = req.body.newPassword;
  await user.save();
  res.json({ message: "Password updated" });
});

module.exports = router;
