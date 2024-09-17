import { Schema, model } from "mongoose";

const trackingSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    method: {
      type: String,
      required: true,
      enum: ["STANDARD", "EXPRESS", "SAME DAY"],
      default: "STANDARD",
    },
    shippingDate: {
      type: Date,
      required: true,
      default: function () {
        return new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      },
    },
    event: {
      type: String,
      required: true,
      enum: [
        "ORDER RECEIVED",
        "ORDER VERIFIED",
        "PREPARING FOR SHIPMENT",
        "PICKUP ARRANGED",
        "PICKUP IN PROGRESS",
        "SHIPMENT DEPARTED FROM WAREHOUSE",
        "EN ROUTE TO FACILITY",
        "ARRIVED AT FACILITY",
        "OUT FOR DELIVERY",
        "DELIVERY IN PROGRESS",
        "DELIVERY SUCCESSFUL",
        "DELIVERY ATTEMPTED - RESCHEDULED",
        "DELIVERY ATTEMPTED - FAILED",
        "HELD AT CUSTOMS",
        "HELD AT DEPOT",
        "RETURN IN PROGRESS",
        "RETURN INITIATED",
        "RETURN DELIVERED TO WAREHOUSE",
        "RETURN PROCESS COMPLETE",
        "EXCEPTION - DELAY",
        "EXCEPTION - DAMAGE",
        "EXCEPTION - LOST",
      ],
      default: "ORDER RECEIVED",
    },
    status: {
      type: String,
      required: true,
      enum: [
        "ORDER RECEIVED",
        "AWAITING PICKUP",
        "PICKED UP",
        "IN TRANSIT - LOCAL FACILITY",
        "IN TRANSIT - REGIONAL FACILITY",
        "IN TRANSIT - NATIONAL FACILITY",
        "OUT FOR DELIVERY",
        "DELIVERED",
        "DELIVERY ATTEMPTED - RESCHEDULED",
        "DELIVERY ATTEMPTED - FAILED",
        "HELD AT CUSTOMS",
        "RETURNED TO SENDER",
        "EXCEPTION - DELAYED",
        "EXCEPTION - DAMAGED",
      ],
      default: "ORDER RECEIVED",
    },
  },
  { timestamps: true }
);

const Tracking = model("Tracking", trackingSchema);

export default Tracking;
