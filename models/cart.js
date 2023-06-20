const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");

const CartSchema = new mongoose.Schema(
  {
    isActive: Boolean,
    lineItems: [
      {
        quantity: {
          type: Number,
          default: 1,
          required: true,
        },
        productId: {
          type: ObjectId,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    totalAmount: {
      type: Number,
      require: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", CartSchema);
