require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bodyParser = require("body-parser"); // for parsing
const ProductModel = require("./models/product"); // import model
const cartModel = require("./models/cart");
const orderModel = require("./models/order");
const Razorpay = require("razorpay");

const razorPayInstance = new Razorpay({
  key_id: "rzp_test_fs0NdO7p6bY2XZ",
  key_secret: "XUoyNyAyyYfrH4vbOIVSNCFW",
});

const app = express();

//Connect to mongo
mongoose
  .connect("mongodb://127.0.0.1:27017/ecommerce", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // useCreateIndex: true,
  })
  .then(() => {
    console.log("CONNECTED TO DATABASE");
  });

//middlewares
app.set("public", path.join(__dirname, "public"));
app.use(express.json()); // Middleware for parsing JSON bodies
app.use(express.urlencoded({ extended: true })); // Middleware for parsing URL-encoded bodies

// Crud operations

//------------- product page
// Define your routes here
app.post("/Product", async (req, res) => {
  try {
    // We will be coding here
    const product = req.body; // request from frontend
    const productSaved = await ProductModel.create(product); // create document in product model collection main
    if (productSaved) {
      // check karenge product create hua ki nhi
      return res.json({ message: "Product added", data: productSaved });
    }
  } catch (error) {
    console.error(error.message);
    if (error.code === 11000) {
      //11000 is alery given a code for if product exits then directly check code
      return res.json({ message: "Product already exits" });
    }
    return res.json("Something went wrong");
  }
});

//get data from mongo
app.get("/Product/:name", async (req, res) => {
  try {
    console.log(req.params); // konsa product req kar rahe hain vo params main lenge
    const productFound = await ProductModel.findOne(req.params); // collection main produxt ko find karenge
    if (productFound) {
      return res.json({ message: "Success", data: productFound });
    }
  } catch (error) {
    console.error(error.message);
    return res.json("Something went wrong");
  }
});

//update data in mongodb
app.put("/product", async (req, res) => {
  try {
    const product = req.body;
    const productUpdate = await ProductModel.findOneAndUpdate(
      { name: product.name },
      product,
      { new: true }
    );
    if (productUpdate) {
      return res.json({
        message: "Success ",
        data: productUpdate,
      });
    } else {
      return res.json({
        message: `No product found with name ${product.name}`,
      });
    }
  } catch (error) {
    console.error(error.message);
    return res.json("Product is not updated");
  }
});

app.delete("/product", async (req, res) => {
  try {
    const product = req.body;
    const productDelete = await ProductModel.deleteOne({ name: product.name });
    if (productDelete.deletedCount) {
      return res.json({ message: "Success" });
    } else {
      return res.json({
        message: `No product found with name ${product.name}`,
      });
    }
  } catch (error) {
    console.log(error.message);
    return res.json({ message: "Product is not deleted" });
  }
});

//List of all products
app.get("/Products", async (req, res) => {
  try {
    console.log(req.params);
    const productFound = await ProductModel.aggregate([
      // aggregate for using multiple function in single query
      {
        $facet: {
          //facet for giving output seperatel
          products: [
            { $match: {} }, // Empty match to retrieve all documents
            { $limit: 3 }, // retrieve only 3 documents
          ],
          count: [
            { $count: "Total Products" }, // Count the number of documents
          ],
        },
      },
    ]);
    if (productFound) {
      return res.json({ message: "Success", data: productFound });
    }
  } catch (error) {
    console.error(error.message);
    return res.json("Something went wrong");
  }
});

// ---------cart page

//add data in lineItems(cart)
app.post("/cart", async (req, res) => {
  try {
    const cart = req.body; // fetch from from frontend
    const productDetail = await ProductModel.findOne({ name: cart.name }); // find cart name in productModel
    if (productDetail.inStock) {
      // check product is in stock or not
      const totalAmount = parseInt(cart.quantity) * productDetail.price; // calculate totalAmmount
      cart.totalAmount = totalAmount; //add toatalAmmount in cart
      cart.lineItems = [
        {
          quantity: cart.quantity,
          productId: productDetail._id,
          price: productDetail.price,
        },
      ]; // add quantity and name in cart
      const cartSaved = await cartModel.create(cart); // create collection in cart database
      return res.json({ message: "Product added in cart", data: cartSaved }); // return respose of cart data
    } else {
      return res.json({ message: "Product is out of stock" });
    }
  } catch (error) {
    console.error(error.message);
    return res.json({ message: "Something went wrong" });
  }
});

