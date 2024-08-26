import { Schema, model } from "mongoose";

const affiliateRequestSchema = new Schema(
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
    notes: String,
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "PROCESSING", "APPROVED", "REJECTED"],
    },
  },
  { timestamps: true }
);

const AffiliateRequest = model("Affiliate Request", affiliateRequestSchema);

export default AffiliateRequest;
