import errorHandler from "../Utils/error-handler.js";
import ApiResponser from "../Utils/api-responser.js";
import Order from "../Models/orders.model.js";
import Product from "../Models/products.model.js";
import { Types } from "mongoose";
import Attribute from "../Models/attributes.model.js";
import Discount from "../Models/discounts.model.js";
import Address from "../Models/addresses.model.js";
import Inventory from "../Models/inventories.model.js";
import Tracking from "../Models/trackings.model.js";

const placeOrder = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;
  const { products } = req.body;

  // Checking for products
  if (!products?.length) {
    return responser.sendApiResponse(400, false, "Products are required!", {
      reason: "Products missing",
    });
  }

  // Checking for productids validity
  const { ObjectId } = Types;

  const validProducts = products.filter((product) =>
    ObjectId.isValid(product.productId)
  );

  if (validProducts.length !== products.length) {
    return responser.sendApiResponse(
      400,
      false,
      "Some ProductIds are invalid!",
      { reason: "ProductIds invalid" }
    );
  }

  // Checking for products existence
  const foundProducts = await Product.find({
    _id: { $in: products.map((product) => new ObjectId(product.productId)) },
  });

  if (foundProducts.length !== products.length) {
    return responser.sendApiResponse(
      400,
      false,
      "ProductIds are invalid or duplicate!",
      { reason: "ProductIds invalid or duplicate" }
    );
  }
  // Check for products availability
  const inventories = await Inventory.find({
    product: {
      $in: products.map((product) => new ObjectId(product.productId)),
    },
    isCurrentInventory: true,
  });

  if (inventories.length) {
    const filteredInventories = inventories.reduce((acc, inventory) => {
      const product = products.find(
        (product) => product.productId == inventory.product
      );

      const subtractedQuantity = inventory.quantity - product.quantity;

      if (subtractedQuantity >= 0) {
        acc.push({ _id: inventory._id });
      }

      return acc;
    }, []);

    if (filteredInventories.length !== inventories.length) {
      return responser.sendApiResponse(
        400,
        false,
        "Product stock is insufficient!",
        {
          reason: "Product stock insufficient",
        }
      );
    }
  }

  // Checking for addressId
  const { addressId } = req.query;

  if (!addressId) {
    return responser.sendApiResponse(400, false, "AddressId is required!", {
      reason: "AddressId missing",
    });
  }

  // Checking for addressId validity
  if (!ObjectId.isValid(addressId)) {
    return responser.sendApiResponse(400, false, "AddressId is invalid!", {
      reason: "AddressId invalid",
    });
  }

  // Checking for address existence
  const theAddress = await Address.aggregate([
    {
      $match: {
        user: user._id,
      },
    },
    {
      $match: {
        _id: new ObjectId(addressId),
      },
    },
  ]);

  if (!theAddress.length) {
    return responser.sendApiResponse(400, false, "No address found!", {
      reason: "Address missing",
    });
  }

  // Checking for attributeIds
  const attributeIds = req.query.attributeIds
    ? req.query.attributeIds.split(",")
    : [];

  // Checking for the attributes existence if attributeIds provided
  if (attributeIds.length) {
    const validAttributeIds = attributeIds.filter((id) => ObjectId.isValid(id));

    if (validAttributeIds.length !== attributeIds.length) {
      return responser.sendApiResponse(
        400,
        false,
        "Some AttributeIds are invalid!",
        { reason: "AttributeIds invalid" }
      );
    }

    const theAttributes = await Attribute.find({
      _id: { $in: attributeIds.map((attribute) => new ObjectId(attribute)) },
    });

    if (theAttributes.length !== attributeIds.length) {
      return responser.sendApiResponse(
        400,
        false,
        "No attributes found with some AttributeIds!",
        { reason: "No attributes with some AttributeIds" }
      );
    }
  }

  const coupons = req.query.coupons ? req.query.coupons.split(",") : [];

  const now = new Date(Date.now());

  // Doing certain operation if couponCodes provided
  if (coupons.length) {
    // Retrieving couponCodes
    const theCoupons = await Discount.aggregate([
      {
        // Retrieving given couponCodes
        $match: {
          "coupon.couponCode": {
            $in: coupons.map((coupon) => coupon),
          },
        },
      },
      {
        // Filtering couponCodes for validity
        $match: {
          $expr: {
            $and: [
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
    ]);

    // Checking for couponCodes existence
    if (theCoupons.length !== coupons.length) {
      return responser.sendApiResponse(400, false, "Coupons are invalid!", {
        reason: "Coupons invalid",
      });
    }
  }

  const productIds = products.map((product) => ({
    _id: new ObjectId(product.productId),
    quantity: product.quantity,
  }));

  // Adding default stages and processes
  const processProducts = [
    {
      $match: {
        _id: {
          $in: productIds.map((product) => product._id),
        },
      },
    },
    {
      $addFields: {
        quantity: {
          $let: {
            vars: {
              product: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: productIds,
                      as: "product",
                      cond: { $eq: ["$$product._id", "$_id"] },
                    },
                  },
                  0,
                ],
              },
            },
            in: "$$product.quantity",
          },
        },
      },
    },
    {
      $lookup: {
        from: "vendors",
        localField: "vendor",
        foreignField: "_id",
        as: "vendor",
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "product",
        as: "categories",
      },
    },
    {
      $lookup: {
        from: "attributes",
        localField: "_id",
        foreignField: "product",
        as: "attribtues",
      },
    },
    {
      $addFields: {
        discounts: [],
      },
    },
    {
      $lookup: {
        from: "discounts",
        localField: "_id",
        foreignField: "products.product",
        as: "productDiscounts",
      },
    },
    {
      $lookup: {
        from: "discounts",
        localField: "categories._id",
        foreignField: "categories.category",
        as: "categoryDiscounts",
      },
    },
    {
      $addFields: {
        doCheckCoupon: false,
      },
    },
  ];

  // Checking for if coupons provided, so add stage of processing of coupons
  if (coupons.length) {
    processProducts.push({
      $addFields: {
        doCheckCoupon: true,
      },
    });
  }

  // Processing attributes if attributeIds given
  if (attributeIds.length) {
    const filterAttributes = {
      $addFields: {
        attributes: {
          $cond: {
            if: { $gt: [{ $size: "$attribtues" }, 0] },
            then: {
              $filter: {
                input: "$attribtues",
                as: "attribute",
                cond: {
                  $in: [
                    "$$attribute._id",
                    attributeIds.map((id) => new ObjectId(id)),
                  ],
                },
              },
            },
            else: "$attribtues",
          },
        },
      },
    };

    processProducts.push(filterAttributes);
  }

  // Calculating subtotal
  const calculateSubtotal = {
    $addFields: {
      totalExtraPrice: {
        $cond: {
          if: { $lt: [{ $size: "$attributes" }, 1] },
          then: 0,
          else: {
            $sum: {
              $map: {
                input: "$attributes",
                as: "attribute",
                in: {
                  $cond: {
                    if: {
                      ne: [{ $type: "$$attribute.extraPrice" }, "missing"],
                    },
                    then: "$$attribute.extraPrice",
                    else: 0,
                  },
                },
              },
            },
          },
        },
      },
    },
    $addFields: {
      subtotal: {
        $multiply: [
          {
            $cond: {
              if: { $gt: ["$totalExtraPrice", 0] },
              then: { $add: ["$price", "$totalExtraPrice"] },
              else: "$price",
            },
          },
          "$quantity",
        ],
      },
    },
  };

  processProducts.push(calculateSubtotal);

  // Adding shipping cost
  const addShippingCost = {
    $addFields: {
      shippingCost: 1,
    },
  };

  processProducts.push(addShippingCost);

  // Retrieving discounts
  const findDiscounts = {
    $addFields: {
      discounts: {
        $cond: {
          if: { $gt: [{ $size: "$productDiscounts" }, 0] },
          then: { $concatArrays: ["$discounts", "$productDiscounts"] },
          else: "$discounts",
        },
      },
    },
    $addFields: {
      discounts: {
        $cond: {
          if: { $gt: [{ $size: "$categoryDiscounts" }, 0] },
          then: { $concatArrays: ["$discounts", "$categoryDiscounts"] },
          else: "$discounts",
        },
      },
    },
    $addFields: {
      discounts: {
        $cond: {
          if: { $gt: [{ $size: "$discounts" }, 0] },
          then: {
            $filter: {
              input: "$discounts",
              as: "discount",
              cond: {
                $and: [
                  {
                    $or: [
                      {
                        $and: [
                          {
                            $ne: [{ $type: "$$discount.validFrom" }, "missing"],
                          },
                          { $lte: ["$$discount.validFrom", now] },
                        ],
                      },
                      {
                        $not: {
                          $ne: [{ $type: "$$discount.validFrom" }, "missing"],
                        },
                      },
                    ],
                  },
                  {
                    $or: [
                      {
                        $and: [
                          {
                            $ne: [
                              { $type: "$$discount.usageLimit" },
                              "missing",
                            ],
                          },
                          { $lt: ["$$discount.used", "$$discount.usageLimit"] },
                        ],
                      },
                      {
                        $not: {
                          $ne: [{ $type: "$$discount.usageLimit" }, "missing"],
                        },
                      },
                    ],
                  },
                  {
                    $or: [
                      {
                        $and: [
                          {
                            $ne: [
                              { $type: "$$discount.expiryDate" },
                              "missing",
                            ],
                          },
                          { $gte: ["$$discount.expiryDate", now] },
                        ],
                      },
                      {
                        $not: {
                          $ne: [{ $type: "$$discount.expiryDate" }, "missing"],
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
          else: "$discounts",
        },
      },
    },
    $addFields: {
      filteredDiscounts: {
        $cond: {
          if: { $gt: [{ $size: "$discounts" }, 0] },
          then: {
            $filter: {
              input: "$discounts",
              as: "discount",
              cond: {
                $or: [
                  { $ne: [{ $type: "$$discount.coupon" }, "missing"] },
                  { $ne: [{ $type: "$$discount.fixed" }, "missing"] },
                  { $ne: [{ $type: "$$discount.percentage" }, "missing"] },
                ],
              },
            },
          },
          else: "$discounts",
        },
      },
    },
  };

  processProducts.push(findDiscounts);

  // Updating shipping cost based on discount
  const updateShippingCost = {
    $addFields: {
      shippingCost: {
        $cond: {
          if: {
            $gt: [
              {
                $size: {
                  $cond: {
                    if: { $gt: [{ $size: "$discounts" }, 0] },
                    then: {
                      $filter: {
                        input: "$discounts",
                        as: "discount",
                        cond: {
                          $ne: [
                            { $type: "$$discount.freeShipping" },
                            "missing",
                          ],
                        },
                      },
                    },
                    else: "$discounts",
                  },
                },
              },
              0,
            ],
          },
          then: 0,
          else: "$shippingCost",
        },
      },
    },
  };

  processProducts.push(updateShippingCost);

  // Calculating total discount
  const calculateTotalDiscount = {
    $addFields: {
      discount: {
        $cond: {
          if: { $gt: [{ $size: "$discounts" }, 0] },
          then: {
            $reduce: {
              input: "$filteredDiscounts",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  {
                    $cond: {
                      if: { $eq: ["$doCheckCoupon", true] },
                      then: {
                        $cond: {
                          if: {
                            $and: [
                              {
                                $ne: [{ $type: "$$this.coupon" }, "missing"],
                              },
                              {
                                $in: ["$$this.coupon.couponCode", coupons],
                              },
                            ],
                          },
                          then: {
                            $cond: {
                              if: {
                                $ne: [
                                  { $type: "$$this.coupon.fixed" },
                                  "missing",
                                ],
                              },
                              then: {
                                $multiply: ["$$this.coupon.fixed", "$quantity"],
                              },
                              else: {
                                $cond: {
                                  if: {
                                    $ne: [
                                      { $type: "$$this.coupon.percentage" },
                                      "missing",
                                    ],
                                  },
                                  then: {
                                    $multiply: [
                                      {
                                        $divide: [
                                          {
                                            $multiply: [
                                              "$$this.coupon.percentage",
                                              "$subtotal",
                                            ],
                                          },
                                          100,
                                        ],
                                      },
                                      "$quantity",
                                    ],
                                  },
                                  else: 0,
                                },
                              },
                            },
                          },
                          else: 0,
                        },
                      },
                      else: 0,
                    },
                  },
                  {
                    $cond: {
                      if: {
                        $ne: [{ $type: "$$this.fixed" }, "missing"],
                      },
                      then: {
                        $multiply: ["$$this.fixed", "$quantity"],
                      },
                      else: {
                        $cond: {
                          if: {
                            $ne: [{ $type: "$$this.percentage" }, "missing"],
                          },
                          then: {
                            $multiply: [
                              {
                                $divide: [
                                  {
                                    $multiply: [
                                      "$$this.percentage",
                                      "$subtotal",
                                    ],
                                  },
                                  100,
                                ],
                              },
                              "$quantity",
                            ],
                          },
                          else: 0,
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
          else: 0,
        },
      },
    },
  };

  processProducts.push(calculateTotalDiscount);

  // Calculating total
  const calculateTotal = {
    $addFields: {
      total: {
        $subtract: [{ $add: ["$subtotal", "$shippingCost"] }, "$discount"],
      },
    },
  };

  processProducts.push(calculateTotal);

  // Running product processing
  const processedProducts = await Product.aggregate(processProducts);

  const theProducts = [];
  const theVendors = [];
  let subtotal = 0;
  let shippingCost = 0;
  let discount = 0;
  let total = 0;

  // Processing order
  for (const product of processedProducts) {
    subtotal += product.subtotal;
    shippingCost += product.shippingCost;
    discount += product.discount;
    total += product.total;

    const categories = [];

    if (product.categories?.length) {
      for (const category of product.categories) {
        categories.push({
          category: {
            categoryId: category._id,
            name: category.name,
          },
        });
      }
    }

    const attributes = [];

    if (product.attributes?.length) {
      for (const attribute of product.attribtues) {
        attributes.push({
          attribute: {
            attributeId: attribute._id,
            name: attribute.name,
            value: attribute.value,
            extraPrice: attribute.extraPrice ? attribute.extraPrice : 0,
          },
        });
      }
    }

    const discounts = [];

    if (product.discounts?.length) {
      for (const discount of product.discounts) {
        const theDiscount = {
          discountId: discount._id,
          discountType: discount.discountType,
          discounter: discount.discounter,
          createdAt: discount.createdAt,
        };

        const possibleProperties = [
          "coupon",
          "percentage",
          "fixed",
          "bulk",
          "freeShipping",
          "validFrom",
          "usageLimit",
          "used",
          "expiryDate",
        ];

        possibleProperties.forEach((property) => {
          if (Object.prototype.hasOwnProperty.call(discount, property)) {
            theDiscount[property] = discount[property];
          }
        });
      }
    }

    theVendors.push({ vendor: product.vendor[0]._id });

    const theProduct = {
      productId: product._id,
      vendor: product.vendor[0]._id,
      name: product.name,
      image: product.images[0],
      categories: categories,
      attributes: attributes,
      discounts: discounts,
      quantity: product.quantity,
      price: product.price,
      subtotal: product.subtotal,
      shippingCost: product.shippingCost,
      discount: product.discount,
      total: product.total,
      createdAt: product.createdAt,
    };

    theProducts.push(theProduct);
  }

  // Filtering unique vendors
  const uniqueVendors = new Set(
    theVendors.map((vendor) => vendor.vendor.toString())
  );

  const uniqueVendorsArray = Array.from(uniqueVendors).map((vendor) => ({
    vendor: new ObjectId(vendor),
  }));

  // Placing order
  const order = await Order.create({
    customer: user._id,
    vendors: uniqueVendorsArray,
    products: theProducts,
    subtotal,
    shippingCost,
    discount: totalDiscount,
    total,
    address: addressId,
  });

  // Subtracting stock of products
  if (inventories.length) {
    await Inventory.aggregate([
      {
        $match: {
          _id: {
            $in: inventories.map((inventory) => inventory._id),
          },
        },
      },
      {
        $set: {
          quantity: {
            $subtract: [
              "$quantity",
              {
                $sum: {
                  $map: {
                    input: productIds,
                    as: "product",
                    in: {
                      $cond: {
                        if: { $eq: ["$$product._id", "$product"] },
                        then: "$$product.quantity",
                        else: 0,
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      },
      {
        $merge: {
          into: "inventories",
          whenMatched: "merge",
          whenNotMatched: "discard",
        },
      },
    ]);
  }

  // Increasing product solds
  await Product.aggregate([
    {
      $match: {
        _id: {
          $in: productIds.map((product) => product._id),
        },
      },
    },
    {
      $set: {
        solds: {
          $add: [
            "$solds",
            {
              $sum: {
                $map: {
                  input: productIds,
                  as: "product",
                  in: {
                    $cond: {
                      if: { $eq: ["$$product._id", "$_id"] },
                      then: "$$product.quantity",
                      else: 0,
                    },
                  },
                },
              },
            },
          ],
        },
      },
    },
    {
      $merge: {
        into: "products",
        whenMatched: "merge",
        whenNotMatched: "discard",
      },
    },
  ]);

  // Creating tracking
  await Tracking.create({
    order: order._id,
  });

  return responser.sendApiResponse(200, true, "Order has been placed.", order);
});

const getMyOrders = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;

  // Retrieving orders
  const foundOrders = await Order.aggregate([
    {
      $match: {
        customer: user._id,
      },
    },
    {
      $lookup: {
        from: "vendors",
        localField: "vendors.vendor",
        foreignField: "_id",
        as: "theVendors",
      },
    },
    {
      $project: {
        status: "$status",
        products: {
          $map: {
            input: "$products",
            as: "product",
            in: {
              image: "$$product.image",
              name: "$$product.name",
              attributes: "$$product.attributes",
              price: {
                $cond: {
                  if: { $gt: [{ $size: "$$product.attributes" }, 0] },
                  then: {
                    $multiply: [
                      {
                        $add: [
                          "$$product.price",
                          {
                            $sum: {
                              $map: {
                                input: "$$product.attributes",
                                as: "attribute",
                                in: {
                                  $cond: {
                                    if: {
                                      $ne: [
                                        { $type: "$$attribute.extraPrice" },
                                        "missing",
                                      ],
                                    },
                                    then: "$$attribute.extraPrice",
                                    else: 0,
                                  },
                                },
                              },
                            },
                          },
                        ],
                      },
                      "$$product.quantity",
                    ],
                  },
                  else: {
                    $multiply: ["$$product.price", "$$product.quantity"],
                  },
                },
              },
              quantity: "$$product.quantity",
              vendor: {
                $arrayElemAt: [
                  {
                    $map: {
                      input: "$theVendors",
                      as: "theVendor",
                      in: {
                        $cond: {
                          if: { $eq: ["$$theVendor._id", "$$product.vendor"] },
                          then: {
                            vendorId: "$$theVendor._id",
                            vendorName: "$$theVendor.vendorName",
                          },
                          else: null,
                        },
                      },
                    },
                  },
                  0,
                ],
              },
            },
          },
        },
      },
    },
  ]);

  // Checking for orders existence
  if (!foundOrders.length) {
    return responser.sendApiResponse(404, false, "No orders found!");
  }

  return responser.sendApiResponse(
    200,
    true,
    "You have been got your orders.",
    foundOrders
  );
});

const getUserOrders = errorHandler(async (req, res) => {
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

  const { userId } = req.query;

  // Checking for userid
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

  // Retrieving orders
  const foundOrders = await Order.aggregate([
    {
      $match: {
        customer: new ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "vendors",
        localField: "vendors.vendor",
        foreignField: "_id",
        as: "theVendors",
      },
    },
    {
      $project: {
        status: "$status",
        products: {
          $map: {
            input: "$products",
            as: "product",
            in: {
              image: "$$product.image",
              name: "$$product.name",
              attributes: "$$product.attributes",
              price: {
                $cond: {
                  if: { $gt: [{ $size: "$$product.attributes" }, 0] },
                  then: {
                    $multiply: [
                      {
                        $add: [
                          "$$product.price",
                          {
                            $sum: {
                              $map: {
                                input: "$$product.attributes",
                                as: "attribute",
                                in: {
                                  $cond: {
                                    if: {
                                      $ne: [
                                        { $type: "$$attribute.extraPrice" },
                                        "missing",
                                      ],
                                    },
                                    then: "$$attribute.extraPrice",
                                    else: 0,
                                  },
                                },
                              },
                            },
                          },
                        ],
                      },
                      "$$product.quantity",
                    ],
                  },
                  else: {
                    $multiply: ["$$product.price", "$$product.quantity"],
                  },
                },
              },
              quantity: "$$product.quantity",
              vendor: {
                $arrayElemAt: [
                  {
                    $map: {
                      input: "$theVendors",
                      as: "theVendor",
                      in: {
                        $cond: {
                          if: { $eq: ["$$theVendor._id", "$$product.vendor"] },
                          then: {
                            vendorId: "$$theVendor._id",
                            vendorName: "$$theVendor.vendorName",
                          },
                          else: null,
                        },
                      },
                    },
                  },
                  0,
                ],
              },
            },
          },
        },
      },
    },
  ]);

  // Checking for orders existence
  if (!foundOrders.length) {
    return responser.sendApiResponse(404, false, "No orders found!");
  }

  return responser.sendApiResponse(
    200,
    true,
    "You have been got your orders.",
    foundOrders
  );
});

const getOrder = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
});

export { placeOrder, getMyOrders, getUserOrders };
