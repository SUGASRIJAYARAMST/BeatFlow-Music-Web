import { Router } from "express";
import { v2 as cloudinary } from "cloudinary";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/sign-upload", protectRoute, requireAdmin, async (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    const audioParams = {
      timestamp,
      folder: "beatflow/songs",
      resource_type: "video",
    };
    
    const imageParams = {
      timestamp,
      folder: "beatflow/images",
      resource_type: "image",
    };
    
    const audioSignature = cloudinary.utils.sign_api_auth_token_params(audioParams, apiSecret);
    const imageSignature = cloudinary.utils.sign_api_auth_token_params(imageParams, apiSecret);
    
    res.json({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      audio: {
        signature: audioSignature,
        timestamp,
        folder: "beatflow/songs",
        resource_type: "video",
      },
      image: {
        signature: imageSignature,
        timestamp,
        folder: "beatflow/images",
        resource_type: "image",
      },
    });
  } catch (error) {
    console.error("Sign upload error:", error);
    res.status(500).json({ message: "Failed to generate upload credentials" });
  }
});

export default router;