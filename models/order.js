const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  address: {
    type: String,
    required: true,
  },
  cartId: {
    type: ObjectId,
    required: true,
  },
  status: {
    type: String,
    enum: ["Open", "Paid", "Cancelled", "Shipped", "Delivered", "Packed"],
    required: true,
  },
  modeOfPayment: {
    type: String,
    enum: ["CashOnDelivery", "Card", "UPI"],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  paymentId: {
    type: String,
    unique: true,
  },
  productIds: [{ type: ObjectId }],
  amountReceived: { type: Boolean, default: false },
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
