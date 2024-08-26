import { Schema, model } from "mongoose";

const affiliatePartnerSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["INDIVIDUAL", "BUSINESS"],
    },
    emailAddress: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    websites: [
      {
        website: {
          type: String,
          required: true,
        },
        monthlyTraffic: {
          type: String,
          required: true,
        },
      },
    ],
    tradeLicenseNumber: String,
    tin: String,
    governmentIdNumber: String,
    commisionRate: {
      type: Number,
      required: true,
      default: 3,
    },
  },
  { timestamps: true }
);

const AffiliatePartner = model("Affiliate Partner", affiliatePartnerSchema);

export default AffiliatePartner;
