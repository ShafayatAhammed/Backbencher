import { Schema, model } from "mongoose";

const transactionSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    method: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        "PENDING",
        "AUTHORIZED",
        "CAPTURED",
        "PROCESSING",
        "FAILED",
        "DECLINED",
        "REFUNDED",
        "PARTIALLY REFUNDED",
        "CHARGEBACK INITIATED",
        "CHARGEBACK WON",
        "CHARGEBACK LOST",
        "CANCELLED",
        "REVERSED",
        "SETTLED",
        "PARTIALLY SETTLED",
      ],
      default: "PENDING",
    },
  },
  {
    timestamps: true,
  }
);

const Transaction = model("Transaction", transactionSchema);

export default Transaction;
