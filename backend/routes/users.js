const express = require("express");
const { z } = require("zod");
const User = require("../models/User");
const validate = require("../middleware/validate");
const { protect, authorize } = require("../middleware/auth");
const ApiError = require("../utils/ApiError");

const router = express.Router();
router.use(protect, authorize("admin")); // everything here is admin-only

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  role: z.enum(["admin", "staff"]).default("staff"),
});
const updateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  role: z.enum(["admin", "staff"]).optional(),
  isActive: z.boolean().optional(),
});

router.get("/", async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json(users.map((u) => ({ ...u.toSafeJSON(), createdAt: u.createdAt })));
});

router.post("/", validate(createSchema), async (req, res) => {
  if (await User.findOne({ email: req.body.email })) throw new ApiError(409, "Email already registered");
  const user = await User.create(req.body);
  res.status(201).json(user.toSafeJSON());
});

router.patch("/:id", validate(updateSchema), async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  if (String(user._id) === String(req.user._id) && (req.body.role === "staff" || req.body.isActive === false)) {
    throw new ApiError(400, "You cannot demote or disable your own account");
  }
  Object.assign(user, req.body);
  await user.save();
  res.json(user.toSafeJSON());
});

module.exports = router;
