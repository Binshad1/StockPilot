// Usage: npm run make-admin -- someone@example.com
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

(async () => {
  const email = (process.argv[2] || "").toLowerCase();
  if (!email) {
    console.log("Usage: npm run make-admin -- user@example.com");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email });
  if (!user) console.log("User not found:", email);
  else {
    user.role = "admin";
    await user.save();
    console.log(`${email} is now an admin`);
  }
  await mongoose.disconnect();
})();
