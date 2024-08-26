import { Schema, model } from "mongoose";

const paymentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    method: {
      type: String,
      required: true,
      enum: ["BKASH"],
    },
    methodDetails: {
      bkashNumber: {
        type: String,
        required: true,
      },
      transactionId: {
        type: String,
        required: true,
      },
    },
    isDefault: Boolean,
  },
  { timestamps: true }
);

const Payment = model("Payment", paymentSchema);

export default Payment;
