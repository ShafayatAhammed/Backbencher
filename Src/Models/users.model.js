import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const avatarSubSchema = new Schema({
  avatarUrl: {
    type: String,
    default:
      "https://res.cloudinary.com/dhvsm6zit/image/upload/v1721975610/martina-user-avatar.jpg",
  },
  avatarPublicId: {
    type: String,
    default: "martina-user-avatar",
  },
});

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    emailAddress: {
      type: String,
      unique: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["ADMIN", "VENDOR", "DELIVERER", "AFFILIATE PARTNER", "CUSTOMER"],
      default: "CUSTOMER",
    },
    avatar: avatarSubSchema,
    isVerified: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.generateAuthTokens = function () {
  try {
    const accessToken = jwt.sign(
      { _id: this._id },
      process.env.SECRET_ACCESS_KEY
    );
    const refreshToken = jwt.sign(
      { _id: this._id },
      process.env.SECRET_REFRESH_KEY
    );

    this.refreshToken = refreshToken;

    return {
      accessToken,
      refreshToken,
    };
  } catch (err) {
    console.error("There are some error while generating auth tokens!\n");
    throw new Error(err);
  }
};

userSchema.pre("save", async function (next) {
  try {
    if (this.isModified("password")) {
      this.password = await bcrypt.hash(this.password, 10);
    } else {
      return;
    }

    next();
  } catch (err) {
    console.error("Something went wrong while encrypting password!\n");
    throw new Error(err);
  }
});

const User = model("User", userSchema);

export default User;
