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
      type: Number,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    supplier: {
      type: String,
      required: true,
    },
    isCurrentInventory: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

const Inventory = model("Inventory", inventorySchema);

export default Inventory;
