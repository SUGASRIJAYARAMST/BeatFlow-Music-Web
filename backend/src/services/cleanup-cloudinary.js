import dotenv from "dotenv";
import cloudinary from "../config/cloudinary.js";
import { connectDB } from "../config/db.js";
import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";

dotenv.config();

async function cleanupCloudinary() {
  try {
    await connectDB();
    console.log("Connected to database");

    const songs = await Song.find({});
    const albums = await Album.find({});

    const keepAudioIds = new Set();
    const keepImageIds = new Set();

    songs.forEach((song) => {
      if (song.audioPublicId) keepAudioIds.add(song.audioPublicId);
      if (song.imagePublicId) keepImageIds.add(song.imagePublicId);
    });

    albums.forEach((album) => {
      if (album.imagePublicId) keepImageIds.add(album.imagePublicId);
    });

    console.log(
      `Keeping ${keepAudioIds.size} audio files and ${keepImageIds.size} images`,
    );

    const audioResources = await cloudinary.api.resources({
      resource_type: "video",
      type: "upload",
      prefix: "beatflow",
      max_results: 500,
    });

    const imageResources = await cloudinary.api.resources({
      resource_type: "image",
      type: "upload",
      prefix: "beatflow",
      max_results: 500,
    });

    let deletedAudio = 0;
    let deletedImages = 0;

    for (const resource of audioResources.resources) {
      if (!keepAudioIds.has(resource.public_id)) {
        try {
          await cloudinary.uploader.destroy(resource.public_id, {
            resource_type: "video",
          });
          deletedAudio++;
          console.log(`Deleted audio: ${resource.public_id}`);
        } catch (e) {
          console.error(`Failed to delete ${resource.public_id}:`, e.message);
        }
      }
    }

    for (const resource of imageResources.resources) {
      if (!keepImageIds.has(resource.public_id)) {
        try {
          await cloudinary.uploader.destroy(resource.public_id);
          deletedImages++;
          console.log(`Deleted image: ${resource.public_id}`);
        } catch (e) {
          console.error(`Failed to delete ${resource.public_id}:`, e.message);
        }
      }
    }

    console.log(`\nCleanup complete!`);
    console.log(`Deleted ${deletedAudio} duplicate audio files`);
    console.log(`Deleted ${deletedImages} duplicate image files`);
    console.log(
      `Kept ${keepAudioIds.size} audio files and ${keepImageIds.size} images`,
    );

    process.exit(0);
  } catch (error) {
    console.error("Cleanup failed:", error);
    process.exit(1);
  }
}

cleanupCloudinary();
