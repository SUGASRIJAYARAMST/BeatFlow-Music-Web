import mongoose from "mongoose";

const playlistSongSchema = new mongoose.Schema(
  {
    song: { type: mongoose.Schema.Types.ObjectId, ref: "Song", required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    creatorId: { type: String, required: true },
    songs: [playlistSongSchema],
    isPublic: { type: Boolean, default: true },
    organizationType: {
      type: String,
      enum: ["list", "tree", "genre", "artist"],
      default: "list",
    },
  },
  { timestamps: true },
);

playlistSchema.index({ creatorId: 1 });
playlistSchema.index({ isPublic: 1 });

export const Playlist =
  mongoose.models.Playlist || mongoose.model("Playlist", playlistSchema);
