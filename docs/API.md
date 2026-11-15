# API reference

**Interactive docs (Swagger UI): `<API URL>/api/docs`** · raw OpenAPI JSON: `<API URL>/api/openapi.json`

Base URL (local): `http://localhost:5000` · All routes are under `/api`. Send `Authorization: Bearer <token>` on everything except register/login/health.

- **Lists** return `{ data: [...], page, limit, total, pages }` and accept `?page=&limit=`.
- **Errors** always return `{ "message": "...", "errors": [{ "field": "...", "message": "..." }] }` with a proper status code
  (400 validation · 401 not signed in · 403 role not allowed · 404 not found · 409 conflict e.g. duplicate SKU / not enough stock).

**Roles** — `admin`: everything. `staff`: view products, adjust stock, manage customers, create orders, mark orders completed.

| Method & path | Who | What |
|---|---|---|
| `GET /api/health` | public | API + database status |
| `POST /api/auth/register` | public | Create account (always `staff`; the very first account in an empty DB becomes `admin`) |
| `POST /api/auth/login` | public | Returns `{ token, user }` |
| `POST /api/auth/logout` | any | Sign out (client discards the token) |
| `GET /api/auth/me` | any | Current user |
| `PUT /api/auth/password` | any | Change own password |
| `GET /api/users` | admin | List users |
| `POST /api/users` | admin | Create user with a role |
| `PATCH /api/users/:id` | admin | Change name / role / active (cannot demote or disable yourself) |
| `GET /api/products?q=&category=&status=ok\|low\|out&page=&limit=` | any | List + search products |
| `GET /api/products/categories` | any | Distinct categories |
| `GET /api/products/:id` | any | One product |
| `POST /api/products` | admin | Add product (`multipart/form-data` with optional `image`, or JSON). Opening stock is logged in the ledger |
| `PUT /api/products/:id` | admin | Edit product (stock is **not** editable here) |
| `DELETE /api/products/:id` | admin | Delete product |
| `POST /api/inventory/stock-in` | any | `{ productId, quantity, reason, note }` |
| `POST /api/inventory/stock-out` | any | Same body. 409 if it would go below zero |
| `GET /api/inventory/low-stock` | any | Products at or below their alert level |
| `GET /api/inventory/movements?type=&product=&q=&from=&to=` | any | Stock ledger |
| `GET /api/customers?q=` / `GET /api/customers/:id` | any | List (with orders & total spent) / detail with recent orders |
| `POST /api/customers` · `PUT /api/customers/:id` | any | Add / edit |
| `DELETE /api/customers/:id` | admin | Delete (409 if they have orders) |
| `GET /api/orders?status=&q=&customer=&from=&to=` · `GET /api/orders/:id` | any | List / detail |
| `POST /api/orders` | any | `{ customerId?, items: [{ productId, quantity }], discount?, notes? }` — deducts stock, all-or-nothing |
| `PATCH /api/orders/:id/status` | any / admin | `{ status: "completed" \| "cancelled" }` — cancelling is admin-only and returns stock |
| `GET /api/dashboard` | any | Totals, 7-day sales & stock movement, top products, low stock, recent activity |
| `GET /api/reports/sales?from=&to=&format=csv` | admin | Sales report (JSON or CSV) |
| `GET /api/reports/inventory?format=csv` | admin | Inventory valuation report (JSON or CSV) |

### Example

```bash
# login
curl -s -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@stockpilot.com","password":"Admin@123"}'

# create an order (stock is deducted automatically)
curl -s -X POST http://localhost:5000/api/orders -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"items":[{"productId":"<id>","quantity":2}],"discount":0}'
```
