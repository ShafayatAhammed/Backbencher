import { Schema, model } from "mongoose";

const vendorsRequestsSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vendorName: {
      type: String,
      required: true,
    },
    vendorCategory: {
      type: String,
      required: true,
      enum: [
        "APPAREL & ACCESSORIES",
        "ELECTRONICS & GADGETS",
        "HEALTH & BEAUTY",
        "HOME & GARDEN",
        "SPORTS & OUTDOORS",
        "AUTOMOTIVE",
        "TOYS & GAMES",
        "BOOKS & MEDIA",
        "FOOD & BEVERAGES",
        "OFFICE SUPPLIES",
        "PET SUPPLIES",
        "JEWELRY & WATCHES",
        "BABY & KIDS",
        "TOOLS & HARDWARE",
        "ARTS & CRAFTS",
        "TRAVEL & LUGGAGE",
        "OTHER",
      ],
    },
    vendorType: {
      type: String,
      required: true,
      enum: ["INDIVIDUAL", "BUSINESS"],
    },
    vendorTradeLicenseNumber: String,
    vendorTIN: String,
    vendorGovernmentIdNumber: String,
    vendorPhoneNumber: {
      type: String,
      required: true,
    },
    vendorEmailAddress: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "PROCESSING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    expiryDate: {
      type: Date,
      index: {
        expires: 0,
      },
    },
  },
  { timestamps: true }
);

const VendorRequest = model("Vendor Request", vendorsRequestsSchema);

export default VendorRequest;
