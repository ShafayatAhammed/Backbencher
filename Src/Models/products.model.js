import { Schema, model } from "mongoose";

const productSchema = new Schema(
  {
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      index: true,
    },
    images: [
      {
        imageUrl: {
          type: String,
          required: true,
        },
        imagePublicId: {
          type: String,
          required: true,
        },
      },
    ],
    videos: [
      {
        videoUrl: {
          type: String,
          required: true,
        },
        videoPublicId: {
          type: String,
          required: true,
        },
      },
    ],
    price: {
      type: Number,
      required: true,
    },
    solds: {
      type: String,
      required: true,
      default: "0",
    },
  },
  { timestamps: true }
);

const Product = model("Product", productSchema);

export default Product;
