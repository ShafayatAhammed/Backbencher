import { config } from "dotenv";
import { connectWithDatabase } from "./DB/db.js";
import { app } from "./app.js";
import twilio from "twilio";
import { v2 as cloudinary } from "cloudinary";
import User from "./Models/users.model.js";
import Vendor from "./Models/vendors.model.js";
import Product from "./Models/products.model.js";
import Category from "./Models/categories.model.js";
import Tag from "./Models/tags.model.js";
import Address from "./Models/addresses.model.js";
import Discount from "./Models/discounts.model.js";

config();

export const twilioClient = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

connectWithDatabase()
  .then(async () => {
    const port = process.env.PORT || 8001;

    app.listen(port, () => {
      console.log(`The server is running at port no : ${port}.`);
    });

    const isAdminExists = await User.findOne({
      $or: [
        { phoneNumber: "+8801627347707" },
        { emailAddress: "mdshafayat013@gmail.com" },
      ],
    });

    let adminId;

    if (!isAdminExists) {
      const admin = await User.create({
        fullName: "Shafayat Ahammed",
        phoneNumber: "+8801627347707",
        emailAddress: "mdshafayat013@gmail.com",
        role: "ADMIN",
        addresses: {
          shippingAddress: "Mymensingh,Bangladesh",
          billingAddress: "Mymensingh,Bangladesh",
        },
        isVerified: true,
        avatar: {
          avatarUrl:
            "https://res.cloudinary.com/dhvsm6zit/image/upload/v1722335596/Shafayat_Ahammed.jpg",
          avatarPublicId: "Shafayat_Ahammed",
        },
        password: "01627347707 Shafayat",
      });

      adminId = admin._id;
    } else {
      adminId = isAdminExists._id;
    }

    const isVendorExists = await Vendor.findOne({ user: adminId });

    if (!isVendorExists) {
      await Vendor.create({
        user: adminId,
        vendorName: "Martina",
        vendorDescription:
          "Welcome to Martina! Discover top-quality prodcusts with unique selections and excellent customer service. Enjoy a seamless shopping experience with us!",
        vendorCategory: "ELECTRONICS & GADGETS",
        vendorType: "BUSINESS",
        vendorTradeLicenseNumber: "B123456",
        vendorTIN: "12-3456789",
        vendorLogo: {
          logoUrl:
            "https://res.cloudinary.com/dhvsm6zit/image/upload/v1723102449/martina_logo.png",
          logoPublicId: "martina_logo",
        },
        vendorBanner: {
          bannerUrl:
            "https://res.cloudinary.com/dhvsm6zit/image/upload/v1723102450/martina_banner.png",
          bannerPublicId: "martina_banner",
        },
        vendorPhoneNumber: {
          phoneNumber: "+8801627347707",
        },
        vendorEmailAddress: { emailAddress: "mdshafayat013@gmail.com" },
        vendorAddress: { address: "Mymensingh,Bangladesh" },
      });
    }

    const isAddressExists = await Address.findOne({ user: adminId });

    if (!isAddressExists) {
      await Address.create({
        user: adminId,
        shippingAddress: "Trishal,Mymensigh,Bangladesh",
        billingAddress: "Darirampur,Trishal,Mymensingh,Bangladesh",
      });
    }
  })
  .catch((err) => {
    console.error("There are some error after connection with the database!\n");
    throw new Error(err);
  });
