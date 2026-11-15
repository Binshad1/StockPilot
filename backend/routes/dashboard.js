const express = require("express");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Order = require("../models/Order");
const StockMovement = require("../models/StockMovement");
const { protect } = require("../middleware/auth");

const router = express.Router();
router.use(protect);

const TZ = () => process.env.TIMEZONE || "Asia/Kolkata";
const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ() }).format(d); // YYYY-MM-DD

// Last `n` calendar days (oldest -> newest) as YYYY-MM-DD strings in the configured timezone
const lastDays = (n) => {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(dayKey(new Date(Date.now() - i * 86400000)));
  return out;
};

// GET /api/dashboard
router.get("/", async (req, res) => {
  const days = lastDays(7);
  const today = days[days.length - 1];
  const monthPrefix = today.slice(0, 7);
  const since = new Date(Date.now() - 40 * 86400000);
  const notCancelled = { status: { $ne: "cancelled" } };

  const [
    totalProducts, stockAgg, lowStockCount, outOfStock, totalCustomers,
    statusAgg, salesByDay, moveByDay, revenueAll, topProducts, lowStockItems, recentOrders, recentMoves,
  ] = await Promise.all([
    Product.countDocuments(),
    Product.aggregate([{ $group: { _id: null, units: { $sum: "$stock" }, value: { $sum: { $multiply: ["$price", "$stock"] } } } }]),
    Product.countDocuments({ $expr: { $lte: ["$stock", "$lowStockThreshold"] } }),
    Product.countDocuments({ stock: 0 }),
    Customer.countDocuments(),
    Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { ...notCancelled, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ() } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
    ]),
    StockMovement.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ() } }, type: "$type" }, qty: { $sum: "$quantity" } } },
    ]),
    Order.aggregate([{ $match: notCancelled }, { $group: { _id: null, revenue: { $sum: "$total" } } }]),
    Order.aggregate([
      { $match: { ...notCancelled, createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.product", name: { $first: "$items.name" }, sku: { $first: "$items.sku" }, quantity: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } } } },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
    ]),
    Product.find({ $expr: { $lte: ["$stock", "$lowStockThreshold"] } }).sort({ stock: 1 }).limit(6),
    Order.find().sort({ createdAt: -1 }).limit(6),
    StockMovement.find({ reason: { $nin: ["order", "order-cancelled"] } }).sort({ createdAt: -1 }).limit(6),
  ]);

  const revByDay = new Map(salesByDay.map((r) => [r._id, r]));
  const sales = days.map((d) => ({ date: d, revenue: revByDay.get(d)?.revenue || 0, orders: revByDay.get(d)?.orders || 0 }));
  const movement = days.map((d) => {
    const find = (t) => moveByDay.find((m) => m._id.day === d && m._id.type === t)?.qty || 0;
    return { date: d, in: find("in"), out: find("out") };
  });

  const revenueToday = revByDay.get(today)?.revenue || 0;
  const revenueMonth = salesByDay.filter((r) => r._id.startsWith(monthPrefix)).reduce((s, r) => s + r.revenue, 0);
  const statusCounts = Object.fromEntries(statusAgg.map((s) => [s._id, s.count]));

  const activity = [
    ...recentOrders.map((o) => ({
      type: "order", title: `Order ${o.orderNumber} ${o.status}`, detail: `${o.items.length} item(s) · ${o.customerName} · ₹${o.total.toLocaleString("en-IN")}`,
      status: o.status, at: o.createdAt,
    })),
    ...recentMoves.map((m) => ({
      type: m.type === "in" ? "stock-in" : "stock-out", title: m.type === "in" ? "Stock added" : "Stock removed",
      detail: `${m.productName} · ${m.type === "in" ? "+" : "-"}${m.quantity} units`, at: m.createdAt,
    })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 8);

  res.json({
    totals: {
      products: totalProducts,
      stockUnits: stockAgg[0]?.units || 0,
      inventoryValue: stockAgg[0]?.value || 0,
      lowStock: lowStockCount,
      outOfStock,
      customers: totalCustomers,
      orders: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      pendingOrders: statusCounts.pending || 0,
      completedOrders: statusCounts.completed || 0,
      cancelledOrders: statusCounts.cancelled || 0,
      revenueToday,
      revenueMonth,
      revenueTotal: revenueAll[0]?.revenue || 0,
    },
    sales,
    movement,
    topProducts,
    lowStockItems,
    activity,
  });
});

module.exports = router;
