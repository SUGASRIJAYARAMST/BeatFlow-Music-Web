import mongoose from "mongoose";

const songSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    artist: { type: String, required: true },
    genre: { type: String, default: "Other" },
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String, default: "" },
    audioUrl: { type: String, required: true },
    audioPublicId: { type: String, default: "" },
    duration: { type: Number, required: true },
    albumId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Album",
      required: false,
    },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    price: { type: Number, default: 0 },
  },
  { timestamps: true },
);

songSchema.index({ title: "text", artist: "text", genre: "text" });
songSchema.index({ albumId: 1 });
songSchema.index({ isFeatured: 1 });
songSchema.index({ isTrending: 1 });
songSchema.index({ genre: 1 });
songSchema.index({ createdAt: -1 });
songSchema.index({ genre: 1, createdAt: -1 });
songSchema.index({ artist: 1, createdAt: -1 });

export const Song = mongoose.models.Song || mongoose.model("Song", songSchema);
