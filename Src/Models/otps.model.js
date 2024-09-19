import { Schema, model } from "mongoose";
import emailOtpSender from "../Utils/email-otp-sender.js";
import smsOtpSender from "../Utils/sms-otp-sender.js";

const otpSchema = new Schema({
  fullName: {
    type: String,
    required: true,
  },
  emailAddress: {
    type: String,
    index: true,
  },
  phoneNumber: {
    type: String,
    index: true,
  },
  otpCode: {
    type: Number,
    required: true,
  },
  expiryDate: {
    type: Date,
    default: function () {
      return new Date(Date.now() + 5 * 60 * 1000);
    },
    index: {
      expires: 0,
    },
  },
});

otpSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      if (this.isModified("emailAddress")) {
        await emailOtpSender(this.fullName, this.emailAddress, this.otpCode);
      } else if (this.isModified("phoneNumber")) {
        await smsOtpSender(this.fullName, this.phoneNumber, this.otpCode);
      }
    }

    next();
  } catch (err) {
    throw err;
  }
});

const Otp = model("Otp", otpSchema);

export default Otp;
