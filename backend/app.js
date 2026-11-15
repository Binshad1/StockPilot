const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const path = require("path");
const swaggerUi = require("swagger-ui-express");

const openapi = require("./docs/openapi");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean);

app.set("trust proxy", 1); // needed behind Render/Railway proxies for rate limiting
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, contentSecurityPolicy: false }));
app.use(
  cors({
    origin: (origin, cb) => {
      // no Origin header = mobile app / curl / Postman -> allow
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
  })
);
app.use(express.json({ limit: "1mb" }));
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Brute-force protection on login/register
if (process.env.NODE_ENV !== "test") {
  app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, message: { message: "Too many attempts. Try again in a few minutes." } }));
  app.use("/api/auth/register", rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, message: { message: "Too many sign-ups from this address." } }));
}

app.get("/", (req, res) => res.json({ name: "StockPilot API", status: "running", docs: "/api/docs" }));
app.get("/api/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ status: connected ? "OK" : "DEGRADED", database: connected ? "Connected" : "Disconnected", uptime: process.uptime() });
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "StockPilot API Docs" }));
app.get("/api/openapi.json", (req, res) => res.json(openapi));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/products", require("./routes/products"));
app.use("/api/inventory", require("./routes/inventory"));
app.use("/api/customers", require("./routes/customers"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/reports", require("./routes/reports"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