//update cart
app.put("/cart/:_id", async (req, res) => {
  try {
    const cart = req.body;
    const cartId = req.params;
    const cartDetail = await cartModel.findOne({ _id: cartId });
    const productDetail = await ProductModel.findOne({ name: cart.name });
    if (!cartDetail) {
      return res.json({ message: "Product does not exist" });
    }
    if (!productDetail) {
      return res.json({ message: "Product does not exist" });
    }
    const limeItemfound = cartDetail.lineItems.find(
      (lime) => lime.productId.toString() === productDetail._id.toString()
    );
    if (limeItemfound) {
      limeItemfound.quantity += parseInt(cart.quantity);
    } else {
      cartDetail.lineItems.push({
        quantity: cart.quantity,
        productId: productDetail._id,
        price: productDetail.price,
      });
    }
    cartDetail.totalAmount += cart.quantity * productDetail.price;
    const cartUpdate = await cartModel.findOneAndUpdate(
      { _id: cartDetail._id },
      cartDetail,
      { new: true }
    );
    return res.json({ message: "Success", data: cartUpdate });
  } catch (error) {
    console.error(error.message);
    return res.send({ message: "Not Success" });
  }
});

//delete the cart
app.delete("/cart/:id", async (req, res) => {
  try {
    const cart = req.body;
    const cartId = req.params;
    const cartDetail = await cartModel.findOne({ _id: cartId.id });
    const productDetail = await ProductModel.findOne({ name: cart.name });
    if (cartDetail) {
      const limeItemfound = await cartDetail.lineItems.find(
        (lime) => lime.productId.toString() === productDetail._id.toString()
      );
      if (!limeItemfound) {
        return res.json({ message: "this product is not found" });
      } else {
        const cartDelete = await cartModel.updateOne(
          { _id: cartDetail._id },
          { $pull: { lineItems: { productId: limeItemfound.productId } } }
        );
        return res.json({ message: "Success", data: cartDelete });
      }
    } else {
      return res.json({
        message: `No product found with name ${product.name}`,
      });
    }
  } catch (error) {
    console.error(error.message);
    return res.json({ message: "Not Success" });
  }
});

//get cart details
app.get("/cart/:id", async (req, res) => {
  try {
    const cartId = req.params.id;
    const cartDetails = await cartModel.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(cartId), // Replace with the specific cart _id you want to retrieve
        },
      },
      {
        $unwind: "$lineItems",
      },
      {
        $lookup: {
          from: "products",
          localField: "lineItems.productId",
          foreignField: "_id",
          as: "lineItems.product",
        },
      },
      {
        $group: {
          _id: "$_id",
          lineItems: { $push: "$lineItems" },
          totalAmount: { $first: "$totalAmount" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          __v: { $first: "$__v" },
        },
      },
    ]);
    if (!cartDetails) {
      return res.json({ message: "This cart does not exist" });
    }
    return res.json({ message: "Success", data: cartDetails });
  } catch (error) {
    console.error(error.message);
    return res.json({ message: "Not Success" });
  }
});

//----order page

