import { Schema, model } from "mongoose";

const chatSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    image: {
      imageUrl: {
        type: String,
        required: true,
      },
      imagePublicUrl: {
        type: String,
        required: true,
      },
    },
    video: {
      videoUrl: {
        type: String,
        required: true,
      },
      videoPublicUrl: {
        type: String,
        required: true,
      },
    },
    audio: {
      audioUrl: {
        type: String,
        required: true,
      },
      audioPublicUrl: {
        type: String,
        required: true,
      },
    },
    message: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Chat = model("Chat", chatSchema);

export default Chat;
