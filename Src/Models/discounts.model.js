import { Schema, model } from "mongoose";

const discountSchema = new Schema(
  {
    discountType: {
      type: String,
      required: true,
      enum: ["COUPON", "PERCENTAGE", "FIXED", "BULK", "FREE_SHIPPING"],
      index: true,
    },
    coupon: {
      couponCode: String,
      percentage: Number,
      fixed: Number,
    },
    percentage: Number,
    fixed: Number,
    bulk: {
      buy: Number,
      get: Number,
    },
    freeShipping: Boolean,
    products: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
          index: true,
        },
      },
    ],
    categories: [
      {
        category: {
          type: Schema.Types.ObjectId,
          ref: "Category",
          required: true,
          index: true,
        },
      },
    ],
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
      index: {
        expires: 0,
      },
    },
  },
  { timestamps: true }
);

const Discount = model("Discount", discountSchema);

export default Discount;
