import Product from "../Models/products.model.js";

const productPriceHandler = async (
  products,
  coupons,
  attributes,
  isJustCalculation = true
) => {
  // Adding default stages and processes
  const processProducts = [
    {
      $match: {
        _id: {
          $in: products.map((product) => product._id),
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
                      input: products,
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

  // Processing attributes if attributes given
  if (attributes.length) {
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
                    attributes.map((id) => new ObjectId(id)),
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

  const now = new Date(Date.now());

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
  const couponDiscounts = [];
  let discount = 0;
  let shippingCost = 0;
  let total = 0;

  // Processing order
  for (const product of processedProducts) {
    subtotal += product.subtotal;
    shippingCost += product.shippingCost;
    discount += product.discount;
    total += product.total;

    if (isJustCalculation) {
      if (coupons.length) {
        for (const discount of product.discount) {
          if (discount.discountType === "COUPON") {
            const coupon = {
              couponCode: discount.coupon.couponCode,
            };

            if (discount.coupon.hasOwnProperty("percentage")) {
              coupon.percentage = discount.coupon.percentage;
            } else {
              coupon.fixed = discount.coupon.fixed;
            }

            couponDiscounts.push(coupon);
          }
        }
      }
    } else {
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
  }

  // Processing return data
  const data = {};

  if (!isJustCalculation) {
    data.theProducts = theProducts;
    data.theVendors = theVendors;
  }

  data.subtotal = subtotal;

  if (isJustCalculation) {
    if (couponDiscounts.length) {
      data.couponDiscounts = couponDiscounts;
    }
  }

  data.discount = discount;
  data.shippingCost = shippingCost;
  data.total = total;

  return data;
};

export default productPriceHandler;
