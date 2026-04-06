import { Router } from "express";
import {
  getAllAlbums,
  getAlbumById,
  createAlbum,
  createAlbumWithSongs,
  updateAlbum,
  deleteAlbum,
} from "../controllers/album.controller.js";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";
import { validate, createAlbumSchema } from "../middleware/validation.js";
import { uploadLimiter } from "../middleware/rateLimiter.js";

const router = Router();
router.get("/", getAllAlbums);
router.get("/new", getAllAlbums);
router.get("/:id", getAlbumById);
router.post(
  "/",
  protectRoute,
  requireAdmin,
  uploadLimiter,
  validate(createAlbumSchema),
  createAlbum,
);
router.post(
  "/with-songs",
  protectRoute,
  requireAdmin,
  uploadLimiter,
  createAlbumWithSongs,
);
router.put("/:id", protectRoute, requireAdmin, updateAlbum);
router.delete("/:id", protectRoute, requireAdmin, deleteAlbum);

export default router;
