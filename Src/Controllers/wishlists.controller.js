import ApiResponser from "../Utils/api-responser.js";
import errorHandler from "../Utils/error-handler.js";
import Product from "../Models/products.model.js";
import Wishlist from "../Models/wishlists.model.js";
import { Types } from "mongoose";

const addProductInWishlist = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;
  const { productId } = req.query;

  // Checking for productid
  if (!productId) {
    return responser.sendApiResponse(400, false, "ProductId is required!", {
      reason: "ProductId missing",
    });
  }

  const { ObjectId } = Types;

  // Checking for productid validity
  if (!ObjectId.isValid(productId)) {
    return responser.sendApiResponse(400, false, "ProductId is invalid!", {
      reason: "ProductId invalid",
    });
  }

  // Check for product existence
  const theProduct = await Product.findById(productId);

  if (!theProduct) {
    return responser.sendApiResponse(404, false, "No product found!");
  }

  // Adding product to wishlist
  await Wishlist.create({ user: user._id, product: theProduct._id });

  return responser.sendApiResponse(
    200,
    true,
    "Product added to wishlist successfully."
  );
});

const getMyWishlists = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Retrieving wishlist products
  const now = new Date();
  const myWishlists = await Wishlist.aggregate([
    { $match: { user: user._id } },
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "products",
      },
    },
    {
      $lookup: {
        from: "inventories",
        localField: "product._id",
        foreignField: "product",
        as: "stocks",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "products._id",
        foreignField: "product",
        as: "categories",
      },
    },
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
              discountPrice: {
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
    {
      $project: {
        image: { $arrayElemAt: ["$products.images.imageUrl", 0] },
        name: "$products.name",
        price: {
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

  // Checking for wishlist products
  if (!myWishlists.length) {
    return responser.sendApiResponse(404, false, "No wishlists found!");
  }

  return responser.sendApiResponse(
    200,
    true,
    "You have got your wishlists.",
    myWishlists
  );
});

const getUserWishlists = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;
  const { userId } = req.query;

  // Checking for user permission
  if (user.role !== "ADMIN") {
    return responser.sendApiResponse(
      403,
      false,
      "You have no permission to access this area!"
    );
  }

  // Checking for userid
  if (!userId) {
    return responser.sendApiResponse(400, false, "UserId is required!", {
      reason: "UserId missing",
    });
  }

  const { ObjectId } = Types;

  // Checking for userid validity
  if (!ObjectId.isValid(userId)) {
    return responser.sendApiResponse(400, false, "UserId is invalid!", {
      reason: "UserId invalid",
    });
  }

  const now = new Date();

  // Retrieving wishlist products
  const userWishlists = await Wishlist.aggregate([
    { $match: { user: new ObjectId(userId) } },
    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "products",
      },
    },
    {
      $lookup: {
        from: "inventories",
        localField: "product._id",
        foreignField: "product",
        as: "stocks",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "products._id",
        foreignField: "product",
        as: "categories",
      },
    },
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
    {
      $addFields: {
        stock: {
          $cond: {
            if: { $gt: [{ $size: "$stocks" }, 0] },
            then: { $sum: "$stocks.quantity" },
            else: "UNLIMITED",
          },
        },
        discountPrice: {
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
    {
      $project: {
        _id: 1,
        image: { $arrayElemAt: ["$products.images.imageUrl", 0] },
        name: "$products.name",
        price: {
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

  // Checking for wishlist products
  if (!userWishlists.length) {
    return responser.sendApiResponse(404, false, "No wishlists found!");
  }

  return responser.sendApiResponse(
    200,
    true,
    "You have got user wishlists.",
    userWishlists
  );
});

const removeProductFromMyWishlist = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;
  const wishlistIds = req.query.wishlistIds
    ? req.query.wishlistIds.split(",")
    : [];

  // Checking for wishlistids
  if (!wishlistIds.length) {
    return responser.sendApiResponse(400, false, "WishlistId is required!", {
      reason: "WishlistId missing",
    });
  }

  const { ObjectId } = Types;

  // Checking for wishlistids validity
  let validWishlistIds = wishlistIds.filter((id) => ObjectId.isValid(id));

  if (validWishlistIds.length !== wishlistIds.length) {
    return responser.sendApiResponse(400, false, "WishlistIds are invalid!", {
      reason: "WishlistIds invalid",
    });
  }

  // Retrieving wishlists products
  const foundWishlists = await Wishlist.aggregate([
    {
      $match: {
        user: user._id,
      },
    },
    {
      $match: {
        _id: { $in: wishlistIds.map((id) => new ObjectId(id)) },
      },
    },
  ]);

  // Checking for wishlist products
  if (!foundWishlists.length) {
    return responser.sendApiResponse(404, false, "No wishlists found!", {
      reason: "Wishlists not found",
    });
  }

  // Deleting wishlist products

  await Wishlist.deleteMany({
    _id: { $in: wishlistIds.map((id) => new ObjectId(id)) },
  });

  return responser.sendApiResponse(200, true, "Wishlist deleted successfully.");
});

export {
  addProductInWishlist,
  getMyWishlists,
  getUserWishlists,
  removeProductFromMyWishlist,
};
