const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
    image: { type: String, default: "" },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

productSchema.virtual("status").get(function () {
  if (this.stock <= 0) return "out";
  if (this.stock <= this.lowStockThreshold) return "low";
  return "ok";
});

productSchema.index({ name: 1 });
productSchema.index({ category: 1 });

module.exports = mongoose.model("Product", productSchema);
