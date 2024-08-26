import { Schema, model } from "mongoose";

const complaintSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vendor: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
    },
    deliverer: {
      type: Schema.Types.ObjectId,
      ref: "Deliverer",
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      required: true,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW",
    },
    status: {
      type: String,
      required: true,
      enum: ["PEDING", "PROCESSING", "APPROVED", "REJECTED"],
    },
  },
  { timestamps: true }
);

const Complaint = model("Complaint", complaintSchema);

export default Complaint;
