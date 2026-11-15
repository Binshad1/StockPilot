const express = require("express");
const { z } = require("zod");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");
const { adjustStock } = require("../services/stockService");
const { paginate, pageResult, escapeRegex, isObjectId } = require("../utils/helpers");

const router = express.Router();
router.use(protect);

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid product id");
const note = z.string().trim().max(300).optional().default("");

const stockInSchema = z.object({
  productId: objectId,
  quantity: z.coerce.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1"),
  reason: z.enum(["purchase", "return", "adjustment", "other"]).default("purchase"),
  note,
});
const stockOutSchema = z.object({
  productId: objectId,
  quantity: z.coerce.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1"),
  reason: z.enum(["damaged", "adjustment", "other"]).default("other"),
  note,
});

// POST /api/inventory/stock-in
router.post("/stock-in", validate(stockInSchema), async (req, res) => {
  const { product, movement } = await adjustStock({ ...req.body, type: "in", user: req.user });
  res.status(201).json({ message: "Stock added", product, movement });
});

// POST /api/inventory/stock-out
router.post("/stock-out", validate(stockOutSchema), async (req, res) => {
  const { product, movement } = await adjustStock({ ...req.body, type: "out", user: req.user });
  res.status(201).json({ message: "Stock removed", product, movement });
});

// GET /api/inventory/low-stock   -> items at or below their alert level
router.get("/low-stock", async (req, res) => {
  const items = await Product.find({ $expr: { $lte: ["$stock", "$lowStockThreshold"] } }).sort({ stock: 1 });
  res.json(items);
});

// GET /api/inventory/movements?type=in|out&product=&q=&from=&to=&page=&limit=
router.get("/movements", async (req, res) => {
  const { type, product, q, from, to } = req.query;
  const filter = {};
  if (type === "in" || type === "out") filter.type = type;
  if (product && isObjectId(product)) filter.product = product;
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ productName: rx }, { sku: rx }];
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }
  const pg = paginate(req.query, 15, 100);
  const [data, total] = await Promise.all([
    StockMovement.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    StockMovement.countDocuments(filter),
  ]);
  res.json(pageResult(data, total, pg));
});

module.exports = router;
