import { Schema, model } from "mongoose";

const contactSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    phoneNumber: String,
    emailAddress: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Contact = model("Contact", contactSchema);

export default Contact;
