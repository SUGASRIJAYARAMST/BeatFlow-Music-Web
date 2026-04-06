import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getUserPlaylists,
  getPlaylistById,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
} from "../controllers/playlist.controller.js";
import {
  validate,
  createPlaylistSchema,
  updatePlaylistSchema,
} from "../middleware/validation.js";

const router = Router();
router.get("/", protectRoute, getUserPlaylists);
router.get("/:id", protectRoute, getPlaylistById);
router.post("/", protectRoute, validate(createPlaylistSchema), createPlaylist);
router.put(
  "/:id",
  protectRoute,
  validate(updatePlaylistSchema),
  updatePlaylist,
);
router.delete("/:id", protectRoute, deletePlaylist);
router.post("/:id/songs", protectRoute, addSongToPlaylist);
router.delete("/:id/songs/:songId", protectRoute, removeSongFromPlaylist);

export default router;
