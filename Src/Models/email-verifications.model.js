import { Schema, model } from "mongoose";
import emailVerificationSender from "../Utils/emailVerificationSender.js";

const emailVerificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index:true
  },
  emailVerificationToken: {
    type: String,
    required: true,
    index:true
  },
  expiryDate: {
    type: Date,
    default: function () {
      return new Date(Date.now() + 5 * 60 * 1000);
    },
    index:true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 5,
  },
});

emailVerificationSchema.pre("save", async function (next) {
  try {
    if (this.isNew) {
      await this.populate("user");

      await emailVerificationSender(
        this.user.fullName,
        this.user.emailAddress,
        this.emailVerificationToken
      );
    }

    next();
  } catch (err) {
    console.log("There are some error while sending email verification link!");
    throw new Error(err);
  }
});

const EmailVerification = model("Email Verification", emailVerificationSchema);

export default EmailVerification;
