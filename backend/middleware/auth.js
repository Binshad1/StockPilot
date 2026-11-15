const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");

// Verifies the JWT and loads the CURRENT user from the database, so a
// deactivated user or a changed role takes effect immediately.
const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new ApiError(401, "Not authorized. Token required.");
  }
  let decoded;
  try {
    decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired token");
  }
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) throw new ApiError(401, "Account not found or disabled");
  req.user = user;
  next();
};

// Usage: authorize("admin")  or  authorize("admin", "staff")
const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, "You do not have permission to perform this action");
    }
    next();
  };

module.exports = { protect, authorize };
