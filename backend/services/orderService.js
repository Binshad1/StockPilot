const mongoose = require("mongoose");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Order = require("../models/Order");
const Counter = require("../models/Counter");
const StockMovement = require("../models/StockMovement");
const ApiError = require("../utils/ApiError");
const { adjustStock } = require("./stockService");

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Create an order and deduct stock automatically.
 * Works on any MongoDB (no transactions needed): every line is deducted atomically,
 * and if any line fails (e.g. not enough stock) everything already done is rolled back.
 */
const createOrder = async ({ customerId, items, discount = 0, notes = "", user }) => {
  // Merge duplicate lines for the same product
  const merged = new Map();
  for (const it of items) {
    merged.set(it.productId, (merged.get(it.productId) || 0) + it.quantity);
  }

  const products = await Product.find({ _id: { $in: [...merged.keys()] } });
  if (products.length !== merged.size) throw new ApiError(404, "One or more products were not found");

  let customer = null;
  if (customerId) {
    customer = await Customer.findById(customerId);
    if (!customer) throw new ApiError(404, "Customer not found");
  }

  const lines = products.map((p) => ({
    product: p._id,
    name: p.name,
    sku: p.sku,
    category: p.category,
    price: p.price, // price always comes from the database, never from the client
    quantity: merged.get(String(p._id)),
  }));

  const subtotal = round2(lines.reduce((s, l) => s + l.price * l.quantity, 0));
  if (discount > subtotal) throw new ApiError(400, "Discount cannot be more than the order subtotal");
  const total = round2(subtotal - discount);

  const orderId = new mongoose.Types.ObjectId();
  const done = [];
  try {
    for (const l of lines) {
      await adjustStock({
        productId: l.product,
        type: "out",
        quantity: l.quantity,
        reason: "order",
        note: "Sold via order",
        user,
        orderId,
      });
      done.push(l);
    }
    const seq = await Counter.next("order");
    return await Order.create({
      _id: orderId,
      orderNumber: `ORD-${1000 + seq}`,
      customer: customer?._id || null,
      customerName: customer?.name || "Walk-in customer",
      items: lines,
      subtotal,
      discount,
      total,
      notes,
      createdBy: user?._id,
      createdByName: user?.name || "",
    });
  } catch (err) {
    // Roll back: put stock back and remove ledger rows created for this order
    for (const l of done) await Product.updateOne({ _id: l.product }, { $inc: { stock: l.quantity } });
    await StockMovement.deleteMany({ order: orderId });
    throw err;
  }
};

/** pending -> completed | cancelled,  completed -> cancelled.  Cancelling returns stock. */
const changeStatus = async (order, status, user) => {
  if (order.status === "cancelled") throw new ApiError(409, "A cancelled order cannot be changed");
  if (order.status === status) throw new ApiError(409, `Order is already ${status}`);
  if (order.status === "completed" && status === "pending") throw new ApiError(409, "A completed order cannot go back to pending");

  if (status === "cancelled") {
    for (const it of order.items) {
      await adjustStock({
        productId: it.product,
        type: "in",
        quantity: it.quantity,
        reason: "order-cancelled",
        note: `Order ${order.orderNumber} cancelled`,
        user,
        orderId: order._id,
      }).catch((e) => {
        if (e.status !== 404) throw e; // product was deleted meanwhile - nothing to restock
      });
    }
  }
  order.status = status;
  await order.save();
  return order;
};

module.exports = { createOrder, changeStatus };
