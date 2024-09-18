import errorHandler from "../Utils/error-handler.js";
import ApiResponser from "../Utils/api-responser.js";
import Cart from "../Models/carts.model.js";
import Product from "../Models/products.model.js";
import { Types } from "mongoose";
import Inventory from "../Models/inventories.model.js";

const addToCart = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;
  const { productId } = req.query;

  // Checking for productid
  if (!productId) {
    return responser.sendApiResponse(400, false, "ProductId is required!", {
      reason: "ProductId missing",
    });
  }

  // Checking for productid validity
  const { ObjectId } = Types;

  if (!ObjectId.isValid(productId)) {
    return responser.sendApiResponse(400, false, "ProductId is invalid!", {
      reason: "ProductId invalid",
    });
  }

  // Checking for productid existence
  const theProduct = await Product.findById(productId);

  if (!theProduct) {
    return responser.sendApiResponse(404, false, "No product found!");
  }

  // Checking for product stock
  const productStock = await Inventory.find({ product: theProduct._id });

  if (productStock.length) {
    const stockCount = 0;

    for (const stock of productStock) {
      stockCount += stock.quantity;
    }

    // Checking for product stock availability
    if (!stockCount) {
      return responser.sendApiResponse(409, false, "Product is out of stock!");
    }
  }

  // Adding product to cart
  await Cart.create({ user: user._id, product: theProduct._id });

  return responser.sendApiResponse(
    200,
    true,
    "Product added to cart successfully."
  );
});

const getMyCart = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Finding and processing user cart products
  const now = new Date();

  const myCart = await Cart.aggregate([
    // Retrieving user cart products
    { $match: { user: user._id } },
    // Retrieving products
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "products",
      },
    },
    // Retrieving products inventories
    {
      $lookup: {
        from: "inventories",
        localField: "products._id",
        foreignField: "product",
        as: "stocks",
      },
    },
    // Retrieving products categories
    {
      $lookup: {
        from: "categories",
        localField: "products._id",
        foreignField: "product",
        as: "categories",
      },
    },
    // Retrieving products discounts
    {
      $lookup: {
        from: "discounts",
        let: { productId: "$products._id", categoryId: "$categories._id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $or: [
                      { $eq: ["$products.product", "$$productId"] },
                      { $eq: ["$categories.category", "$$categoryId"] },
                    ],
                  },
                  {
                    $or: [
                      { $eq: ["$discountType", "PERCENTAGE"] },
                      { $eq: ["$discountType", "FIXED"] },
                    ],
                  },
                  {
                    $or: [
                      {
                        $and: [
                          { $ne: [{ $type: "$validFrom" }, "missing"] },
                          { $lte: ["$validFrom", now] },
                        ],
                      },
                      {
                        $eq: [{ $type: "$validFrom" }, "missing"],
                      },
                    ],
                  },
                  {
                    $or: [
                      {
                        $and: [
                          { $ne: [{ $type: "$usageLimit" }, "missing"] },
                          { $lt: ["$used", "$usageLimit"] },
                        ],
                      },
                      {
                        $eq: [{ $type: "$usageLimit" }, "missing"],
                      },
                    ],
                  },
                  {
                    $or: [
                      {
                        $and: [
                          { $ne: [{ $type: "$expiryDate" }, "missing"] },
                          { $gte: ["$expiryDate", now] },
                        ],
                      },
                      {
                        $eq: [{ $type: "$expiryDate" }, "missing"],
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
        as: "discounts",
      },
    },
    // Calculating products stocks and discounts
    {
      $addFields: {
        stock: {
          $cond: {
            if: { $gt: [{ $size: "$stocks" }, 0] },
            then: { $sum: "$stocks.quantity" },
            else: "UNLIMITED",
          },
        },
        discount: {
          $let: {
            vars: {
              discount: {
                $sum: {
                  $map: {
                    input: "$discounts",
                    as: "discount",
                    in: {
                      $cond: {
                        if: { $eq: ["$$discount.discountType", "PERCENTAGE"] },
                        then: {
                          $multiply: [
                            "$products.price",
                            { $divide: ["$$discount.percentage", 100] },
                          ],
                        },
                        else: "$$discount.fixed",
                      },
                    },
                  },
                },
              },
            },
            in: {
              $cond: {
                if: { $gt: ["$products.price", "$$discount"] },
                then: { $subtract: ["$products.price", "$$discount"] },
                else: { $subtract: ["$$discount", "$products.price"] },
              },
            },
          },
        },
      },
    },
    // Including just necessary fields
    {
      $project: {
        image: { $arrayElemAt: ["$products.images.imageUrl", 0] },
        name: "$products.name",
        prices: {
          regularPrice: "$products.price",
          discountPrice: "$discount",
        },
        stock: {
          $cond: {
            if: { $lte: ["$stock", 0] },
            then: "OUT OF STOCK",
            else: "$stock",
          },
        },
        addDate: "$createdAt",
      },
    },
  ]);

  // Checking for cart products
  if (!myCart.length) {
    return responser.sendApiResponse(404, false, "No cart products found!");
  }

  return responser.sendApiResponse(
    200,
    true,
    "You have got your cart products.",
    myCart
  );
});

