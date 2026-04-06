import { Song } from "../models/song.model.js";
import User from "../models/user.model.js";
import axios from "axios";

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

    const response = await axios({
      method: "get",
      url: song.audioUrl,
      responseType: "stream",
    });

    const fileName = `${song.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_beatflow.mp3`;

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "audio/mpeg");

    response.data.pipe(res);
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
