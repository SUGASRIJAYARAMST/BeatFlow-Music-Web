import User from "../models/user.model.js";
import { Song } from "../models/song.model.js";

export const getUserPlaylists = async (req, res, next) => {
  try {
    const user = await User.findOne({ clerkId: req.userId }).populate(
      "playlists.songs",
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    const playlists = (user.playlists || []).map((p) => p.toObject());
    res.status(200).json(playlists);
  } catch (error) {
    next(error);
  }
};

export const getPlaylistById = async (req, res, next) => {
  try {
    const user = await User.findOne({ clerkId: req.userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const playlist = user.playlists.id(req.params.id);
    if (!playlist)
      return res.status(404).json({ message: "Playlist not found" });

    const populated = await User.findOne({ clerkId: req.userId }).populate(
      "playlists.songs",
    );
    const pl = populated.playlists.id(req.params.id);
    res.status(200).json(pl);
  } catch (error) {
    next(error);
  }
};

export const createPlaylist = async (req, res, next) => {
  try {
    console.log("Create playlist - userId:", req.userId);
    const { name, description, organizationType } = req.body;
    console.log("Playlist data:", { name, description, organizationType });
    const user = await User.findOne({ clerkId: req.userId });
    console.log("User found:", !!user, user?._id?.toString());
    if (!user) return res.status(404).json({ message: "User not found" });

    user.playlists.push({
      name,
      description: description || "",
      organizationType: organizationType || "list",
      songs: [],
      createdAt: new Date(),
    });
    await user.save();
    console.log("Playlist saved. Total playlists:", user.playlists.length);

    const created = user.playlists[user.playlists.length - 1];
    res.status(201).json({ message: "Playlist created", playlist: created });
  } catch (error) {
    console.error("Create playlist error:", error);
    next(error);
  }
};

export const updatePlaylist = async (req, res, next) => {
  try {
    const user = await User.findOne({ clerkId: req.userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const playlist = user.playlists.id(req.params.id);
    if (!playlist)
      return res.status(404).json({ message: "Playlist not found" });

    const { name, description, organizationType } = req.body;
    if (name) playlist.name = name;
    if (description !== undefined) playlist.description = description;
    if (organizationType) playlist.organizationType = organizationType;

    await user.save();
    res.status(200).json({ message: "Playlist updated", playlist });
  } catch (error) {
    next(error);
  }
};

export const deletePlaylist = async (req, res, next) => {
  try {
    const user = await User.findOne({ clerkId: req.userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const before = user.playlists.length;
    user.playlists = user.playlists.filter(
      (p) => p._id.toString() !== req.params.id,
    );
    if (user.playlists.length === before)
      return res.status(404).json({ message: "Playlist not found" });

    await user.save();
    res.status(200).json({ message: "Playlist deleted" });
  } catch (error) {
    next(error);
  }
};

export const addSongToPlaylist = async (req, res, next) => {
  try {
    const { songId } = req.body;
    if (!songId) return res.status(400).json({ message: "songId required" });

    const user = await User.findOne({ clerkId: req.userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const playlist = user.playlists.id(req.params.id);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    const exists = playlist.songs.some((s) => s.toString() === songId);
    if (exists) return res.status(400).json({ message: "Song already in playlist" });

    playlist.songs.push(songId);
    await user.save();

    const updated = await User.findOne({ clerkId: req.userId })
      .populate("playlists.songs")
      .lean();
    
    const playlistObj = updated.playlists.id(req.params.id);
    res.status(200).json({ message: "Song added", playlist: playlistObj });
  } catch (error) {
    console.error("Add song error:", error);
    next(error);
  }
};

export const removeSongFromPlaylist = async (req, res, next) => {
  try {
    const user = await User.findOne({ clerkId: req.userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const playlist = user.playlists.id(req.params.id);
    if (!playlist)
      return res.status(404).json({ message: "Playlist not found" });

    playlist.songs = playlist.songs.filter(
      (s) => s.toString() !== req.params.songId,
    );
    await user.save();

    const updated = await User.findOne({ clerkId: req.userId }).populate(
      "playlists.songs",
    );
    res
      .status(200)
      .json({
        message: "Song removed",
        playlist: updated.playlists.id(req.params.id),
      });
  } catch (error) {
    next(error);
  }
};
