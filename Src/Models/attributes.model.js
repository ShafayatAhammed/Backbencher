import { Schema, model } from "mongoose";

const attributeSchema = new Schema(
  {
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
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
    extraPrice: Number,
  },
  { timestamps: true }
);

const Attribute = model("Attribute", attributeSchema);

export default Attribute;
