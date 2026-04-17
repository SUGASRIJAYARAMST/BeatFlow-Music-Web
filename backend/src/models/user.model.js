import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    imageUrl: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    clerkId: { type: String, required: true, unique: true },
    likedSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
    isPremium: { type: Boolean, default: false },
    subscriptionPlan: {
      type: String,
      enum: ["none", "daily", "monthly", "yearly", "admin"],
      default: "none",
    },
    subscriptionExpiry: { type: Date, default: null },
    notifications: { type: Boolean, default: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    purchasedSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
    passwordChangeExpiry: { type: Date, default: null },
    currentPassword: { type: String, default: null },
    previousPassword: { type: String, default: null },
    walletPin: { type: String, default: null },
    playlists: [
      {
        name: { type: String, required: true },
        description: { type: String, default: "" },
        organizationType: {
          type: String,
          enum: ["list", "tree", "genre", "artist"],
          default: "list",
        },
        songs: [{
          song: { type: mongoose.Schema.Types.ObjectId, ref: "Song" },
          addedAt: { type: Date, default: Date.now }
        }],
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });
userSchema.index({ subscriptionExpiry: 1 });

const User = mongoose.model("User", userSchema);
export default User;
