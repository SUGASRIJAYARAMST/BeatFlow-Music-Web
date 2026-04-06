import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    discount: { type: Number, default: 0 },
    planId: { type: String, default: null },
    active: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Offer =
  mongoose.models.Offer || mongoose.model("Offer", offerSchema);
