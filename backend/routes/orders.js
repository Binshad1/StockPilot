const express = require("express");
const { z } = require("zod");
const Order = require("../models/Order");
const validate = require("../middleware/validate");
const { protect, authorize } = require("../middleware/auth");
const { createOrder, changeStatus } = require("../services/orderService");
const ApiError = require("../utils/ApiError");
const { escapeRegex, paginate, pageResult, isObjectId } = require("../utils/helpers");

const router = express.Router();
router.use(protect);

const objectId = (label) => z.string().regex(/^[a-f\d]{24}$/i, `Invalid ${label}`);

const createSchema = z.object({
  customerId: objectId("customer id").optional().or(z.literal("")).transform((v) => v || undefined),
  items: z
    .array(
      z.object({
        productId: objectId("product id"),
        quantity: z.coerce.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1"),
      })
    )
    .min(1, "Add at least one product")
    .max(50),
  discount: z.coerce.number().min(0, "Discount cannot be negative").optional().default(0),
  notes: z.string().trim().max(500).optional().default(""),
});
const statusSchema = z.object({ status: z.enum(["completed", "cancelled"]) });

// GET /api/orders?status=&q=&customer=&from=&to=&page=&limit=
router.get("/", async (req, res) => {
  const { status, q, customer, from, to } = req.query;
  const filter = {};
  if (["pending", "completed", "cancelled"].includes(status)) filter.status = status;
  if (customer && isObjectId(customer)) filter.customer = customer;
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ orderNumber: rx }, { customerName: rx }];
  }
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
  }
  const pg = paginate(req.query, 10, 100);
  const [data, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    Order.countDocuments(filter),
  ]);
  res.json(pageResult(data, total, pg));
});

router.get("/:id", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");
  res.json(order);
});

// POST /api/orders  -> creates the order AND deducts stock
router.post("/", validate(createSchema), async (req, res) => {
  const order = await createOrder({ ...req.body, user: req.user });
  res.status(201).json(order);
});

// PATCH /api/orders/:id/status   completed | cancelled (cancel = admin only, restores stock)
router.patch("/:id/status", validate(statusSchema), async (req, res) => {
  if (req.body.status === "cancelled" && req.user.role !== "admin") {
    throw new ApiError(403, "Only an admin can cancel an order");
  }
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");
  res.json(await changeStatus(order, req.body.status, req.user));
});

module.exports = router;
