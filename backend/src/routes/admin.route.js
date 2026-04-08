import { Router } from "express";
import multer from "multer";
import { protectRoute, requireAdmin } from "../middleware/auth.middleware.js";
import {
  getDashboardStats,
  getAllUsersForAdmin,
  getSubscriptionDetails,
  toggleUserPremium,
  deleteUser,
  getPasswordChangeRequests,
  approvePasswordChange,
  rejectPasswordChange,
  forceRejectPasswordChange,
  verifyQrPayment,
  getPendingQrPayments,
} from "../controllers/admin.controller.js";
import { createSong, deleteSong } from "../controllers/song.controller.js";
import {
  createAlbum,
  createAlbumWithSongs,
  deleteAlbum,
} from "../controllers/album.controller.js";
import {
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcement.controller.js";
import { getOffer, saveOffer } from "../controllers/offer.controller.js";

const router = Router();

router.get("/offer", getOffer);
router.post("/offer", protectRoute, requireAdmin, saveOffer);

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 1000 * 1024 * 1024 } });

const albumUpload = upload.fields([
  { name: "imageFile", maxCount: 1 },
  { name: "audio_0", maxCount: 1 },
  { name: "audio_1", maxCount: 1 },
  { name: "audio_2", maxCount: 1 },
  { name: "audio_3", maxCount: 1 },
  { name: "audio_4", maxCount: 1 },
  { name: "audio_5", maxCount: 1 },
  { name: "audio_6", maxCount: 1 },
  { name: "audio_7", maxCount: 1 },
  { name: "audio_8", maxCount: 1 },
  { name: "audio_9", maxCount: 1 },
  { name: "audio_10", maxCount: 1 },
  { name: "audio_11", maxCount: 1 },
  { name: "audio_12", maxCount: 1 },
  { name: "audio_13", maxCount: 1 },
  { name: "audio_14", maxCount: 1 },
  { name: "audio_15", maxCount: 1 },
  { name: "audio_16", maxCount: 1 },
  { name: "audio_17", maxCount: 1 },
  { name: "audio_18", maxCount: 1 },
  { name: "audio_19", maxCount: 1 },
  { name: "songImage_0", maxCount: 1 },
  { name: "songImage_1", maxCount: 1 },
  { name: "songImage_2", maxCount: 1 },
  { name: "songImage_3", maxCount: 1 },
  { name: "songImage_4", maxCount: 1 },
  { name: "songImage_5", maxCount: 1 },
  { name: "songImage_6", maxCount: 1 },
  { name: "songImage_7", maxCount: 1 },
  { name: "songImage_8", maxCount: 1 },
  { name: "songImage_9", maxCount: 1 },
  { name: "songImage_10", maxCount: 1 },
  { name: "songImage_11", maxCount: 1 },
  { name: "songImage_12", maxCount: 1 },
  { name: "songImage_13", maxCount: 1 },
  { name: "songImage_14", maxCount: 1 },
  { name: "songImage_15", maxCount: 1 },
  { name: "songImage_16", maxCount: 1 },
  { name: "songImage_17", maxCount: 1 },
  { name: "songImage_18", maxCount: 1 },
  { name: "songImage_19", maxCount: 1 },
]);

router.get("/stats", protectRoute, requireAdmin, getDashboardStats);
router.get("/users", protectRoute, requireAdmin, getAllUsersForAdmin);
router.get(
  "/subscriptions",
  protectRoute,
  requireAdmin,
  getSubscriptionDetails,
);
router.put(
  "/users/:userId/premium",
  protectRoute,
  requireAdmin,
  toggleUserPremium,
);
router.delete("/users/:userId", protectRoute, requireAdmin, deleteUser);

router.post("/songs", protectRoute, requireAdmin, createSong);
router.delete("/songs/:id", protectRoute, requireAdmin, deleteSong);
router.post("/albums", protectRoute, requireAdmin, createAlbum);
router.post(
  "/albums/with-songs",
  protectRoute,
  requireAdmin,
  albumUpload,
  createAlbumWithSongs,
);
router.delete("/albums/:id", protectRoute, requireAdmin, deleteAlbum);

router.get("/announcements", protectRoute, requireAdmin, getAllAnnouncements);
router.post("/announcements", protectRoute, requireAdmin, createAnnouncement);
router.put(
  "/announcements/:id",
  protectRoute,
  requireAdmin,
  updateAnnouncement,
);
router.delete(
  "/announcements/:id",
  protectRoute,
  requireAdmin,
  deleteAnnouncement,
);

router.get(
  "/password-requests",
  protectRoute,
  requireAdmin,
  getPasswordChangeRequests,
);
router.post(
  "/password-requests/:requestId/approve",
  protectRoute,
  requireAdmin,
  approvePasswordChange,
);
router.post(
  "/password-requests/:requestId/reject",
  protectRoute,
  requireAdmin,
  rejectPasswordChange,
);
router.post(
  "/password-requests/:requestId/force-reject",
  protectRoute,
  requireAdmin,
  forceRejectPasswordChange,
);

router.get("/qr-payments", protectRoute, requireAdmin, getPendingQrPayments);
router.post("/qr-payments/:paymentId/verify", protectRoute, requireAdmin, verifyQrPayment);

export default router;
