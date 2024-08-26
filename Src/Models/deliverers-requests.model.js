import { Schema, model } from "mongoose";

const delivererRequestSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    emailAddress: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    drivingLicense: String,
    governmentIdNumber: {
      type: String,
      required: true,
    },
    vehicle: {
      type: {
        type: String,
        required: true,
        enum: ["MOTORCYCLE", "SCOOTER", "VAN", "TRUCK", "CYCLE"],
      },
      plateNumber: String,
      capacity: String,
    },
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "PROCESSING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

const DelivererRequest = model("Deliverer Request", delivererRequestSchema);

export default DelivererRequest;
