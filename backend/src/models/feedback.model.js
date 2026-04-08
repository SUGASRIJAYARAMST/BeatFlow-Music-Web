import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  clerkId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String, required: true },
  reply: { type: String, default: "" },
  replyAt: { type: Date, default: null },
}, { timestamps: true });

feedbackSchema.index({ clerkId: 1 });
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ createdAt: 1 }, { expireAfterSeconds: 345600 }); // 4 days = 4 * 24 * 60 * 60 = 345600 seconds

export const Feedback =
  mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);