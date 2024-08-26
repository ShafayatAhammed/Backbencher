import { Schema, model } from "mongoose";

const withdrawRequestSchema = new Schema(
  {
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
    },
    deliverer: {
      type: Schema.Types.ObjectId,
      ref: "Deliverer",
    },
    affiliatePartner: {
      type: Schema.Types.ObjectId,
      ref: "Affiliate Partner",
    },
    amount: {
      type: String,
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
      enum: ["PENDING", "PROCESSING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

const WithdrawRequest = model("Withdraw Request", withdrawRequestSchema);

export default WithdrawRequest;
