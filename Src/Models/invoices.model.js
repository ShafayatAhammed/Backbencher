import { Schema, model } from "mongoose";

const invoiceSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
  },
  { timestamps: true }
);

const Invoice = model("Invoice", invoiceSchema);
export default Invoice;
