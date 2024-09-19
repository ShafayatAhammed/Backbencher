import { Schema, model } from "mongoose";

const vendorsSchema = new Schema(
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
    vendorDescription: {
      type: String,
      default: "This is a vendor store of Martina.",
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
    vendorLogo: {
      logoUrl: {
        type: String,
        required: true,
        default:
          "https://res.cloudinary.com/dhvsm6zit/image/upload/v1723102449/martina_logo.png",
      },
      logoPublicId: {
        type: String,
        required: true,
        default: "martina_logo",
      },
    },
    vendorBanner: {
      bannerUrl: {
        type: String,
        required: true,
        default:
          "https://res.cloudinary.com/dhvsm6zit/image/upload/v1723102450/martina_banner.png",
      },
      bannerPublicId: {
        type: String,
        required: true,
        default: "martina_banner",
      },
    },
    vendorPhoneNumber: {
      phoneNumber: {
        type: String,
        required: true,
      },
      willShow: {
        type: Boolean,
        required: true,
        default: true,
      },
    },
    vendorEmailAddress: {
      emailAddress: {
        type: String,
        required: true,
      },
      willShow: {
        type: Boolean,
        required: true,
        default: true,
      },
    },
    vendorAddress: {
      address: {
        type: String,
        required: true,
      },
      willShow: {
        type: Boolean,
        required: true,
        default: true,
      },
    },
  },
  { timestamps: true }
);

const Vendor = model("Vendor", vendorsSchema);

export default Vendor;
