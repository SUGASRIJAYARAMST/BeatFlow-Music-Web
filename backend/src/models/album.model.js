import mongoose from "mongoose";

const albumSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    artist: { type: String, required: true },
    genre: { type: String, default: "Other" },
    imageUrl: { type: String, required: true },
    imagePublicId: { type: String, default: "" },
    releaseYear: { type: Number, required: true },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
    isPremium: { type: Boolean, default: false },
  },
  { timestamps: true },
);

albumSchema.index({ title: "text", artist: "text", genre: "text" });
albumSchema.index({ genre: 1 });
albumSchema.index({ createdAt: -1 });

export const Album =
  mongoose.models.Album || mongoose.model("Album", albumSchema);
