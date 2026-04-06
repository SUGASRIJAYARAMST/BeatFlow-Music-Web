import mongoose from "mongoose";

const pinResetRequestSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    newPin: { type: String, default: null },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedBy: { type: String, default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const PinResetRequest =
  mongoose.models.PinResetRequest ||
  mongoose.model("PinResetRequest", pinResetRequestSchema);
