require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error("JWT_SECRET is missing or too short. Set a long random value in .env");
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`StockPilot API running on port ${PORT}  ·  docs: /api/docs`));
})();
