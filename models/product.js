const mongoose = require("mongoose");

// Define a schema
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  price: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ["AgarBatti", "Dhoopbatti"],
    required: true,
  },
  flavour: {
    type: String,
    required: true,
  },
  inStock: {
    type: Boolean,
    default: true,
  },
});

// Create a model based on the schema
const Product = mongoose.model("Product", productSchema);
//export Product model
module.exports = Product;
