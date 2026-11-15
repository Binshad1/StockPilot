const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const ApiError = require("../utils/ApiError");

/**
 * Change a product's stock safely.
 * - "out" uses a conditional update ({ stock: { $gte: qty } }) so two people can never
 *   sell the same last unit (no negative stock, no race condition).
 * - Every change is written to the StockMovement ledger.
 */
const adjustStock = async ({ productId, type, quantity, reason = "other", note = "", user, orderId }) => {
  const delta = type === "in" ? quantity : -quantity;
  const filter = type === "out" ? { _id: productId, stock: { $gte: quantity } } : { _id: productId };

  const product = await Product.findOneAndUpdate(filter, { $inc: { stock: delta } }, { new: true });

  if (!product) {
    const exists = await Product.findById(productId).select("name stock");
    if (!exists) throw new ApiError(404, "Product not found");
    throw new ApiError(409, `Insufficient stock for "${exists.name}". Available: ${exists.stock}, requested: ${quantity}`);
  }

  const movement = await StockMovement.create({
    product: product._id,
    productName: product.name,
    sku: product.sku,
    type,
    quantity,
    balanceAfter: product.stock,
    reason,
    note,
    order: orderId,
    user: user?._id,
    userName: user?.name || "",
  });

  return { product, movement };
};

module.exports = { adjustStock };
