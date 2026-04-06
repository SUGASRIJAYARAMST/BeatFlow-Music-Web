import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ["info", "update", "maintenance", "promotion", "offer"],
      default: "info",
    },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

announcementSchema.index({ isActive: 1 });
announcementSchema.index({ createdAt: -1 });

export const Announcement =
  mongoose.models.Announcement ||
  mongoose.model("Announcement", announcementSchema);
