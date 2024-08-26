import { Schema, model } from "mongoose";

const inventorySchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    quantity: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    totalPrice: {
      type: String,
      required: true,
    },
    supplier: {
      type: String,
      required: true,
    },
    reorderAmount: String,
    reorderPrice: String,
  },
  { timestamps: true }
);

const Inventory = model("Inventory", inventorySchema);

export default Inventory;
