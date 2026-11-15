// Escape user input before using it inside a RegExp (prevents regex injection / ReDoS)
const escapeRegex = (s = "") => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Parse ?page & ?limit safely
const paginate = (query, defaultLimit = 10, maxLimit = 100) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

const pageResult = (data, total, { page, limit }) => ({
  data,
  page,
  limit,
  total,
  pages: Math.max(Math.ceil(total / limit), 1),
});

// Minimal CSV builder (RFC 4180 style escaping)
const toCSV = (headers, rows) => {
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
};

const isObjectId = (v) => /^[a-f\d]{24}$/i.test(String(v));

module.exports = { escapeRegex, paginate, pageResult, toCSV, isObjectId };
