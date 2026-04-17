import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clerkId: { type: String, required: true },
    plan: {
      type: String,
      enum: ["daily", "monthly", "yearly", "wallet_topup"],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    cashfreeOrderId: { type: String, required: true },
    cashfreePaymentId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    subscriptionStart: { type: Date },
    subscriptionEnd: { type: Date },
  },
  { timestamps: true },
);

paymentSchema.index({ clerkId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ cashfreeOrderId: 1 });

export const Payment =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
