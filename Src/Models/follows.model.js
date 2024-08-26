import { Schema, model } from "mongoose";

const followSchema = new Schema(
  {
    followed: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    follower: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const Follow = model("Follow", followSchema);

export default Follow;
