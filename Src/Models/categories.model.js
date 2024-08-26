import { Schema, model } from "mongoose";

const categorySchema = new Schema(
  {
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },
    name: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Category = model("Category", categorySchema);

export default Category;
