const express = require("express");
const { z } = require("zod");
const Product = require("../models/Product");
const validate = require("../middleware/validate");
const { protect, authorize } = require("../middleware/auth");
const { upload, removeUpload } = require("../middleware/upload");
const { adjustStock } = require("../services/stockService");
const ApiError = require("../utils/ApiError");
const { escapeRegex, paginate, pageResult } = require("../utils/helpers");

const router = express.Router();
router.use(protect);

// Forms are sent as multipart/form-data, so numbers arrive as strings -> z.coerce
const base = {
  name: z.string().trim().min(1, "Name is required").max(120),
  sku: z.string().trim().min(1, "SKU is required").max(40),
  category: z.string().trim().min(1, "Category is required").max(60),
  description: z.string().trim().max(500).optional().default(""),
  price: z.coerce.number({ invalid_type_error: "Price must be a number" }).min(0, "Price cannot be negative"),
  lowStockThreshold: z.coerce.number().int().min(0).optional().default(10),
};
const createSchema = z.object({ ...base, stock: z.coerce.number().int().min(0, "Stock cannot be negative").optional().default(0) });
// Stock is NOT editable here - use the Inventory endpoints so every change is logged.
const updateSchema = z.object(base).partial().strip();

// GET /api/products?q=&category=&status=low|out|ok&page=&limit=
router.get("/", async (req, res) => {
  const { q, category, status } = req.query;
  const filter = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ name: rx }, { sku: rx }, { category: rx }];
  }
  if (category) filter.category = category;
  if (status === "out") filter.stock = 0;
  if (status === "low") filter.$expr = { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockThreshold"] }] };
  if (status === "ok") filter.$expr = { $gt: ["$stock", "$lowStockThreshold"] };

  const pg = paginate(req.query, 10, 100);
  const [data, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    Product.countDocuments(filter),
  ]);
  res.json(pageResult(data, total, pg));
});

router.get("/categories", async (req, res) => {
  res.json((await Product.distinct("category")).sort());
});

router.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, "Product not found");
  res.json(product);
});

// POST /api/products  (admin)
router.post("/", authorize("admin"), upload.single("image"), validate(createSchema), async (req, res) => {
  const { stock, ...fields } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : "";
  let product;
  try {
    product = await Product.create({ ...fields, stock: 0, image });
    if (stock > 0) {
      ({ product } = await adjustStock({
        productId: product._id, type: "in", quantity: stock, reason: "initial", note: "Opening stock", user: req.user,
      }));
    }
  } catch (err) {
    if (req.file) removeUpload(image);
    throw err;
  }
  res.status(201).json(product);
});

// PUT /api/products/:id  (admin)
router.put("/:id", authorize("admin"), upload.single("image"), validate(updateSchema), async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    if (req.file) removeUpload(`/uploads/${req.file.filename}`);
    throw new ApiError(404, "Product not found");
  }
  const oldImage = product.image;
  Object.assign(product, req.body);
  if (req.file) product.image = `/uploads/${req.file.filename}`;
  try {
    await product.save();
  } catch (err) {
    if (req.file) removeUpload(product.image);
    throw err;
  }
  if (req.file) removeUpload(oldImage);
  res.json(product);
});

// DELETE /api/products/:id  (admin)
router.delete("/:id", authorize("admin"), async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new ApiError(404, "Product not found");
  removeUpload(product.image);
  res.json({ message: "Product deleted successfully" });
});

module.exports = router;
