import { Song } from "../models/song.model.js";
import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js";

export const downloadSong = async (req, res, next) => {
  try {
    const { songId } = req.params;
    const clerkId = req.userId;

    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    const song = await Song.findById(songId);
    if (!song) return res.status(404).json({ message: "Song not found" });

    const user = await User.findOne({ clerkId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isYearlyPremium =
      user.isPremium && user.subscriptionPlan === "yearly";
    const isOwner = user.role === "admin";

    if (!isYearlyPremium && !isOwner) {
      return res
        .status(403)
        .json({ message: "Yearly Pro plan required to download songs" });
    }

    if (!user.purchasedSongs.includes(songId)) {
      user.purchasedSongs.push(songId);
      await user.save();
    }

    const publicId = song.audioPublicId || song.audioUrl.split("/").slice(-2).join("/").split(".")[0];
    const fileName = `${song.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_beatflow.mp3`;

    const signedUrl = cloudinary.url(publicId, {
      resource_type: "video",
      secure: true,
      sign_url: true,
      type: "authenticated",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    });

    res.redirect(signedUrl);
  } catch (error) {
    console.error("Download error:", error);
    next(error);
  }
};

export const getDownloadedSongs = async (req, res, next) => {
  try {
    const clerkId = req.userId;
    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findOne({ clerkId }).populate({
      path: "purchasedSongs",
      options: { sort: { createdAt: -1 } },
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ purchasedSongs: user.purchasedSongs });
  } catch (error) {
    console.error("Get downloads error:", error);
    next(error);
  }
};
