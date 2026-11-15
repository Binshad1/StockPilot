const express = require("express");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { protect, authorize } = require("../middleware/auth");
const { toCSV } = require("../utils/helpers");

const router = express.Router();
router.use(protect, authorize("admin")); // reports are admin-only

const TZ = () => process.env.TIMEZONE || "Asia/Kolkata";
const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ() }).format(d);

const sendCSV = (res, name, csv) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  res.send(csv);
};

// GET /api/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv
router.get("/sales", async (req, res) => {
  const to = req.query.to ? new Date(new Date(req.query.to).setHours(23, 59, 59, 999)) : new Date();
  const from = req.query.from ? new Date(req.query.from) : new Date(to.getTime() - 29 * 86400000);
  const range = { createdAt: { $gte: from, $lte: to } };
  const valid = { ...range, status: { $ne: "cancelled" } };

  if (req.query.format === "csv") {
    const orders = await Order.find(range).sort({ createdAt: -1 });
    return sendCSV(
      res, "sales-report.csv",
      toCSV(
        ["Order", "Date", "Customer", "Items", "Subtotal", "Discount", "Total", "Status", "Created by"],
        orders.map((o) => [o.orderNumber, dayKey(o.createdAt), o.customerName, o.items.reduce((s, i) => s + i.quantity, 0), o.subtotal, o.discount, o.total, o.status, o.createdByName])
      )
    );
  }

  const [summary, byDay, topProducts, byCategory, byStatus] = await Promise.all([
    Order.aggregate([
      { $match: valid },
      { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: "$total" }, discount: { $sum: "$discount" }, items: { $sum: { $sum: "$items.quantity" } } } },
    ]),
    Order.aggregate([
      { $match: valid },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ() } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: valid }, { $unwind: "$items" },
      { $group: { _id: "$items.product", name: { $first: "$items.name" }, sku: { $first: "$items.sku" }, quantity: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } },
      { $sort: { revenue: -1 } }, { $limit: 10 },
    ]),
    Order.aggregate([
      { $match: valid }, { $unwind: "$items" },
      { $group: { _id: "$items.category", quantity: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } },
      { $sort: { revenue: -1 } },
    ]),
    Order.aggregate([{ $match: range }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const s = summary[0] || { orders: 0, revenue: 0, discount: 0, items: 0 };
  res.json({
    from, to,
    summary: { orders: s.orders, revenue: s.revenue, discount: s.discount, itemsSold: s.items, averageOrderValue: s.orders ? Math.round((s.revenue / s.orders) * 100) / 100 : 0 },
    byDay: byDay.map((d) => ({ date: d._id, revenue: d.revenue, orders: d.orders })),
    topProducts: topProducts.map(({ _id, ...r }) => ({ productId: _id, ...r })),
    byCategory: byCategory.map((c) => ({ category: c._id || "Uncategorised", quantity: c.quantity, revenue: c.revenue })),
    byStatus: Object.fromEntries(byStatus.map((x) => [x._id, x.count])),
  });
});

// GET /api/reports/inventory?format=csv
router.get("/inventory", async (req, res) => {
  const products = await Product.find().sort({ category: 1, name: 1 });

  if (req.query.format === "csv") {
    return sendCSV(
      res, "inventory-report.csv",
      toCSV(
        ["Name", "SKU", "Category", "Price", "Stock", "Alert level", "Status", "Stock value"],
        products.map((p) => [p.name, p.sku, p.category, p.price, p.stock, p.lowStockThreshold, p.status, p.price * p.stock])
      )
    );
  }

  const cats = new Map();
  let units = 0, value = 0, low = 0, out = 0;
  for (const p of products) {
    units += p.stock;
    value += p.price * p.stock;
    if (p.status === "low") low++;
    if (p.status === "out") out++;
    const c = cats.get(p.category) || { category: p.category, products: 0, units: 0, value: 0 };
    c.products++; c.units += p.stock; c.value += p.price * p.stock;
    cats.set(p.category, c);
  }
  res.json({
    summary: { products: products.length, units, value, lowStock: low, outOfStock: out },
    byCategory: [...cats.values()].sort((a, b) => b.value - a.value),
    attention: products.filter((p) => p.status !== "ok").sort((a, b) => a.stock - b.stock),
  });
});

module.exports = router;
