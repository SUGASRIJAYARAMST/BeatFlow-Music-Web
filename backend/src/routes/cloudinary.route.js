import { Router } from "express";
import cloudinary from "../config/cloudinary.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/sign-upload", protectRoute, requireAdmin, async (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    res.json({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      timestamp,
      audio_folder: "beatflow/songs",
      image_folder: "beatflow/images",
    });
  } catch (error) {
    console.error("Sign upload error:", error);
    res.status(500).json({ message: "Failed to generate upload credentials" });
  }
});

export default router;