import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";
import cloudinary from "../config/cloudinary.js";
import { searchSongMetadata } from "../config/musicApi.js";
import { parseFile } from "music-metadata";
import path from "path";

import User from "../models/user.model.js";

const uploadToCloudinary = async (file) => {
  try {
    // Determine resource type based on file mimetype
    let resourceType = "video";

    if (file.mimetype.startsWith("image/")) {
      resourceType = "image";
    }

    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      resource_type: resourceType,
      folder: resourceType === "video" ? "songs" : "images",
      // Use eager transformations for better performance
      eager: [
        { transformation: [{ quality: "auto", bit_rate: "128k" }, { fetch_format: "auto" }] }
      ],
      eager_async: true
    });

    const optimizedUrl =
      resourceType === "video"
        ? cloudinary.url(result.public_id, {
            resource_type: "video",
            format: "mp3",
            transformation: [
              { quality: "auto", bit_rate: "128k" },
              { fetch_format: "auto" }
            ],
            flags: "streaming_attachment"
          })
        : result.secure_url;

    return {
      url: optimizedUrl,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error("Error uploading to cloudinary:", error);

    if (error.message && error.message.includes("File size too large")) {
      throw new Error(
        "File exceeds Cloudinary's limit (10MB for free accounts). Please compress your file or upgrade your Cloudinary plan.",
      );
    }

    throw new Error("Error uploading to cloudinary");
  }
};
const checkSongAccess = async (song, clerkId) => {
  if (!song.isPremium) return true;
  if (!clerkId) return false;
  const user = await User.findOne({ clerkId });
  if (!user) return false;
  if (user.role === "admin" || user.isPremium) return true;
  return user.purchasedSongs.includes(song._id);
};

const parsePagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const SONG_LIST_FIELDS =
  "title artist genre duration imageUrl audioUrl isFeatured isTrending isPremium albumId createdAt";

// export const getAllSongs = async (req, res, next) => {
//     try {
//         res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
//         res.setHeader("Pragma", "no-cache");
//         res.setHeader("Expires", "0");

//         const songs = await Song.find({})
//             .select(SONG_LIST_FIELDS)
//             .sort({ createdAt: -1 })
//             .lean();
//         res.status(200).json({ songs });
//     } catch (error) {
//         next(error);
//     }
// };

export const getAllSongs = async (req, res, next) => {
  try {
    res.setHeader("Cache-Control", "public, max-age=300");

    const songs = await Song.find({})
      .select(SONG_LIST_FIELDS)
      .sort({ createdAt: -1 })
      .lean();

    const optimizedSongs = songs.map((song) => ({
      ...song,
      audioUrl: song.audioUrl?.includes("f_mp3")
        ? song.audioUrl
        : song.audioUrl?.replace("/upload/", "/upload/f_mp3,br_128k,q_auto/"),
    }));

    res.status(200).json({ songs: optimizedSongs });
  } catch (error) {
    next(error);
  }
};

export const getFeaturedSongs = async (req, res, next) => {
  try {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const songs = await Song.find({ isFeatured: true })
      .select(SONG_LIST_FIELDS)
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    res.status(200).json(songs);
  } catch (error) {
    next(error);
  }
};

export const getMadeForYouSongs = async (req, res, next) => {
  try {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const songs = await Song.find({})
      .select(SONG_LIST_FIELDS)
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();
    res.status(200).json(songs);
  } catch (error) {
    next(error);
  }
};

export const getTrendingSongs = async (req, res, next) => {
  try {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const songs = await Song.find({ isTrending: true })
      .select(SONG_LIST_FIELDS)
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    res.status(200).json(songs);
  } catch (error) {
    next(error);
  }
};

export const getSongById = async (req, res, next) => {
  try {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const song = await Song.findById(req.params.id).populate(
      "albumId",
      "title artist imageUrl",
    );
    if (!song) return res.status(404).json({ message: "Song not found" });

    const hasAccess = await checkSongAccess(song, req.userId);
    const songData = song.toObject();
    if (!hasAccess) {
      delete songData.audioUrl;
    }

    res.status(200).json({ ...songData, hasAccess });
  } catch (error) {
    next(error);
  }
};

export const getSongsByGenre = async (req, res, next) => {
  try {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const songs = await Song.find({ genre: req.params.genre })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.status(200).json(songs);
  } catch (error) {
    next(error);
  }
};

export const getSongsByArtist = async (req, res, next) => {
  try {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const songs = await Song.find({ artist: req.params.artist })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.status(200).json(songs);
  } catch (error) {
    next(error);
  }
};

export const getRecentSongs = async (req, res, next) => {
  try {
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate",
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const songs = await Song.find({ albumId: { $in: [null, undefined] } })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    res.status(200).json(songs);
  } catch (error) {
    next(error);
  }
};

