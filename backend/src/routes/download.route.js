import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  downloadSong,
  getDownloadedSongs,
} from "../controllers/download.controller.js";

const router = Router();
router.get("/purchased", protectRoute, getDownloadedSongs);
router.get("/:songId", protectRoute, downloadSong);

export default router;
