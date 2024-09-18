import { Types } from "mongoose";
import ApiResponser from "../Utils/api-responser.js";
import errorHandler from "../Utils/error-handler.js";
import { paypalOrderCapturer, paypalOrderCreator } from "../Utils/paypal.js";
import productPriceHandler from "../Utils/product-price-handler.js";
import Product from "../Models/products.model.js";
import Inventory from "../Models/inventories.model.js";
import Address from "../Models/addresses.model.js";
import Attribute from "../Models/attributes.model.js";
import Discount from "../Models/discounts.model.js";

const createPaypalOrder = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const user = req.user;
  const { products } = req.body;

  if (!products?.length) {
    return responser.sendApiResponse(400, false, "Products are required!", {
      reason: "Products missing",
    });
  }

  const productIds = products.map((product) => product.productId);

  // Checking for products
  if (productIds.length !== products?.length) {
    return responser.sendApiResponse(400, false, "Products are required!", {
      reason: "Products missing",
    });
  }

  // Checking for product quantities
  const productQuantites = products.map((product) => product.quantity);

  if (productQuantites.length !== productIds.length) {
    return responser.sendApiResponse(400, false, "Quantites are required!", {
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
  const validQuantities = productQuantites.filter((quantity) => quantity == 0);

  if (validQuantities.length) {
    return responser.sendApiResponse(400, false, "Quantities are not valid!", {
      reason: "Quantities invalid",
    });
  }

  // Checking for products existence
  const foundProducts = await Product.find({
    _id: { $in: productIds.map((id) => new ObjectId(id)) },
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
  const { address } = req.body;

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

  const { total } = await productPriceHandler(
    mergedProducts,
    coupons?.length ? coupons : [],
    attributes?.length ? attributes : [],
    false
  );

  const orderId = await paypalOrderCreator(total);

  return responser.sendApiResponse(
    200,
    true,
    "You have got PaypalOrderId.",
    orderId
  );
});

const capturePaypalOrder = errorHandler(async (req, res) => {
  const responser = new ApiResponser(res);
  const { paypalOrderId } = req.query;

  if (!paypalOrderId) {
    return responser.sendApiResponse(400, false, "PaypalOrderId is required!");
  }

  const transactionId = await paypalOrderCapturer(paypalOrderId);

  return responser.sendApiResponse(
    200,
    true,
    "You have got transactionId.",
    transactionId
  );
});

export { createPaypalOrder, capturePaypalOrder };