app.post("/order/:id", async (req, res) => {
  try {
    const order = req.body;
    const cartId = req.params.id;
    const cartDetails = await cartModel.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(cartId), // Replace with the specific cart _id you want to retrieve
        },
      },
    ]);
    if (!cartDetails) {
      return res.json({ message: "This cart does not exist" });
    }
    let orderToBeSave = { productIds: [] };
    cartDetails[0].lineItems.map((lineItem) => {
      orderToBeSave.productIds.push(lineItem.productId);
    });
    orderToBeSave.address = order.address;
    if (order.modeOfPayment == order.modeOfPayment.CashOnDelivery) {
      orderToBeSave.amountReceived = false;
    }
    orderToBeSave.amountReceived = true;
    orderToBeSave.modeOfPayment = order.modeOfPayment;
    orderToBeSave.status = "Open";
    orderToBeSave.amount = cartDetails[0].totalAmount;
    // Validate the mode of payment
    if (order.modeOfPayment == "Card" || order.modeOfPayment == "UPI") {
      const razorPayOrder = await razorPayInstance.orders.create({
        amount: orderToBeSave.amount * 100, // Razorpay amount should be in paise (multiply by 100)
        currency: "INR",
        receipt: `order_${cartId}`,
      });
      if (razorPayOrder.status === "created") {
        orderToBeSave.paymentId = razorPayOrder.id;
      }
    }
    orderToBeSave.cartId = cartId;
    const orderSaved = await orderModel.create(orderToBeSave);
    if (orderSaved) {
      return res.json({
        message: "Success",
        data: orderSaved,
      });
    }
    // res.json({
    //   orderId: razorpayOrder.id,
    //   amount: razorpayOrder.amount,
    //   currency: razorpayOrder.currency,
    //   receipt: razorpayOrder.receipt,
    //   razorpayKeyId: razorpay.key_id,
    // });
  } catch (error) {
    console.log(error.message);
    return res.json({ message: "Error occured while saving Order." });
  }
});

//update order
app.put("/order/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    const updatedOrder = req.body;

    // Find the order by ID
    const existingOrder = await orderModel.findById(orderId);

    if (!existingOrder) {
      return res.json({ message: "Order not found" });
    }

    // Update the order fields
    existingOrder.address = updatedOrder.address;
    existingOrder.modeOfPayment = updatedOrder.modeOfPayment;
    existingOrder.cartId = orderId;

    // Update amountReceived based on modeOfPayment
    if (
      updatedOrder.modeOfPayment === "Card" ||
      updatedOrder.modeOfPayment === "UPI"
    ) {
      existingOrder.amountReceived = true;
    } else {
      existingOrder.amountReceived = false;
    }

    // Save the updated order
    const updatedOrderData = await existingOrder.save();

    return res.json({
      message: "Order updated successfully",
      data: updatedOrderData,
    });
  } catch (error) {
    console.log(error.message);
    return res.json({ message: "Error occurred while updating order" });
  }
});

//delete order
app.delete("/order/:id", async (req, res) => {
  try {
    const orderId = req.params.id;

    // Find the order by ID
    const existingOrder = await orderModel.findById(orderId);

    if (!existingOrder) {
      return res.json({ message: "Order not found" });
    }

    // Check if the order is delivered and amountReceived is true
    if (existingOrder.status !== "Delivered" || !existingOrder.amountReceived) {
      return res.json({ message: "Order cannot be deleted" });
    }
    if (existingOrder.status !== "Delivered" || existingOrder.amountReceived) {
      return res.json({ message: "Order cannot be deleted" });
    }

    // Remove the order
    const deletedOrder = await orderModel.findByIdAndRemove(orderId);

    return res.json({
      message: "Order deleted successfully",
      data: deletedOrder,
    });
  } catch (error) {
    console.log(error.message);
    return res.json({ message: "Error occurred while deleting order" });
  }
});

//order get
app.get("/order/:id", async (req, res) => {
  try {
    const orderId = req.params.id;

    // Find the order by ID
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.json({ message: "Order not found" });
    }

    return res.json({
      message: "Order retrieved successfully",
      data: order,
    });
  } catch (error) {
    console.log(error.message);
    return res.json({ message: "Error occurred while fetching order" });
  }
});

//get all order list
app.get("/orders", async (req, res) => {
  try {
    console.log(req.params);
    const orderFound = await orderModel.aggregate([
      // aggregate for using multiple function in single query
      {
        $facet: {
          orders: [
            { $match: {} }, // Empty match to retrieve all documents
            // { $limit: 3 }, // retrieve only 3 documents
          ],
          count: [
            { $count: "Total Orders" }, // Count the number of documents
          ],
        },
      },
    ]);
    if (orderFound) {
      return res.json({ message: "Orders List", data: orderFound });
    }
  } catch (error) {
    console.error(error.message);
    return res.json({ message: "Order List are not exist" });
  }
});

app.get("/", async (req, res) => {
  res.sendFile(path.resolve("./public/index.html"));
});

// Start the server
app.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`);
});
