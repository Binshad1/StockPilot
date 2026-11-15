const mongoose = require("mongoose");

// Every change to Product.stock is recorded here (an audit ledger).
const stockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    type: { type: String, enum: ["in", "out"], required: true },
    quantity: { type: Number, required: true, min: 1 },
    balanceAfter: { type: Number, required: true },
    reason: {
      type: String,
      enum: ["purchase", "return", "adjustment", "damaged", "initial", "order", "order-cancelled", "other"],
      default: "other",
    },
    note: { type: String, trim: true, maxlength: 300, default: "" },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: { type: String, default: "" },
  },
  { timestamps: true }
);

stockMovementSchema.index({ createdAt: -1 });

module.exports = mongoose.model("StockMovement", stockMovementSchema);
