import { Router } from "express";
import {
  getAllSongs,
  getSongById,
  getFeaturedSongs,
  getTrendingSongs,
  getMadeForYouSongs,
  getSongsByGenre,
  getSongsByArtist,
  getRecentSongs,
  createSong,
  updateSong,
  deleteSong,
  search,
} from "../controllers/song.controller.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";
import {
  validate,
  createSongSchema,
  updateSongSchema,
} from "../middleware/validation.js";
import { searchLimiter } from "../middleware/rateLimiter.js";

const router = Router();
router.get("/", getAllSongs);
router.get("/search", searchLimiter, search);
router.get("/featured", getFeaturedSongs);
router.get("/trending", getTrendingSongs);
router.get("/made-for-you", getMadeForYouSongs);
router.get("/new", getRecentSongs);
router.get("/recent", getRecentSongs);
router.get("/genre/:genre", getSongsByGenre);
router.get("/artist/:artist", getSongsByArtist);
router.get("/:id", getSongById);
router.post(
  "/",
  protectRoute,
  requireAdmin,
  validate(createSongSchema),
  createSong,
);
router.put(
  "/:id",
  protectRoute,
  requireAdmin,
  validate(updateSongSchema),
  updateSong,
);
router.delete("/:id", protectRoute, requireAdmin, deleteSong);

export default router;
