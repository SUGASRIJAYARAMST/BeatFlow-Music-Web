import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    clerkId: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0, min: 0 },
    transactions: [
      {
        type: { type: String, enum: ["credit", "debit"], required: true },
        amount: { type: Number, required: true },
        description: { type: String, default: "" },
        orderId: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

export const Wallet =
  mongoose.models.Wallet || mongoose.model("Wallet", walletSchema);
