import { Schema, model } from "mongoose";

const delivererSchema = new Schema(
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
    isAvailable: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

const Deliverer = model("Deliverer", delivererSchema);

export default Deliverer;
