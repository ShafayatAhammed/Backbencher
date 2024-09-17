import errorHandler from "../Utils/error-handler.js";
import ApiResponser from "../Utils/api-responser.js";
import Order from "../Models/orders.model.js";
import Product from "../Models/products.model.js";
import { Types } from "mongoose";
import Attribute from "../Models/attributes.model.js";
import Discount from "../Models/discounts.model.js";
import Address from "../Models/addresses.model.js";
import Inventory from "../Models/inventories.model.js";
import Transaction from "../Models/transactions.model.js";
import Tracking from "../Models/trackings.model.js";
import productPriceHandler from "../Utils/product-price-handler.js";

const placeOrder = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;
  const { products } = req.body;

  const productIds = products.map((product) => product.productId);

  // Checking for products
  if (productIds.length !== products?.length) {
    return responser.sendApiResponse(400, false, "Products are required!", {
      reason: "Products missing",
    });
  }

  // Checking for quantities
  const productQuantities = products.map((product) => product.quantity);

  if (productQuantities.length !== productIds.length) {
    return responser.sendApiResponse(400, false, "Quantities are required!", {
      reason: "Quantities missing",
    });
  }

  // Checking for productids validity
  const { ObjectId } = Types;

  const validProducts = productIds.filter((id) => ObjectId.isValid(id));

  if (validProducts.length !== productIds.length) {
    return responser.sendApiResponse(
      400,
      false,
      "Some ProductIds are invalid!",
      { reason: "ProductIds invalid" }
    );
  }

  // Checking for quantities validity
  const validQuantities = productQuantities.filter((quantity) => quantity < 1);

  if (validQuantities.length) {
    return responser.sendApiResponse(400, false, "Quantities are invalid!", {
      reason: "Quantities invalid",
    });
  }

  // Checking for products existence
  const foundProducts = await Product.find({
    _id: { $in: productIds.map((id) => new ObjectId(id)) },
  });

  if (foundProducts.length !== productIds.length) {
    return responser.sendApiResponse(
      400,
      false,
      "ProductIds are invalid or duplicate!",
      { reason: "ProductIds invalid or duplicate" }
    );
  }

  const { paymentMethod } = req.body;

  if (!paymentMethod) {
    return responser.sendApiResponse(400, false, "PaymentMethod is required!", {
      reason: "PaymentMethod missing",
    });
  }

  const paymentMethods = ["CASH_ON_DELIVERY", "PAYPAL", "STRIPE"];

  if (!paymentMethods.includes(paymentMethod)) {
    return responser.sendApiResponse(
      400,
      false,
      "PaymentMethod is not valid!",
      { reason: "PaymentMethod invalid" }
    );
  }

  let transactionID = null;

  // Setting transactionId if payment method is paypal
  if (paymentMethod === "PAYPAL") {
    const { transactionId } = req.body;

    if (!transactionId) {
      return responser.sendApiResponse(
        400,
        false,
        "TransactionId is required!",
        { reason: "TransactionId missing" }
      );
    }

    transactionID = transactionId;
  }

  // Check for products availability
  const inventories = await Inventory.find({
    product: {
      $in: productIds.map((id) => new ObjectId(id)),
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
  const { address } = req.query;

  if (!address) {
    return responser.sendApiResponse(400, false, "AddressId is required!", {
      reason: "AddressId missing",
    });
  }

  // Checking for addressId validity
  if (!ObjectId.isValid(address)) {
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
        _id: new ObjectId(address),
      },
    },
  ]);

  if (!theAddress.length) {
    return responser.sendApiResponse(400, false, "No address found!", {
      reason: "Address missing",
    });
  }

  // Checking for attributeIds
  const { attributes } = req.body;

  // Checking for the attributes existence if attributeIds provided
  if (attributes?.length) {
    const validAttributes = attributes.filter((id) => ObjectId.isValid(id));

    if (validAttributes.length !== attributes.length) {
      return responser.sendApiResponse(
        400,
        false,
        "Some AttributeIds are invalid!",
        { reason: "AttributeIds invalid" }
      );
    }

    const theAttributes = await Attribute.find({
      _id: { $in: attributes.map((id) => new ObjectId(id)) },
    });

    if (theAttributes.length !== attributes.length) {
      return responser.sendApiResponse(
        400,
        false,
        "No attributes found with some AttributeIds!",
        { reason: "No attributes with some AttributeIds" }
      );
    }
  }

  const { coupons } = req.body;

  const now = new Date(Date.now());

  // Doing certain operation if couponCodes provided
  if (coupons?.length) {
    // Retrieving couponCodes
    const theCoupons = await Discount.aggregate([
      {
        // Retrieving given couponCodes
        $match: {
          "coupon.couponCode": {
            $in: coupons,
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

  const mergedProducts = products.map((product) => ({
    _id: new ObjectId(product.productId),
    quantity: product.quantity,
  }));

  // Processing products

  const { theVendors, theProducts, subtotal, shippingCost, discount, total } =
    await productPriceHandler(
      mergedProducts,
      coupons?.length ? coupons : [],
      attributes?.length ? attributes : [],
      false
    );

  // Filtering unique vendors
  const vendorSet = new Set(
    theVendors.map((vendor) => vendor.vendor.toString())
  );

  const vendorSetArray = Array.from(vendorSet).map((vendor) => ({
    vendor: new ObjectId(vendor),
  }));

  // Placing order
  const order = await Order.create({
    customer: user._id,
    vendors: vendorSetArray,
    products: theProducts,
    subtotal,
    shippingCost,
    discount,
    total,
    address: theAddress[0]._id,
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
                    input: mergedProducts,
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
          $in: productIds.map((id) => new ObjectId(id)),
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
                  input: mergedProducts,
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

  // Creating transaction
  await Transaction.create({
    order: order._id,
    method: paymentMethod,
    transactionId: transactionID,
    status: paymentMethod === "PAYPAL" ? "CAPTURED" : "PENDING",
  });

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
  const user = req.user;
  const { orderId } = req.query;

  // Checking for orderid
  if (!orderId) {
    return responser.sendApiResponse(400, false, "OrderId is required!", {
      reason: "OrderId missing",
    });
  }

  // Checking for orderid validity
  const { ObjectId } = Types;

  if (!ObjectId.isValid(orderId)) {
    return responser.sendApiResponse(400, false, "OrderId is invalid!", {
      reason: "OrderId invalid",
    });
  }

  const theOrder = await Order.findById(orderId);

  // Checking for order existence
  if (!theOrder) {
    return responser.sendApiResponse(404, false, "No order found!");
  }

  // Checking for user permission

  if (user.role !== "ADMIN") {
    await theOrder.populate("vendors.vendor");

    const isVendor = theOrder.vendors.find((vendor) => vendor.user == user._id);

    if (!isVendor) {
      const isCustomer = user._id == theOrder.customer;

      if (!isCustomer) {
        return responser.sendApiResponse(
          403,
          false,
          "You have no permission to access this area!"
        );
      }
    }
  }

  // Processing order
  const processOrderCriteria = [
    {
      $match: {
        _id: theOrder._id,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "customer",
        foreignField: "_id",
        as: "theCustomer",
      },
    },
    {
      $lookup: {
        from: "vendors",
        localField: "vendors.vendor",
        foreignField: "_id",
        as: "vendors",
      },
    },
    {
      $lookup: {
        from: "addresses",
        localField: "address",
        foreignField: "_id",
        as: "theAddress",
      },
    },
    {
      $lookup: {
        from: "transactions",
        localField: "_id",
        foreignField: "order",
        as: "transaction",
      },
    },
    {
      $lookup: {
        from: "trackings",
        localField: "_id",
        foreignField: "order",
        as: "tracking",
      },
    },
    {
      $project: {
        customer: {
          _id: { $arrayElemAt: ["$theCustomer._id", 0] },
          avatar: { $arrayElemAt: ["$theCustomer.avatar.avatarUrl", 0] },
          name: { $arrayElemAt: ["$theCustomer.fullName", 0] },
          phoneNumber: {
            $arrayElemAt: ["$theCustomer.phoneNumber", 0],
          },
          emailAddress: {
            $cond: {
              if: {
                $eq: [
                  { $arrayElemAt: ["$theCustomer.emailAddress", 0] },
                  "missing",
                ],
              },
              then: "None",
              else: { $arrayElemAt: ["$theCustomer.emailAddress", 0] },
            },
          },
        },
        vendors: {
          $map: {
            input: "$vendors",
            as: "vendor",
            in: {
              _id: "$$vendor._id",
              vendorLogo: "$$vendor.vendorLogo.logoUrl",
              vendorName: "$$vendor.vendorName",
            },
          },
        },
        address: {
          shippingAddress: {
            $arrayElemAt: ["$theAddress.shippingAddress", 0],
          },
          billingAddress: {
            $arrayElemAt: ["$theAddress.billingAddress", 0],
          },
        },
        products: {
          $map: {
            input: "$products",
            as: "product",
            in: {
              _id: "$$product.productId",
              name: "$$product.name",
              image: "$$product.image.imageUrl",
              categories: "$$product.categories",
              attributes: "$$product.attributes",
              vendor: {
                $arrayElemAt: [
                  {
                    $map: {
                      input: {
                        $filter: {
                          input: "$vendors",
                          as: "vendor",
                          cond: {
                            $eq: ["$$vendor._id", "$$product.vendor"],
                          },
                        },
                      },
                      as: "vendor",
                      in: {
                        _id: "$$vendor._id",
                        name: "$$vendor.vendorName",
                        logo: "$$vendor.vendorLogo.logoUrl",
                      },
                    },
                  },
                  0,
                ],
              },
              quantity: "$$product.quantity",
              price: "$$product.price",
              extraPrice: "$$product.subtotal",
              discounts: "$$product.discounts",
              discount: "$$product.discount",
              shippingCost: "$$product.shippingCost",
              total: "$$product.total",
            },
          },
        },
        subtotal: "$subtotal",
        shippingCost: "$shippingCost",
        discount: "$discount",
        total: "$total",
        paymentMethod: { $arrayElemAt: ["$transaction.method", 0] },
        shippingActivity: { $arrayElemAt: ["$tracking.event", 0] },
        shippingMethod: { $arrayElemAt: ["$tracking.method", 0] },
        shippingDate: { $arrayElemAt: ["$tracking.shippingDate", 0] },
        shippingStatus: { $arrayElemAt: ["$tracking.status", 0] },
        paymentStatus: { $arrayElemAt: ["$transaction.status", 0] },
        orderStatus: "$status",
        orderedAt: "$createdAt",
      },
    },
  ];

  // Changing data for vendor
  if (user.role === "VENDOR") {
    processOrderCriteria[6].$project.vendors = {
      $map: {
        input: {
          $filter: {
            input: "$vendors",
            as: "vendor",
            cond: {
              $eq: ["$$vendor.user", user._id],
            },
          },
        },
        as: "vendor",
        in: {
          _id: "$$vendor._id",
          vendorLogo: "$$vendor.vendorLogo.logoUrl",
          vendorName: "$$vendor.vendorName",
        },
      },
    };

    processOrderCriteria[6].$project.products.$map.input = {
      $filter: {
        input: "$products",
        as: "product",
        cond: {
          $eq: ["$$product.vendor", { $first: "$vendors._id" }],
        },
      },
    };

    processOrderCriteria[6].$project.products.$map.in.vendor = {
      _id: { first: "$vendors._id" },
      name: { $first: "$vendors.vendorName" },
      logo: { $first: "$vendors.vendorLogo" },
    };
  }

  // Running order find operation
  const order = await Order.aggregate(processOrderCriteria);

  return responser.sendApiResponse(200, true, "You have got the order.", order);
});

export { placeOrder, getMyOrders, getUserOrders, getOrder };
