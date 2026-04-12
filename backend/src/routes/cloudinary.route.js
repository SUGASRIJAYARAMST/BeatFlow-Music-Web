import { Router } from "express";
import cloudinary from "../config/cloudinary.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/sign-upload", protectRoute, requireAdmin, async (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = "songs";
    
    const audioParams = {
      timestamp,
      folder: `beatflow/${folder}`,
      resource_type: "video",
    };
    
    const imageParams = {
      timestamp,
      folder: `beatflow/images`,
      resource_type: "image",
    };
    
    const audioSignature = cloudinary.utils.api_sign(audioParams, process.env.CLOUDINARY_API_SECRET);
    const imageSignature = cloudinary.utils.api_sign(imageParams, process.env.CLOUDINARY_API_SECRET);
    
    res.json({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      audio: {
        signature: audioSignature,
        timestamp,
        folder: `beatflow/${folder}`,
      },
      image: {
        signature: imageSignature,
        timestamp,
        folder: "beatflow/images",
      },
    });
  } catch (error) {
    console.error("Sign upload error:", error);
    res.status(500).json({ message: "Failed to generate upload credentials" });
  }
});

export default router;