// Integration tests. Needs a MongoDB: set TEST_MONGO_URI (default: local mongod).
// Run: npm test
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret";
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const app = require("../app");
let server, base;
const tokens = {};

const call = async (method, path, { token, body, form } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(base + path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  const type = res.headers.get("content-type") || "";
  const data = type.includes("json") ? await res.json() : await res.text();
  return { status: res.status, data };
};

before(async () => {
  await mongoose.connect(process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27018/stockpilot_test");
  await mongoose.connection.dropDatabase();
  await new Promise((r) => (server = app.listen(0, r)));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});

const makeProduct = async (over = {}) => {
  const f = new FormData();
  const p = { name: "Test Item", sku: "T-" + Math.random().toString(36).slice(2, 8), category: "Test", price: 100, stock: 10, lowStockThreshold: 3, ...over };
  Object.entries(p).forEach(([k, v]) => f.append(k, v));
  return call("POST", "/api/products", { token: tokens.admin, form: f });
};

test("health", async () => {
  const r = await call("GET", "/api/health");
  assert.equal(r.status, 200);
  assert.equal(r.data.database, "Connected");
});

test("auth: first user is admin, next is staff; validation & login", async () => {
  let r = await call("POST", "/api/auth/register", { body: { name: "Admin", email: "a@x.com", password: "Passw0rd!" } });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.role, "admin");
  tokens.admin = r.data.token;

  r = await call("POST", "/api/auth/register", { body: { name: "Staffer", email: "s@x.com", password: "Passw0rd!" } });
  assert.equal(r.data.user.role, "staff");
  tokens.staff = r.data.token;

  r = await call("POST", "/api/auth/register", { body: { name: "X", email: "bad", password: "123" } });
  assert.equal(r.status, 400);
  r = await call("POST", "/api/auth/register", { body: { name: "Admin", email: "a@x.com", password: "Passw0rd!" } });
  assert.equal(r.status, 409);
  r = await call("POST", "/api/auth/login", { body: { email: "a@x.com", password: "wrong-pass" } });
  assert.equal(r.status, 401);
  r = await call("POST", "/api/auth/login", { body: { email: "a@x.com", password: "Passw0rd!" } });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.password, undefined);
});

test("protected routes need a token", async () => {
  assert.equal((await call("GET", "/api/products")).status, 401);
  assert.equal((await call("GET", "/api/products", { token: "garbage" })).status, 401);
});

test("RBAC: staff cannot create/delete products, list users or see reports", async () => {
  const f = new FormData();
  ["name", "sku", "category", "price"].forEach((k) => f.append(k, "1"));
  assert.equal((await call("POST", "/api/products", { token: tokens.staff, form: f })).status, 403);
  assert.equal((await call("GET", "/api/users", { token: tokens.staff })).status, 403);
  assert.equal((await call("GET", "/api/reports/sales", { token: tokens.staff })).status, 403);
  assert.equal((await call("GET", "/api/users", { token: tokens.admin })).status, 200);
});

test("products: create (with opening-stock ledger), validate, duplicate SKU, search, no regex injection", async () => {
  let r = await makeProduct({ name: "Alpha Widget", sku: "alpha-1", stock: 12 });
  assert.equal(r.status, 201);
  assert.equal(r.data.sku, "ALPHA-1");
  assert.equal(r.data.stock, 12);
  assert.equal(r.data.status, "ok");

  r = await makeProduct({ sku: "ALPHA-1" });
  assert.equal(r.status, 409);
  r = await makeProduct({ price: -5 });
  assert.equal(r.status, 400);
  r = await makeProduct({ name: "" });
  assert.equal(r.status, 400);

  r = await call("GET", "/api/products?q=alpha", { token: tokens.staff });
  assert.equal(r.data.total, 1);
  r = await call("GET", "/api/products?q=" + encodeURIComponent("(.*"), { token: tokens.staff });
  assert.equal(r.status, 200); // would be a 500 if the regex were not escaped

  const m = await call("GET", "/api/inventory/movements?q=alpha", { token: tokens.staff });
  assert.equal(m.data.data[0].reason, "initial");
});

test("inventory: stock-in / stock-out, never negative, ledger balance", async () => {
  const p = (await makeProduct({ stock: 5, lowStockThreshold: 2 })).data;
  let r = await call("POST", "/api/inventory/stock-in", { token: tokens.staff, body: { productId: p._id, quantity: 10 } });
  assert.equal(r.status, 201);
  assert.equal(r.data.product.stock, 15);
  assert.equal(r.data.movement.balanceAfter, 15);

  r = await call("POST", "/api/inventory/stock-out", { token: tokens.staff, body: { productId: p._id, quantity: 100 } });
  assert.equal(r.status, 409);
  r = await call("POST", "/api/inventory/stock-out", { token: tokens.staff, body: { productId: p._id, quantity: 14 } });
  assert.equal(r.data.product.stock, 1);
  r = await call("POST", "/api/inventory/stock-in", { token: tokens.staff, body: { productId: p._id, quantity: 0 } });
  assert.equal(r.status, 400);

  r = await call("GET", "/api/inventory/low-stock", { token: tokens.staff });
  assert.ok(r.data.some((x) => x._id === p._id));
});

