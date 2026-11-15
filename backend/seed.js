// Demo data. WARNING: wipes all collections first.   Usage: npm run seed
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const Product = require("./models/Product");
const Customer = require("./models/Customer");
const Order = require("./models/Order");
const Counter = require("./models/Counter");
const StockMovement = require("./models/StockMovement");
const { adjustStock } = require("./services/stockService");
const { createOrder, changeStatus } = require("./services/orderService");

// tiny deterministic random so the demo data is the same every run
let s = 42;
const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const daysAgo = (n, hour = 11) => { const d = new Date(Date.now() - n * 86400000); d.setHours(hour, Math.floor(rnd() * 59), 0, 0); return d; };

const PRODUCTS = [
  ["Wireless Mouse", "WM-001", "Electronics", 599, 60, 15],
  ["Mechanical Keyboard", "KB-002", "Electronics", 2499, 22, 8],
  ["USB-C Hub 7-in-1", "HB-003", "Accessories", 1299, 14, 10],
  ["Laptop Stand", "LS-004", "Accessories", 899, 34, 10],
  ["27\" 4K Monitor", "MN-005", "Electronics", 18999, 9, 5],
  ["Noise Cancelling Headphones", "HP-006", "Electronics", 7999, 18, 6],
  ["Webcam 1080p", "WC-007", "Electronics", 2199, 26, 8],
  ["Desk Organizer", "DO-008", "Office", 449, 48, 12],
  ["Ergonomic Office Chair", "CH-009", "Office", 11499, 7, 4],
  ["A4 Notebook (Pack of 5)", "NB-010", "Stationery", 325, 120, 30],
  ["Gel Pens (Box of 12)", "GP-011", "Stationery", 180, 90, 25],
  ["LED Desk Lamp", "DL-012", "Home", 749, 31, 10],
  ["Power Bank 20000mAh", "PB-013", "Electronics", 1899, 40, 12],
  ["HDMI Cable 2m", "HC-014", "Accessories", 299, 75, 20],
];
const CUSTOMERS = [
  ["Rahul Nair", "rahul.nair@example.com", "+91 98470 11223", "Kozhikode, Kerala"],
  ["Ananya Stores", "orders@ananyastores.in", "+91 94460 55120", "Nilambur, Kerala"],
  ["Fathima Traders", "fathima@traders.in", "+91 90480 33410", "Malappuram, Kerala"],
  ["Techno Hub", "buy@technohub.in", "+91 99950 77881", "Kochi, Kerala"],
  ["Suresh Kumar", "suresh.k@example.com", "+91 98950 22764", "Thrissur, Kerala"],
  ["Meera Office Supplies", "meera@officesupplies.in", "+91 97450 66012", "Palakkad, Kerala"],
  ["Dr. Arun Menon", "arun.menon@example.com", "+91 94950 18890", "Kannur, Kerala"],
  ["Blue Orbit Solutions", "hello@blueorbit.io", "+91 99610 45217", "Kozhikode, Kerala"],
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Clearing old data...");
  await Promise.all([User, Product, Customer, Order, Counter, StockMovement].map((m) => m.deleteMany({})));

  const admin = await User.create({ name: "Binshad PT", email: "admin@stockpilot.com", password: "Admin@123", role: "admin" });
  await User.create({ name: "Warehouse Staff", email: "staff@stockpilot.com", password: "Staff@123", role: "staff" });

  const products = [];
  for (const [name, sku, category, price, stock, lowStockThreshold] of PRODUCTS) {
    const p = await Product.create({ name, sku, category, price, stock: 0, lowStockThreshold});
    const { movement } = await adjustStock({ productId: p._id, type: "in", quantity: stock + 40, reason: "initial", note: "Opening stock", user: admin });
    await StockMovement.collection.updateOne({ _id: movement._id }, { $set: { createdAt: daysAgo(16) } });
    products.push(p);
  }
  const customers = await Customer.insertMany(CUSTOMERS.map(([name, email, phone, address]) => ({ name, email, phone, address })));

  let made = 0;
  for (let d = 14; d >= 0; d--) {
    const count = d === 0 ? 2 : 1 + Math.floor(rnd() * 3) + (d % 5 === 0 ? 2 : 0);
    // regular supplier deliveries so the stock-in/out chart has both sides
    if (d % 2 === 1) {
      const p = pick(products);
      const { movement } = await adjustStock({ productId: p._id, type: "in", quantity: 15 + Math.floor(rnd() * 35), reason: "purchase", note: "Supplier delivery", user: admin });
      await StockMovement.collection.updateOne({ _id: movement._id }, { $set: { createdAt: daysAgo(d, 8) } });
    }
    for (let i = 0; i < count; i++) {
      const lines = new Map();
      for (let k = 0; k < 1 + Math.floor(rnd() * 3); k++) lines.set(String(pick(products)._id), 1 + Math.floor(rnd() * 4));
      try {
        const order = await createOrder({
          customerId: rnd() > 0.2 ? String(pick(customers)._id) : undefined,
          items: [...lines].map(([productId, quantity]) => ({ productId, quantity })),
          discount: rnd() > 0.8 ? 100 : 0,
          user: admin,
        });
        const when = daysAgo(d, 9 + Math.floor(rnd() * 9));
        await Order.collection.updateOne({ _id: order._id }, { $set: { createdAt: when } }); // raw write: createdAt is immutable in Mongoose
        await StockMovement.collection.updateMany({ order: order._id }, { $set: { createdAt: when } });
        if (d > 0 && rnd() > 0.15) await Order.updateOne({ _id: order._id }, { status: "completed" });
        else if (d > 3 && rnd() > 0.8) await changeStatus(await Order.findById(order._id), "cancelled", admin);
        made++;
      } catch (e) { /* skip lines that ran out of stock */ }
    }
  }

  // A few manual stock movements + make some items deliberately low
  await adjustStock({ productId: products[7]._id, type: "in", quantity: 30, reason: "purchase", note: "Supplier delivery", user: admin });
  await adjustStock({ productId: products[2]._id, type: "out", quantity: 6, reason: "damaged", note: "Damaged in transit", user: admin });
  const lowTargets = [products[2], products[8], products[4]];
  for (const p of lowTargets) {
    const fresh = await Product.findById(p._id);
    const target = Math.max(1, Math.floor(fresh.lowStockThreshold / 2));
    if (fresh.stock > target) await adjustStock({ productId: p._id, type: "out", quantity: fresh.stock - target, reason: "adjustment", note: "Stock count correction", user: admin });
  }

  // keep the manual corrections out of "today" so the charts look natural
  await StockMovement.collection.updateMany({ reason: { $in: ["adjustment", "damaged"] } }, { $set: { createdAt: daysAgo(9, 15) } });

  console.log(`Seeded: ${products.length} products, ${customers.length} customers, ${made} orders`);
  console.log("Login  admin@stockpilot.com / Admin@123   |   staff@stockpilot.com / Staff@123");
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
