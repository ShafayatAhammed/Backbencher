import { Schema, model } from "mongoose";

const earningSchema = new Schema(
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
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

const Earning = model("Earning", earningSchema);

export default Earning;
