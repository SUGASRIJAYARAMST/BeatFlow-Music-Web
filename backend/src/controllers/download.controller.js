import { v2 as cloudinary } from "cloudinary";
import { Song } from "../models/song.model.js";
import User from "../models/user.model.js";

export const downloadSong = async (req, res, next) => {
  try {
    const { songId } = req.params;
    const clerkId = req.userId;

    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    const [song, user] = await Promise.all([
      Song.findById(songId).lean(),
      User.findOne({ clerkId }).lean(),
    ]);

    if (!song) return res.status(404).json({ message: "Song not found" });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isOwner = user.role === "admin";
    const isAnnualPro = user.isPremium && user.subscriptionPlan === "yearly";

    if (!isOwner && !isAnnualPro) {
      return res.status(403).json({ message: "Yearly Pro plan required" });
    }

    if (!user.purchasedSongs?.includes(songId)) {
      await User.findOneAndUpdate(
        { clerkId },
        { $addToSet: { purchasedSongs: songId } },
      );
    }

    let publicId = song.audioPublicId;

    if (!publicId) {
      const urlParts = song.audioUrl.match(/\/upload\/(.+)$/);
      if (urlParts) {
        publicId = urlParts[1].replace(/,.*$/, "").replace(/\?.*$/, "");
      }
    }

    if (!publicId) {
      return res.status(404).json({ message: "Audio file not found" });
    }

    const downloadUrl = cloudinary.url(publicId, {
      resource_type: "video",
      format: "mp3",
      type: "upload",
      attachment: song.title.replace(/[^a-z0-9]/gi, "_").toLowerCase() + "_beatflow.mp3",
    });

    if (!downloadUrl) {
      return res.status(500).json({ message: "Failed to generate download URL" });
    }

    res.redirect(downloadUrl);
  } catch (error) {
    console.error("Download error:", error.message);
    res.status(500).json({ message: "Download failed" });
  }
};

export const getDownloadedSongs = async (req, res, next) => {
  try {
    const clerkId = req.userId;
    if (!clerkId) return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findOne({ clerkId })
      .populate({ path: "purchasedSongs" })
      .lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ purchasedSongs: user.purchasedSongs });
  } catch (error) {
    console.error("Get downloads error:", error);
    next(error);
  }
};