test("customers: CRUD, validation, delete rules", async () => {
  let r = await call("POST", "/api/customers", { token: tokens.staff, body: { name: "Rahul", email: "r@x.com", phone: "+91 98470 11223" } });
  assert.equal(r.status, 201);
  tokens.cust = r.data._id;
  r = await call("POST", "/api/customers", { token: tokens.staff, body: { name: "R" } });
  assert.equal(r.status, 400);
  r = await call("PUT", `/api/customers/${tokens.cust}`, { token: tokens.staff, body: { name: "Rahul N", phone: "9847011223" } });
  assert.equal(r.data.name, "Rahul N");
  assert.equal((await call("DELETE", `/api/customers/${tokens.cust}`, { token: tokens.staff })).status, 403);
});

test("orders: create deducts stock, price from DB, atomic rollback, cancel restores stock", async () => {
  const a = (await makeProduct({ price: 100, stock: 10 })).data;
  const b = (await makeProduct({ price: 250, stock: 2 })).data;

  let r = await call("POST", "/api/orders", {
    token: tokens.staff,
    body: { customerId: tokens.cust, items: [{ productId: a._id, quantity: 3 }, { productId: b._id, quantity: 1 }], discount: 50 },
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.subtotal, 550);
  assert.equal(r.data.total, 500);
  assert.match(r.data.orderNumber, /^ORD-\d+$/);
  const order = r.data;

  const stock = async (id) => (await call("GET", `/api/products/${id}`, { token: tokens.staff })).data.stock;
  assert.equal(await stock(a._id), 7);
  assert.equal(await stock(b._id), 1);

  // second line can't be satisfied -> first line must be rolled back
  r = await call("POST", "/api/orders", { token: tokens.staff, body: { items: [{ productId: a._id, quantity: 2 }, { productId: b._id, quantity: 5 }] } });
  assert.equal(r.status, 409);
  assert.equal(await stock(a._id), 7, "stock of first item must be restored");
  assert.equal(await stock(b._id), 1);

  r = await call("POST", "/api/orders", { token: tokens.staff, body: { items: [] } });
  assert.equal(r.status, 400);
  r = await call("POST", "/api/orders", { token: tokens.staff, body: { items: [{ productId: a._id, quantity: 1 }], discount: 9999 } });
  assert.equal(r.status, 400);

  // staff can complete, only admin can cancel
  assert.equal((await call("PATCH", `/api/orders/${order._id}/status`, { token: tokens.staff, body: { status: "cancelled" } })).status, 403);
  r = await call("PATCH", `/api/orders/${order._id}/status`, { token: tokens.staff, body: { status: "completed" } });
  assert.equal(r.data.status, "completed");
  r = await call("PATCH", `/api/orders/${order._id}/status`, { token: tokens.admin, body: { status: "cancelled" } });
  assert.equal(r.data.status, "cancelled");
  assert.equal(await stock(a._id), 10, "cancel returns stock");
  assert.equal(await stock(b._id), 2);
  assert.equal((await call("PATCH", `/api/orders/${order._id}/status`, { token: tokens.admin, body: { status: "completed" } })).status, 409);

  // customer with orders cannot be deleted
  assert.equal((await call("DELETE", `/api/customers/${tokens.cust}`, { token: tokens.admin })).status, 409);
});

test("concurrent orders never oversell the last units", async () => {
  const p = (await makeProduct({ stock: 5 })).data;
  const results = await Promise.all(
    Array.from({ length: 8 }, () => call("POST", "/api/orders", { token: tokens.staff, body: { items: [{ productId: p._id, quantity: 1 }] } }))
  );
  assert.equal(results.filter((x) => x.status === 201).length, 5);
  assert.equal(results.filter((x) => x.status === 409).length, 3);
  assert.equal((await call("GET", `/api/products/${p._id}`, { token: tokens.staff })).data.stock, 0);
});

test("dashboard + reports", async () => {
  let r = await call("GET", "/api/dashboard", { token: tokens.staff });
  assert.equal(r.status, 200);
  assert.equal(r.data.sales.length, 7);
  assert.ok(r.data.totals.products >= 4);
  assert.ok(r.data.totals.revenueTotal > 0);

  r = await call("GET", "/api/reports/sales", { token: tokens.admin });
  assert.equal(r.status, 200);
  assert.ok(r.data.summary.orders >= 1);
  r = await call("GET", "/api/reports/sales?format=csv", { token: tokens.admin });
  assert.ok(r.data.startsWith("Order,Date"));
  r = await call("GET", "/api/reports/inventory", { token: tokens.admin });
  assert.ok(r.data.summary.products >= 4);
  r = await call("GET", "/api/reports/inventory?format=csv", { token: tokens.admin });
  assert.ok(r.data.startsWith("Name,SKU"));
});

test("users admin: cannot disable self; disabled user is locked out", async () => {
  const list = (await call("GET", "/api/users", { token: tokens.admin })).data;
  const admin = list.find((u) => u.email === "a@x.com");
  const staff = list.find((u) => u.email === "s@x.com");
  assert.equal((await call("PATCH", `/api/users/${admin.id}`, { token: tokens.admin, body: { isActive: false } })).status, 400);
  await call("PATCH", `/api/users/${staff.id}`, { token: tokens.admin, body: { isActive: false } });
  assert.equal((await call("GET", "/api/products", { token: tokens.staff })).status, 401);
});

test("unknown route and bad ids return clean JSON errors", async () => {
  let r = await call("GET", "/api/nope");
  assert.equal(r.status, 404);
  r = await call("GET", "/api/products/not-an-id", { token: tokens.admin });
  assert.equal(r.status, 400);
});
