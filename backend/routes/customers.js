const express = require("express");
const { z } = require("zod");
const Customer = require("../models/Customer");
const Order = require("../models/Order");
const validate = require("../middleware/validate");
const { protect, authorize } = require("../middleware/auth");
const ApiError = require("../utils/ApiError");
const { escapeRegex, paginate, pageResult } = require("../utils/helpers");

const router = express.Router();
router.use(protect);

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email").optional().or(z.literal("")).default(""),
  phone: z.string().trim().regex(/^[0-9+\-\s()]{6,20}$/, "Enter a valid phone number").optional().or(z.literal("")).default(""),
  address: z.string().trim().max(300).optional().default(""),
  notes: z.string().trim().max(500).optional().default(""),
});

const statsFor = async (ids) => {
  const rows = await Order.aggregate([
    { $match: { customer: { $in: ids }, status: { $ne: "cancelled" } } },
    { $group: { _id: "$customer", orders: { $sum: 1 }, totalSpent: { $sum: "$total" } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r]));
};

router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q), "i");
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const pg = paginate(req.query, 10, 100);
  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit),
    Customer.countDocuments(filter),
  ]);
  const stats = await statsFor(customers.map((c) => c._id));
  const data = customers.map((c) => ({
    ...c.toJSON(),
    orders: stats.get(String(c._id))?.orders || 0,
    totalSpent: stats.get(String(c._id))?.totalSpent || 0,
  }));
  res.json(pageResult(data, total, pg));
});

router.get("/:id", async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new ApiError(404, "Customer not found");
  const [stats, recentOrders] = await Promise.all([
    statsFor([customer._id]),
    Order.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(10).select("orderNumber total status createdAt"),
  ]);
  const s = stats.get(String(customer._id));
  res.json({ ...customer.toJSON(), orders: s?.orders || 0, totalSpent: s?.totalSpent || 0, recentOrders });
});

router.post("/", validate(schema), async (req, res) => {
  res.status(201).json(await Customer.create(req.body));
});

router.put("/:id", validate(schema), async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!customer) throw new ApiError(404, "Customer not found");
  res.json(customer);
});

router.delete("/:id", authorize("admin"), async (req, res) => {
  if (await Order.exists({ customer: req.params.id })) {
    throw new ApiError(409, "This customer has orders and cannot be deleted");
  }
  const customer = await Customer.findByIdAndDelete(req.params.id);
  if (!customer) throw new ApiError(404, "Customer not found");
  res.json({ message: "Customer deleted successfully" });
});

module.exports = router;
