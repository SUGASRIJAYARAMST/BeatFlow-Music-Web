import User from "../models/user.model.js";
import { Song } from "../models/song.model.js";

export const getUserPlaylists = async (req, res, next) => {
  try {
    const user = await User.findOne({ clerkId: req.userId });
    if (!user) return res.status(404).json({ message: "User not found" });
    
    let migrated = false;
    for (const p of user.playlists) {
      if (p.songs.some(s => typeof s === "string" || !s.song)) {
        p.songs = p.songs.map(s => ({
          song: s.song || s,
          addedAt: s.addedAt || new Date()
        }));
        migrated = true;
      }
    }
    if (migrated) await user.save();
    
    const playlists = (user.playlists || []).map(p => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      organizationType: p.organizationType,
      songs: p.songs?.map(s => ({
        song: s.song || s,
        addedAt: s.addedAt?.toISOString() || new Date().toISOString()
      })) || [],
      createdAt: p.createdAt
    }));
    res.status(200).json(playlists);
  } catch (error) {
    console.error("❌ getUserPlaylists error:", error);
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

    // Migrate old songs format if needed
    const needsMigration = playlist.songs.some(s => typeof s === "string" || !s.song);
    if (needsMigration) {
      playlist.songs = playlist.songs.map(s => ({
        song: s.song || s,
        addedAt: s.addedAt || new Date()
      }));
      await user.save();
    }

    const populated = await User.findOne({ clerkId: req.userId }).populate({
      path: "playlists.songs.song",
      model: "Song",
    });

    const pl = populated.playlists.id(req.params.id);
    
    if (!pl) return res.status(404).json({ message: "Playlist not found" });
    
    const result = {
      _id: pl._id,
      name: pl.name,
      description: pl.description,
      organizationType: pl.organizationType,
      songs: pl.songs?.map(s => ({
        song: s.song || s,
        addedAt: s.addedAt?.toISOString() || new Date().toISOString()
      })) || [],
      createdAt: pl.createdAt
    };
    
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ getPlaylistById error:", error);
    next(error);
  }
};

export const createPlaylist = async (req, res, next) => {
  try {
    const { name, description, organizationType } = req.body;
    const user = await User.findOne({ clerkId: req.userId });
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

    // Migrate old format if needed
    if (playlist.songs.some(s => typeof s === "string" || !s.song)) {
      playlist.songs = playlist.songs.map(s => ({
        song: s.song || s,
        addedAt: s.addedAt || new Date()
      }));
    }

    const exists = playlist.songs.some((s) => {
      const songRef = s.song || s;
      return songRef?.toString() === songId;
    });
    if (exists) return res.status(400).json({ message: "Song already in playlist" });

    playlist.songs.push({ song: songId, addedAt: new Date() });
    await user.save();

    const populated = await User.findOne({ clerkId: req.userId }).populate({
      path: "playlists.songs.song",
      model: "Song",
    });

    const pl = populated.playlists.id(req.params.id);
    const result = {
      _id: pl._id,
      name: pl.name,
      description: pl.description,
      organizationType: pl.organizationType,
      songs: pl.songs?.map(s => ({
        song: s.song || s,
        addedAt: s.addedAt?.toISOString() || new Date().toISOString()
      })) || [],
      createdAt: pl.createdAt
    };
    
    console.log("✅ Song added to playlist:", result.name);
    res.status(200).json({ message: "Song added", playlist: result });
  } catch (error) {
    console.error("❌ Add song to playlist error:", error);
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

    // Migrate old format if needed
    if (playlist.songs.some(s => typeof s === "string" || !s.song)) {
      playlist.songs = playlist.songs.map(s => ({
        song: s.song || s,
        addedAt: s.addedAt || new Date()
      }));
    }

    playlist.songs = playlist.songs.filter((s) => {
      const songRef = s.song || s;
      return songRef?.toString() !== req.params.songId;
    });
    await user.save();

    const populated = await User.findOne({ clerkId: req.userId }).populate({
      path: "playlists.songs.song",
      model: "Song",
    });

    const pl = populated.playlists.id(req.params.id);
    const result = {
      _id: pl._id,
      name: pl.name,
      description: pl.description,
      organizationType: pl.organizationType,
      songs: pl.songs?.map(s => ({
        song: s.song || s,
        addedAt: s.addedAt?.toISOString() || new Date().toISOString()
      })) || [],
      createdAt: pl.createdAt
    };
    
    res.status(200).json({ message: "Song removed", playlist: result });
  } catch (error) {
    next(error);
  }
};