export const createSong = async (req, res, next) => {
  try {
    if (!req.files || !req.files.audioFile || !req.files.imageFile) {
      return res.status(400).json({
        success: false,
        message: "Please upload audio and image files",
      });
    }

     const {
       title,
       artist,
       genre,
       albumId,
       duration,
       isFeatured,
       isTrending,
       isPremium,
     } = req.body;

     // Log the received data for debugging
     console.log('Received song data:', {
       title,
       artist,
       genre,
       albumId,
       duration,
       isFeatured,
       isTrending,
       isPremium,
       hasAudioFile: !!req.files?.audioFile,
       hasImageFile: !!req.files?.imageFile
     });

    const existingSong = await Song.findOne({
      title: { $regex: new RegExp(`^${title}$`, "i") },
      artist: { $regex: new RegExp(`^${artist}$`, "i") },
    });

    if (existingSong) {
      return res.status(400).json({
        success: false,
        message: "This song already exists!",
      });
    }

    const audioFile = req.files.audioFile;
    const imageFile = req.files.imageFile;

    console.log(
      "Audio file mimetype:",
      audioFile.mimetype,
      "size:",
      Math.round((audioFile.size / 1024 / 1024) * 100) / 100 + "MB",
    );
    console.log(
      "Image file mimetype:",
      imageFile.mimetype,
      "size:",
      Math.round((imageFile.size / 1024 / 1024) * 100) / 100 + "MB",
    );

    // const allowedAudioTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/x-wav"];
    // const allowedImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

const allowedAudioTypes = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "video/mp4" // Some browsers send MP4 as video
];

const allowedImageTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
  "image/tiff"
];

     console.log(`Checking audio file type: ${audioFile.mimetype}`);
     console.log(`Allowed audio types: ${JSON.stringify(allowedAudioTypes)}`);
     if (!allowedAudioTypes.includes(audioFile.mimetype)) {
       return res.status(400).json({
         message: `Invalid audio format (${audioFile.mimetype}). Allowed types: ${allowedAudioTypes.join(', ')}`,
       });
     }
     console.log(`Checking image file type: ${imageFile.mimetype}`);
     console.log(`Allowed image types: ${JSON.stringify(allowedImageTypes)}`);
     if (!allowedImageTypes.includes(imageFile.mimetype)) {
       return res.status(400).json({
         message: `Invalid image format (${imageFile.mimetype}). Allowed types: ${allowedImageTypes.join(', ')}`,
       });
     }

    let audioDuration = parseInt(duration) || 0;
    if (!audioDuration) {
      try {
        const audioMetadata = await parseFile(audioFile.tempFilePath);
        audioDuration = Math.round(audioMetadata.format.duration || 0);
      } catch (e) {
        console.log("Could not extract duration:", e.message);
      }
    }

     console.log('Starting file uploads to Cloudinary...');
     try {
       const [audioUpload, imageUpload] = await Promise.all([
         uploadToCloudinary(audioFile),
         uploadToCloudinary(imageFile),
       ]);
       console.log('File uploads successful:', { 
         audioUrl: audioUpload.url, 
         imageUrl: imageUpload.url 
       });
     } catch (uploadError) {
       console.error('Cloudinary upload failed:', uploadError);
       throw uploadError;
     }

    const song = new Song({
      title,
      artist,
      genre: genre || "Other",
      duration: audioDuration,
      audioUrl: audioUpload.url,
      audioPublicId: audioUpload.publicId,
      imageUrl: imageUpload.url,
      imagePublicId: imageUpload.publicId,
      albumId: albumId || null,
      isFeatured: isFeatured === "true",
      isTrending: isTrending === "true",
      isPremium: isPremium === "true",
    });

    await song.save();
    if (albumId) {
      await Album.findByIdAndUpdate(albumId, { $push: { songs: song._id } });
    }
    global.cache?.flushAll();
    res.status(201).json({ message: "Song created successfully", song });
  } catch (error) {
    console.log("Error in createSong", error);
    next(error);
  }
};

export const updateSong = async (req, res, next) => {
  try {
    const {
      title,
      artist,
      genre,
      duration,
      isFeatured,
      isTrending,
      isPremium,
    } = req.body;
    const updatedSong = await Song.findByIdAndUpdate(
      req.params.id,
      { title, artist, genre, duration, isFeatured, isTrending, isPremium },
      { new: true },
    );
    if (!updatedSong)
      return res.status(404).json({ message: "Song not found" });
    global.cache?.flushAll();
    res.status(200).json(updatedSong);
  } catch (error) {
    next(error);
  }
};

export const deleteSong = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ message: "Song not found" });

    if (song.albumId) {
      await Album.findByIdAndUpdate(song.albumId, {
        $pull: { songs: song._id },
      });
    }

    if (song.audioPublicId) {
      await cloudinary.uploader.destroy(song.audioPublicId, {
        resource_type: "video",
      });
    } else if (song.audioUrl) {
      const publicId = song.audioUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
    }
    if (song.imagePublicId) {
      await cloudinary.uploader.destroy(song.imagePublicId);
    } else if (song.imageUrl) {
      const publicId = song.imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    await Song.findByIdAndDelete(req.params.id);
    global.cache?.flushAll();
    res
      .status(200)
      .json({ success: true, message: "Song deleted successfully" });
  } catch (error) {
    console.log("Error deleting song", error);
    next(error);
  }
};

export const search = async (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(200).json({ songs: [], albums: [] });

    const cacheKey = `search_${query.toLowerCase().trim()}`;
    const cached = global.cache?.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    // Trim query to prevent issues with whitespace-only searches
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return res.status(200).json({ songs: [], albums: [] });

    const sanitizedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const [songs, albums] = await Promise.all([
      Song.find(
        {
          $or: [
            { title: { $regex: sanitizedQuery, $options: "i" } },
            { artist: { $regex: sanitizedQuery, $options: "i" } },
            { genre: { $regex: sanitizedQuery, $options: "i" } },
          ],
        },
        {},
      )
        .limit(15)
        .lean(),
      Album.find({
        $or: [
          { title: { $regex: sanitizedQuery, $options: "i" } },
          { artist: { $regex: sanitizedQuery, $options: "i" } },
        ],
      })
        .limit(10)
        .lean(),
    ]);

    const result = { songs, albums };
    global.cache?.set(cacheKey, result, 60);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
