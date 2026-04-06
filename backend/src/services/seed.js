import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { parseFile } from "music-metadata";
import cloudinary from "../config/cloudinary.js";
import { connectDB } from "../config/db.js";
import { Song } from "../models/song.model.js";
import { Album } from "../models/album.model.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const songsDir = path.join(__dirname, "../../../frontend/public/songs");
const coversDir = path.join(__dirname, "../../../frontend/public/cover-images");
const logoPath = path.join(__dirname, "../../../frontend/public/mylogo.png");

// async function uploadIfNotExists(filePath, resourceType) {
//   try {
//     const fileSize = fs.statSync(filePath).size;
//     const allResources = await cloudinary.api.resources({
//       resource_type: resourceType,
//       type: "upload",
//       prefix: "beatflow",
//       max_results: 500,
//     });

//     const existing = allResources.resources.find((r) => {
//       return r.bytes === fileSize;
//     });

//     if (existing) {
//       console.log(`  Reusing existing: ${existing.public_id}`);
//       return {
//         url: existing.secure_url,
//         publicId: existing.public_id,
//       };
//     }

//     const result = await cloudinary.uploader.upload(filePath, {
//       resource_type: resourceType,
//       folder: "beatflow",
//     });
//     console.log(`  Uploaded new: ${result.public_id}`);
//     return {
//       url: result.secure_url,
//       publicId: result.public_id,
//     };
//   } catch (error) {
//     console.error(`  Failed for ${filePath}:`, error.message);
//     return null;
//   }
// }

async function uploadIfNotExists(filePath, resourceType) {
  try {
    const fileSize = fs.statSync(filePath).size;

    const allResources = await cloudinary.api.resources({
      resource_type: resourceType,
      type: "upload",
      prefix: "beatflow",
      max_results: 500,
    });

    const existing = allResources.resources.find((r) => {
      return r.bytes === fileSize;
    });

    if (existing) {
      console.log(`  Reusing existing: ${existing.public_id}`);

      const optimizedExistingUrl =
        resourceType === "video"
          ? cloudinary.url(existing.public_id, {
              resource_type: "video",
              format: "mp3",
              transformation: [{ quality: "auto:low", bit_rate: "128k" }],
            })
          : existing.secure_url;

      return {
        url: optimizedExistingUrl,
        publicId: existing.public_id,
      };
    }

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: resourceType,
      folder: "beatflow",
    });

    console.log(`  Uploaded new: ${result.public_id}`);

    const optimizedUploadUrl =
      resourceType === "video"
        ? cloudinary.url(result.public_id, {
            resource_type: "video",
            format: "mp3",
            transformation: [{ quality: "auto:low", bit_rate: "128k" }],
          })
        : result.secure_url;

    return {
      url: optimizedUploadUrl,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error(`  Failed for ${filePath}:`, error.message);
    return null;
  }
}

async function seedAll() {
  try {
    await connectDB();
    console.log("Connected to database");

    const existingSongs = await Song.find({});
    if (existingSongs.length > 0) {
      console.log(
        `Found ${existingSongs.length} songs in DB. Clearing DB but keeping Cloudinary assets...`,
      );
      await Song.deleteMany({});
      await Album.deleteMany({});
    } else {
      console.log("No existing songs in DB.");
    }

    const songFiles = fs
      .readdirSync(songsDir)
      .filter((f) => f.endsWith(".mp3"))
      .sort((a, b) => {
        return parseInt(a) - parseInt(b);
      });

    const coverFiles = fs
      .readdirSync(coversDir)
      .filter((f) => f.endsWith(".jpg"))
      .sort((a, b) => {
        return parseInt(a) - parseInt(b);
      });

    const songs = [];
    const albumsMap = new Map();

    let logoUrl = "";
    if (fs.existsSync(logoPath)) {
      const logoUpload = await uploadIfNotExists(logoPath, "image");
      if (logoUpload) logoUrl = logoUpload.url;
    }

    const genres = [
      "Pop",
      "Rock",
      "Hip-Hop",
      "Electronic",
      "Jazz",
      "Classical",
      "R&B",
      "Country",
      "Indie",
      "Metal",
    ];

    for (let i = 0; i < songFiles.length; i++) {
      const songFile = songFiles[i];
      const songPath = path.join(songsDir, songFile);
      const songNumber = parseInt(songFile);
      const coverFile = coverFiles.find((f) => parseInt(f) === songNumber);

      console.log(`Processing ${i + 1}/${songFiles.length}: ${songFile}`);

      const metadata = await parseFile(songPath);
      const { common, format } = metadata;

      const title = common.title || `Song ${songNumber}`;
      const artist = common.artist || "Unknown Artist";
      const genre = common.genre?.[0] || genres[i % genres.length];
      const duration = Math.round(format.duration || 0);

      // Override song 1 to be "Pop & Rock"
      const finalTitle = songNumber === 1 ? "Pop & Rock" : title;
      const finalGenre = songNumber === 1 ? "Pop" : genre;

      let imageUrl = "";
      let imagePublicId = "";
      if (coverFile) {
        const coverPath = path.join(coversDir, coverFile);
        const coverUpload = await uploadIfNotExists(coverPath, "image");
        if (coverUpload) {
          imageUrl = coverUpload.url;
          imagePublicId = coverUpload.publicId;
        }
      }
      if (!imageUrl) {
        imageUrl = `https://placehold.co/300x300/1a1a1a/ffffff?text=${encodeURIComponent(title)}`;
      }

      const audioUpload = await uploadIfNotExists(songPath, "video");
      if (!audioUpload) {
        console.warn(`Skipping ${songFile} - failed to upload`);
        continue;
      }

      const songData = {
        title: finalTitle,
        artist,
        genre: finalGenre,
        imageUrl,
        imagePublicId,
        audioUrl: audioUpload.url,
        audioPublicId: audioUpload.publicId,
        duration,
        isFeatured: i < 3,
        isTrending: i < 5,
        isPremium: i >= 15,
      };

      songs.push(songData);
    }

    const insertedSongs = await Song.insertMany(songs);
    console.log(`\nInserted ${insertedSongs.length} songs`);

    console.log("\n=== Seeding Summary ===");
    console.log(`Songs: ${insertedSongs.length}`);
    //console.log(`Albums: ${albumArray.length}`);
    console.log(`Albums: ${albumArray.size}`);
    if (logoUrl) console.log(`Logo: ${logoUrl}`);
    console.log("\nDone!");

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seedAll();
