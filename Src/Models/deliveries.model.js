import { Schema, model } from "mongoose";

const deliverySchema = new Schema(
  {
    deliverer: {
      type: Schema.Types.ObjectId,
      ref: "Deliverer",
      required: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        "PENDING",
        "SCHEDULED FOR DELIVERY",
        "IN TRANSIT",
        "OUT FOR DELIVERY",
        "DELIVERED SUCCESSFULLY",
        "DELIVERY ATTEMPTED - RESCHEDULED",
        "DELIVERY ATTEMPTED - FAILED",
        "DELAYED - WEATHER",
        "DELAYED - LOGISTICS",
        "DELAYED - OTHER",
        "UNDELIVERABLE - ADDRESS ISSUE",
        "UNDELIVERABLE - RECIPIENT NOT AVAILABLE",
        "RETURNED TO SENDER",
      ],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

const Delivery = model("Delivery", deliverySchema);
export default Delivery;