const getUserCart = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Checking for user permission
  if (user.role !== "ADMIN") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  // Checking for userid
  const { userId } = req.query;

  if (!userId) {
    return responser.sendApiResponse(400, false, "UserId is required!", {
      reason: "UserId missing",
    });
  }

  // Checking for userid validity
  const { ObjectId } = Types;

  if (!ObjectId.isValid(userId)) {
    return responser.sendApiResponse(400, false, "UserId is invalid!", {
      reason: "UserId invalid",
    });
  }

  // Finding and processing user cart products
  const now = new Date();

  const userCart = await Cart.aggregate([
    // Matching user cart products
    { $match: { user: new ObjectId(userId) } },
    // Retrieving products
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "products",
      },
    },
    // Retrieving products inventories
    {
      $lookup: {
        from: "inventories",
        localField: "products._id",
        foreignField: "product",
        as: "stocks",
      },
    },
    // Retrieving products categories
    {
      $lookup: {
        from: "categories",
        localField: "products._id",
        foreignField: "product",
        as: "categories",
      },
    },
    // Retrieving products discounts
    {
      $lookup: {
        from: "discounts",
        let: { productId: "$products._id", categoryId: "$categories._id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $or: [
                      { $eq: ["$products.product", "$$productId"] },
                      { $eq: ["$categories.category", "$$categoryId"] },
                    ],
                  },
                  {
                    $or: [
                      { $eq: ["$discountType", "PERCENTAGE"] },
                      { $eq: ["$discountType", "FIXED"] },
                    ],
                  },
                  {
                    $or: [
                      {
                        $and: [
                          { $ne: [{ $type: "$validFrom" }, "missing"] },
                          { $lte: ["$validFrom", now] },
                        ],
                      },
                      {
                        $eq: [{ $type: "$validFrom" }, "missing"],
                      },
                    ],
                  },
                  {
                    $or: [
                      {
                        $and: [
                          { $ne: [{ $type: "$usageLimit" }, "missing"] },
                          { $lt: ["$used", "$usageLimit"] },
                        ],
                      },
                      {
                        $eq: [{ $type: "$usageLimit" }, "missing"],
                      },
                    ],
                  },
                  {
                    $or: [
                      {
                        $and: [
                          { $ne: [{ $type: "$expiryDate" }, "missing"] },
                          { $gte: ["$expiryDate", now] },
                        ],
                      },
                      {
                        $eq: [{ $type: "$expiryDate" }, "missing"],
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
        as: "discounts",
      },
    },
    // Calculating products stocks and discounts
    {
      $addFields: {
        stock: {
          $cond: {
            if: { $gt: [{ $size: "$stocks" }, 0] },
            then: { $sum: "$stocks.quantity" },
            else: "UNLIMITED",
          },
        },
        discount: {
          $let: {
            vars: {
              discount: {
                $sum: {
                  $map: {
                    input: "$discounts",
                    as: "discount",
                    in: {
                      $cond: {
                        if: { $eq: ["$$discount.discountType", "PERCENTAGE"] },
                        then: {
                          $multiply: [
                            "$products.price",
                            { $divide: ["$$discount.percentage", 100] },
                          ],
                        },
                        else: "$$discount.fixed",
                      },
                    },
                  },
                },
              },
            },
            in: {
              $cond: {
                if: { $gt: ["$products.price", "$$discount"] },
                then: { $subtract: ["$products.price", "$$discount"] },
                else: { $subtract: ["$$discount", "$products.price"] },
              },
            },
          },
        },
      },
    },
    // Including just necessary fields
    {
      $project: {
        image: { $arrayElemAt: ["$products.images.imageUrl", 0] },
        name: "$products.name",
        prices: {
          regularPrice: "$products.price",
          discountPrice: "$discount",
        },
        stock: {
          $cond: {
            if: { $lte: ["$stock", 0] },
            then: "OUT OF STOCK",
            else: "$stock",
          },
        },
        addDate: "$createdAt",
      },
    },
  ]);

  // Checking for user cart products
  if (!userCart.length) {
    return responser.sendApiResponse(404, false, "No cart products found!");
  }

  return responser.sendApiResponse(
    200,
    true,
    "You have got user cart products.",
    userCart
  );
});

const removeFromCart = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;
  const productIds = req.body.productIds ? req.body.productIds : [];

  // Checking for productids
  if (!productIds.length) {
    return responser.sendApiResponse(400, false, "ProductId is required!", {
      reason: "ProductId missing",
    });
  }

  // Checking for productid validity
  const { ObjectId } = Types;

  let validProductIds = productIds.filter((id) => ObjectId.isValid(id));

  if (validProductIds.length !== productIds.length) {
    return responser.sendApiResponse(400, false, "ProductIds are invalid!", {
      reason: "ProductIds invalid",
    });
  }

  // Retrieving user cart products
  const foundCart = await Cart.aggregate([
    {
      $match: {
        user: user._id,
      },
    },
    {
      $match: {
        _id: { $in: productIds.map((id) => new ObjectId(id)) },
      },
    },
  ]);

  // Checking for user cart products
  if (!foundCart.length) {
    return responser.sendApiResponse(404, false, "No cart products found!", {
      reason: "Cart products not found",
    });
  }

  // Deleting user cart products
  await Cart.deleteMany({
    _id: { $in: productIds.map((id) => new ObjectId(id)) },
  });

  return responser.sendApiResponse(
    200,
    true,
    "Cart products deleted successfully."
  );
});

export { addToCart, getMyCart, getUserCart, removeFromCart };
