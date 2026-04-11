import mongoose from "mongoose";
import { Album } from "../models/album.model.js";
import { Song } from "../models/song.model.js";
import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js";

import { getAuth } from "@clerk/express";

const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/flac",
  "audio/aac",
];
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_AUDIO_SIZE = 1500 * 1024 * 1024;
const MAX_IMAGE_SIZE = 1000 * 1024 * 1024;

const validateFile = (file, allowedTypes, maxSize, fieldName) => {
  if (!file) return;
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(
      `Invalid file type for ${fieldName}. Allowed: ${allowedTypes.join(", ")}`,
    );
  }
  if (file.size > maxSize) {
    throw new Error(
      `File too large for ${fieldName}. Max: ${Math.round(maxSize / 1024 / 1024)}MB`,
    );
  }
};

const uploadToCloudinary = async (file, resourceType = "video") => {
  try {
    // Determine resource type based on file mimetype if not explicitly provided
    if (resourceType === "video" && file.mimetype) {
      if (file.mimetype.startsWith("image/")) {
        resourceType = "image";
      }
    }

    // Log file details for debugging
    const fileSizeMB = Math.round(((file.size || 0) / 1024 / 1024) * 100) / 100;
    console.log(
      `Uploading file: ${file.name || "unknown"} (${file.mimetype}) - Size: ${fileSizeMB}MB`,
    );

    let uploadResult;
    if (file.buffer) {
      uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: resourceType },
          (error, result) => (error ? reject(error) : resolve(result)),
        );
        stream.end(file.buffer);
      });
    } else {
      uploadResult = await cloudinary.uploader.upload(file.tempFilePath, {
        resource_type: resourceType,
      });
    }
    return {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    };
  } catch (error) {
    console.log("Error uploading to cloudinary", error);
    // Provide more specific error message for Cloudinary file size limits
    if (error.message && error.message.includes("File size too large")) {
      const fileSizeMB =
        Math.round(((file.size || 0) / 1024 / 1024) * 100) / 100;
      throw new Error(
        `File exceeds Cloudinary's limit (10MB for free accounts). Your file is ${fileSizeMB}MB. Please compress your file or upgrade your Cloudinary plan.`,
      );
    }
    throw new Error("Error uploading to cloudinary");
  }
};

const destroyCloudinaryAsset = async (publicId, resourceType = "image") => {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    console.log("Error deleting from Cloudinary:", publicId, error.message);
  }
};

export const getAllAlbums = async (req, res, next) => {
  try {
    const albums = await Album.find()
      .select(
        "title artist genre imageUrl releaseYear songs createdAt updatedAt isPremium",
      )
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ albums });
  } catch (error) {
    next(error);
  }
};

export const getAlbumById = async (req, res, next) => {
  try {
    const album = await Album.findById(req.params.id).populate("songs");
    if (!album) return res.status(404).json({ message: "Album not found" });

    if (album.isPremium) {
      try {
        const { userId } = getAuth(req);
        if (userId) {
          const user = await User.findOne({ clerkId: userId });
          // Check if user has premium subscription that hasn't expired
          const hasValidSubscription = user && 
            (user.role === "admin" || 
            (user.isPremium && (!user.subscriptionExpiry || new Date() <= user.subscriptionExpiry)));
          
          if (hasValidSubscription) {
            return res.status(200).json(album);
          }
        }
      } catch (authError) {
        // Continue to permission denied response
      }
      return res
        .status(403)
        .json({ message: "Pro subscription required to access this album" });
    }

    res.status(200).json(album);
  } catch (error) {
    next(error);
  }
};

export const createAlbum = async (req, res, next) => {
  try {
    const { title, artist, genre, releaseYear } = req.body;
    const imageFile = req.files?.imageFile;

    if (imageFile) {
      validateFile(imageFile, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, "imageFile");
    }

    const imageUpload = imageFile
      ? await uploadToCloudinary(imageFile, "image")
      : { url: "", publicId: "" };

    const album = new Album({
      title,
      artist,
      genre: genre || "Other",
      releaseYear: parseInt(releaseYear) || new Date().getFullYear(),
      imageUrl: imageUpload.url,
      imagePublicId: imageUpload.publicId,
      songs: [],
    });
    await album.save();
    global.cache?.flushAll();
    global.broadcastEvent?.("album-created", album);
    res.status(201).json({ message: "Album created successfully", album });
  } catch (error) {
    console.log("Error creating album", error);
    next(error);
  }
};

