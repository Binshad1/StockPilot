// OpenAPI 3 description of the StockPilot API. Served as Swagger UI at /api/docs
const ref = (n) => ({ $ref: `#/components/schemas/${n}` });
const json = (schema) => ({ "application/json": { schema } });
const ok = (description, schema) => ({ description, ...(schema ? { content: json(schema) } : {}) });
const errs = (...codes) =>
  Object.fromEntries(
    codes.map((c) => [c, { description: { 400: "Validation error", 401: "Not authenticated", 403: "Not allowed for your role", 404: "Not found", 409: "Conflict (duplicate / insufficient stock / invalid state)" }[c], content: json(ref("Error")) }])
  );
const idParam = { name: "id", in: "path", required: true, schema: { type: "string" } };
const q = (name, description, schema = { type: "string" }) => ({ name, in: "query", description, schema });
const paging = [q("page", "Page number", { type: "integer" }), q("limit", "Items per page (max 100)", { type: "integer" })];
const secured = [{ bearerAuth: [] }];
const body = (schema, multipart) => ({ required: true, content: { [multipart ? "multipart/form-data" : "application/json"]: { schema } } });

module.exports = {
  openapi: "3.0.3",
  info: {
    title: "StockPilot API",
    version: "1.0.0",
    description:
      "Smart Inventory & Order Management REST API.\n\n**Auth:** call `POST /api/auth/login`, copy the `token`, press **Authorize** and paste it.\n\n**Roles:** `admin` = everything. `staff` = view products, adjust stock, manage customers, create orders and mark them completed. Only admins manage products/users, delete customers, cancel orders and see reports.\n\n**Lists** return `{ data, page, limit, total, pages }`. **Errors** always return `{ message, errors? }`.",
  },
  servers: [{ url: "/", description: "This server" }],
  tags: ["Auth", "Users", "Products", "Inventory", "Customers", "Orders", "Dashboard", "Reports"].map((name) => ({ name })),
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      Error: { type: "object", properties: { message: { type: "string" }, errors: { type: "array", items: { type: "object", properties: { field: { type: "string" }, message: { type: "string" } } } } } },
      User: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, email: { type: "string" }, role: { type: "string", enum: ["admin", "staff"] }, isActive: { type: "boolean" } } },
      Product: { type: "object", properties: { _id: { type: "string" }, name: { type: "string" }, sku: { type: "string" }, category: { type: "string" }, description: { type: "string" }, price: { type: "number" }, stock: { type: "integer" }, lowStockThreshold: { type: "integer" }, image: { type: "string", example: "/uploads/123.jpg" }, status: { type: "string", enum: ["ok", "low", "out"] } } },
      Customer: { type: "object", properties: { _id: { type: "string" }, name: { type: "string" }, email: { type: "string" }, phone: { type: "string" }, address: { type: "string" }, notes: { type: "string" }, orders: { type: "integer" }, totalSpent: { type: "number" } } },
      OrderItem: { type: "object", properties: { product: { type: "string" }, name: { type: "string" }, sku: { type: "string" }, price: { type: "number" }, quantity: { type: "integer" } } },
      Order: { type: "object", properties: { _id: { type: "string" }, orderNumber: { type: "string", example: "ORD-1001" }, customer: { type: "string", nullable: true }, customerName: { type: "string" }, items: { type: "array", items: ref("OrderItem") }, subtotal: { type: "number" }, discount: { type: "number" }, total: { type: "number" }, status: { type: "string", enum: ["pending", "completed", "cancelled"] }, createdAt: { type: "string", format: "date-time" } } },
      StockMovement: { type: "object", properties: { _id: { type: "string" }, productName: { type: "string" }, sku: { type: "string" }, type: { type: "string", enum: ["in", "out"] }, quantity: { type: "integer" }, balanceAfter: { type: "integer" }, reason: { type: "string" }, note: { type: "string" }, userName: { type: "string" }, createdAt: { type: "string", format: "date-time" } } },
      Page: { type: "object", properties: { data: { type: "array", items: {} }, page: { type: "integer" }, limit: { type: "integer" }, total: { type: "integer" }, pages: { type: "integer" } } },
      AuthResponse: { type: "object", properties: { message: { type: "string" }, token: { type: "string" }, user: ref("User") } },
    },
  },
  paths: {
    "/api/auth/register": { post: { tags: ["Auth"], summary: "Register (creates a staff user; the very first user becomes admin)", requestBody: body({ type: "object", required: ["name", "email", "password"], properties: { name: { type: "string" }, email: { type: "string" }, password: { type: "string", minLength: 8 } } }), responses: { 201: ok("Created", ref("AuthResponse")), ...errs(400, 409) } } },
    "/api/auth/login": { post: { tags: ["Auth"], summary: "Login", requestBody: body({ type: "object", required: ["email", "password"], properties: { email: { type: "string", example: "admin@stockpilot.com" }, password: { type: "string", example: "Admin@123" } } }), responses: { 200: ok("OK", ref("AuthResponse")), ...errs(400, 401) } } },
    "/api/auth/logout": { post: { tags: ["Auth"], summary: "Logout (client discards the token)", security: secured, responses: { 200: ok("Logged out"), ...errs(401) } } },
    "/api/auth/me": { get: { tags: ["Auth"], summary: "Current user", security: secured, responses: { 200: ok("OK", { type: "object", properties: { user: ref("User") } }), ...errs(401) } } },
    "/api/auth/password": { put: { tags: ["Auth"], summary: "Change my password", security: secured, requestBody: body({ type: "object", properties: { currentPassword: { type: "string" }, newPassword: { type: "string" } } }), responses: { 200: ok("Updated"), ...errs(400, 401) } } },

    "/api/users": {
      get: { tags: ["Users"], summary: "List users (admin)", security: secured, responses: { 200: ok("OK", { type: "array", items: ref("User") }), ...errs(401, 403) } },
      post: { tags: ["Users"], summary: "Create a user with a role (admin)", security: secured, requestBody: body({ type: "object", properties: { name: { type: "string" }, email: { type: "string" }, password: { type: "string" }, role: { type: "string", enum: ["admin", "staff"] } } }), responses: { 201: ok("Created", ref("User")), ...errs(400, 401, 403, 409) } },
    },
    "/api/users/{id}": { patch: { tags: ["Users"], summary: "Change name / role / active flag (admin)", security: secured, parameters: [idParam], requestBody: body({ type: "object", properties: { name: { type: "string" }, role: { type: "string" }, isActive: { type: "boolean" } } }), responses: { 200: ok("OK", ref("User")), ...errs(400, 401, 403, 404) } } },

    "/api/products": {
      get: { tags: ["Products"], summary: "List / search products", security: secured, parameters: [q("q", "Search name, SKU or category"), q("category", "Exact category"), q("status", "ok | low | out"), ...paging], responses: { 200: ok("Paged products", ref("Page")), ...errs(401) } },
      post: { tags: ["Products"], summary: "Add product (admin). Opening stock is logged in the ledger.", security: secured, requestBody: body({ type: "object", required: ["name", "sku", "category", "price"], properties: { name: { type: "string" }, sku: { type: "string" }, category: { type: "string" }, description: { type: "string" }, price: { type: "number" }, stock: { type: "integer" }, lowStockThreshold: { type: "integer" }, image: { type: "string", format: "binary" } } }, true), responses: { 201: ok("Created", ref("Product")), ...errs(400, 401, 403, 409) } },
    },
    "/api/products/categories": { get: { tags: ["Products"], summary: "Distinct categories", security: secured, responses: { 200: ok("OK", { type: "array", items: { type: "string" } }) } } },
    "/api/products/{id}": {
      get: { tags: ["Products"], summary: "Get product", security: secured, parameters: [idParam], responses: { 200: ok("OK", ref("Product")), ...errs(401, 404) } },
      put: { tags: ["Products"], summary: "Edit product (admin). Stock is changed via /api/inventory only.", security: secured, parameters: [idParam], requestBody: body({ type: "object", properties: { name: { type: "string" }, sku: { type: "string" }, category: { type: "string" }, price: { type: "number" }, lowStockThreshold: { type: "integer" }, image: { type: "string", format: "binary" } } }, true), responses: { 200: ok("OK", ref("Product")), ...errs(400, 401, 403, 404, 409) } },
      delete: { tags: ["Products"], summary: "Delete product (admin)", security: secured, parameters: [idParam], responses: { 200: ok("Deleted"), ...errs(401, 403, 404) } },
    },

    "/api/inventory/stock-in": { post: { tags: ["Inventory"], summary: "Add stock", security: secured, requestBody: body({ type: "object", required: ["productId", "quantity"], properties: { productId: { type: "string" }, quantity: { type: "integer", minimum: 1 }, reason: { type: "string", enum: ["purchase", "return", "adjustment", "other"] }, note: { type: "string" } } }), responses: { 201: ok("OK"), ...errs(400, 401, 404) } } },
    "/api/inventory/stock-out": { post: { tags: ["Inventory"], summary: "Remove stock (cannot go below zero)", security: secured, requestBody: body({ type: "object", required: ["productId", "quantity"], properties: { productId: { type: "string" }, quantity: { type: "integer", minimum: 1 }, reason: { type: "string", enum: ["damaged", "adjustment", "other"] }, note: { type: "string" } } }), responses: { 201: ok("OK"), ...errs(400, 401, 404, 409) } } },
    "/api/inventory/low-stock": { get: { tags: ["Inventory"], summary: "Products at or below their alert level", security: secured, responses: { 200: ok("OK", { type: "array", items: ref("Product") }), ...errs(401) } } },
    "/api/inventory/movements": { get: { tags: ["Inventory"], summary: "Stock movement history", security: secured, parameters: [q("type", "in | out"), q("product", "Product id"), q("q", "Search name / SKU"), q("from", "YYYY-MM-DD"), q("to", "YYYY-MM-DD"), ...paging], responses: { 200: ok("Paged movements", ref("Page")), ...errs(401) } } },

    "/api/customers": {
      get: { tags: ["Customers"], summary: "List / search customers (with order count and total spent)", security: secured, parameters: [q("q", "Search name, email or phone"), ...paging], responses: { 200: ok("Paged customers", ref("Page")), ...errs(401) } },
      post: { tags: ["Customers"], summary: "Add customer", security: secured, requestBody: body(ref("Customer")), responses: { 201: ok("Created", ref("Customer")), ...errs(400, 401) } },
    },
    "/api/customers/{id}": {
      get: { tags: ["Customers"], summary: "Customer with recent orders", security: secured, parameters: [idParam], responses: { 200: ok("OK", ref("Customer")), ...errs(401, 404) } },
      put: { tags: ["Customers"], summary: "Edit customer", security: secured, parameters: [idParam], requestBody: body(ref("Customer")), responses: { 200: ok("OK", ref("Customer")), ...errs(400, 401, 404) } },
      delete: { tags: ["Customers"], summary: "Delete customer (admin, only if they have no orders)", security: secured, parameters: [idParam], responses: { 200: ok("Deleted"), ...errs(401, 403, 404, 409) } },
    },

    "/api/orders": {
      get: { tags: ["Orders"], summary: "List orders", security: secured, parameters: [q("status", "pending | completed | cancelled"), q("q", "Order number or customer name"), q("customer", "Customer id"), q("from", "YYYY-MM-DD"), q("to", "YYYY-MM-DD"), ...paging], responses: { 200: ok("Paged orders", ref("Page")), ...errs(401) } },
      post: { tags: ["Orders"], summary: "Create order — stock is deducted automatically; everything is rolled back if any item lacks stock", security: secured, requestBody: body({ type: "object", required: ["items"], properties: { customerId: { type: "string" }, items: { type: "array", items: { type: "object", properties: { productId: { type: "string" }, quantity: { type: "integer" } } } }, discount: { type: "number" }, notes: { type: "string" } } }), responses: { 201: ok("Created", ref("Order")), ...errs(400, 401, 404, 409) } },
    },
    "/api/orders/{id}": { get: { tags: ["Orders"], summary: "Get order", security: secured, parameters: [idParam], responses: { 200: ok("OK", ref("Order")), ...errs(401, 404) } } },
    "/api/orders/{id}/status": { patch: { tags: ["Orders"], summary: "Mark completed, or cancel (admin only — stock is returned)", security: secured, parameters: [idParam], requestBody: body({ type: "object", properties: { status: { type: "string", enum: ["completed", "cancelled"] } } }), responses: { 200: ok("OK", ref("Order")), ...errs(400, 401, 403, 404, 409) } } },

    "/api/dashboard": { get: { tags: ["Dashboard"], summary: "Totals, 7-day sales and stock movement, top products, low stock, recent activity", security: secured, responses: { 200: ok("OK"), ...errs(401) } } },
    "/api/reports/sales": { get: { tags: ["Reports"], summary: "Sales report (admin). Add format=csv to download", security: secured, parameters: [q("from", "YYYY-MM-DD (default: 30 days ago)"), q("to", "YYYY-MM-DD"), q("format", "json | csv")], responses: { 200: ok("OK"), ...errs(401, 403) } } },
    "/api/reports/inventory": { get: { tags: ["Reports"], summary: "Inventory valuation report (admin). Add format=csv to download", security: secured, parameters: [q("format", "json | csv")], responses: { 200: ok("OK"), ...errs(401, 403) } } },
  },
};
