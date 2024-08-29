import { Schema, model } from "mongoose";

const subDiscountSchema = new Schema({
  discountId: {
    type: Schema.Types.ObjectId,
    ref: "Discount",
    required: true,
  },
  discountType: {
    type: String,
    required: true,
  },
  coupon: {
    couponCode: {
      type: String,
      required: true,
    },
    percentage: Number,
    fixed: Number,
  },
  percentage: Number,
  fixed: Number,
  bulk: {
    buy: {
      type: Number,
      required: true,
    },
    get: {
      type: Number,
      required: true,
    },
  },
  freeShipping: Boolean,
  validFrom: Date,
  usageLimit: Number,
  used: Number,
  discounter: {
    type: Schema.Types.ObjectId,
    ref: "Vendor",
    required: true,
  },
  expiryDate: {
    type: Date,
  },
  createdAt: {
    type: Date,
    required: true,
  },
});

const subProductSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  vendor: {
    type: Schema.Types.ObjectId,
    ref: "Vendor",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    imageUrl: {
      type: String,
      required: true,
    },
    imagePublicId: {
      type: String,
      required: true,
    },
  },
  categories: [
    {
      category: {
        categoryId: {
          type: Schema.Types.ObjectId,
          ref: "Category",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
      },
    },
  ],
  attributes: [
    {
      attribute: {
        attributeId: {
          type: Schema.Types.ObjectId,
          ref: "Attribute",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        value: {
          type: String,
          required: true,
        },
        extraPrice: {
          type: Number,
          required: true,
        },
      },
    },
  ],
  discounts: [subDiscountSchema],
  quantity: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  subtotal: {
    type: Number,
    required: true,
  },
  shippingCost: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
  },
});

const orderSchema = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vendors: [
      {
        vendor: {
          type: Schema.Types.ObjectId,
          ref: "Vendor",
          required: true,
        },
      },
    ],
    products: [subProductSchema],
    subtotal: {
      type: Number,
      required: true,
    },
    shippingCost: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    total: Number,
    address: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        "PENDING APPROVAL",
        "APPROVED",
        "PROCESSING",
        "PACKAGING",
        "AWAITING DISPATCH",
        "SHIPPED",
        "IN TRANSIT",
        "OUT FOR DELIVERY",
        "DELIVERED",
        "COMPLETED",
        "RETURNED",
        "CANCELLED",
        "ON HOLD",
        "FAILED PAYMENT",
      ],
      default: "PENDING APPROVAL",
    },
  },
  { timestamps: true }
);

const Order = model("Order", orderSchema);

export default Order;