export const createAlbumWithSongs = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { title, artist, genre, releaseYear, songs, isPremium } = req.body;
    const imageFiles = req.files?.imageFile;
    const imageFile = Array.isArray(imageFiles) ? imageFiles[0] : imageFiles;

    if (imageFile) {
      validateFile(imageFile, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, "imageFile");
    }

    const imageUpload = imageFile
      ? await uploadToCloudinary(imageFile, "image")
      : { url: "", publicId: "" };

    const album = new Album({
      title,
      artist,
      genre: genre || "Other",
      releaseYear: parseInt(releaseYear) || new Date().getFullYear(),
      imageUrl: imageUpload.url,
      imagePublicId: imageUpload.publicId,
      isPremium: isPremium === "true",
      songs: [],
    });
    await album.save({ session });

    const parsedSongs = typeof songs === "string" ? JSON.parse(songs) : songs;
    const validSongs = parsedSongs.filter((songData) => {
      const audioFiles = req.files?.[`audio_${songData.index}`];
      return Array.isArray(audioFiles) ? audioFiles[0] : audioFiles;
    });

    const uploadTasks = validSongs.map((songData) => {
      const audioFiles = req.files?.[`audio_${songData.index}`];
      const audioFile = Array.isArray(audioFiles) ? audioFiles[0] : audioFiles;
      const songImageFiles = req.files?.[`songImage_${songData.index}`];
      const songImageFile = Array.isArray(songImageFiles)
        ? songImageFiles[0]
        : songImageFiles;

      const uploadPromises = [uploadToCloudinary(audioFile, "video")];
      if (songData.hasImage && songImageFile) {
        uploadPromises.push(uploadToCloudinary(songImageFile, "image"));
      }

      return Promise.all(uploadPromises).then((results) => ({
        songData,
        audioUpload: results[0],
        songImageUpload: results[1] || imageUpload,
      }));
    });

    const uploadResults = await Promise.all(uploadTasks);

    const createdSongs = [];
    for (const { songData, audioUpload, songImageUpload } of uploadResults) {
      const song = new Song({
        title: songData.title,
        artist,
        genre: genre || "Other",
        duration: parseInt(songData.duration) || 0,
        audioUrl: audioUpload.url,
        audioPublicId: audioUpload.publicId,
        imageUrl: songImageUpload.url,
        imagePublicId: songImageUpload.publicId,
        albumId: album._id,
      });
      await song.save({ session });
      album.songs.push(song._id);
      createdSongs.push(song);
    }

    await album.save({ session });
    await session.commitTransaction();
    
    // Clear song and album-related caches to ensure fresh data
    global.cache?.del("all_songs");
    global.cache?.del("featured_songs");
    global.cache?.del("trending_songs");
    global.cache?.del("made_for_you");
    global.cache?.del("recent_songs");
    global.cache?.del("albums");
    
    console.log("✅ Album with songs created successfully:", album.title, "with", createdSongs.length, "songs");
    global.broadcastEvent?.("album-created", album);

    res
      .status(201)
      .json({
        message: "Album with songs created successfully",
        album,
        songs: createdSongs,
      });
  } catch (error) {
    await session.abortTransaction();
    console.log("Error creating album with songs, rolled back:", error.message);
    next(error);
  } finally {
    session.endSession();
  }
};

export const updateAlbum = async (req, res, next) => {
  try {
    // Authorization check - only admin can update albums
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized - Admin access required" });
    }
    
    const { title, artist, genre, releaseYear } = req.body;
    const updatedAlbum = await Album.findByIdAndUpdate(
      req.params.id,
      { title, artist, genre, releaseYear },
      { new: true },
    );
    if (!updatedAlbum)
      return res.status(404).json({ message: "Album not found" });
    
    // Clear album-related caches
    global.cache?.del("albums");
    
    console.log("✅ Album updated:", updatedAlbum.title);
    res.status(200).json(updatedAlbum);
  } catch (error) {
    console.error("❌ Error updating album:", error);
    next(error);
  }
};

export const deleteAlbum = async (req, res, next) => {
  try {    // Authorization check - only admin can delete albums
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized - Admin access required" });
    }
        const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ message: "Album not found" });

    const songs = await Song.find({ albumId: album._id });
    const publicIdsToDelete = [];

    for (const song of songs) {
      if (song.audioPublicId) {
        publicIdsToDelete.push(song.audioPublicId);
      }
      if (song.imagePublicId && song.imagePublicId !== album.imagePublicId) {
        publicIdsToDelete.push(song.imagePublicId);
      }
    }

    if (album.imagePublicId) {
      publicIdsToDelete.push(album.imagePublicId);
    }

    await Song.deleteMany({ albumId: album._id });
    await Album.findByIdAndDelete(req.params.id);
    
    // Clear song and album-related caches
    global.cache?.del("all_songs");
    global.cache?.del("featured_songs");
    global.cache?.del("trending_songs");
    global.cache?.del("made_for_you");
    global.cache?.del("recent_songs");
    global.cache?.del("albums");
    
    console.log("✅ Album deleted successfully:", album.title);
    global.broadcastEvent?.("album-deleted", { id: req.params.id });
    res
      .status(200)
      .json({ success: true, message: "Album deleted successfully" });

    (async () => {
      try {
        const videoIds = publicIdsToDelete.filter((id) =>
          id.includes("/video/"),
        );
        const imageIds = publicIdsToDelete.filter(
          (id) => !id.includes("/video/"),
        );
        const promises = [];
        if (videoIds.length > 0)
          promises.push(
            cloudinary.api.delete_resources(videoIds, {
              resource_type: "video",
            }),
          );
        if (imageIds.length > 0)
          promises.push(cloudinary.api.delete_resources(imageIds));
        if (promises.length > 0) await Promise.all(promises);
      } catch (err) {
        console.log("Background Cloudinary cleanup error:", err.message);
      }
    })();
  } catch (error) {
    console.log("Error deleting album", error);
    next(error);
  }
};
