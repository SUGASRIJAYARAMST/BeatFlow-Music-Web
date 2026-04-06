import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  passwordChangeLimiter,
  pinLimiter,
} from "../middleware/rateLimiter.js";
import PasswordChangeRequest from "../models/passwordChangeRequest.model.js";
import {
  getAllUsers,
  getCurrentUser,
  updateUserSettings,
  toggleLike,
  getLikedSongs,
  requestPasswordChange,
  setWalletPin,
  verifyWalletPin,
  getPinStatus,
  verifyPassword,
} from "../controllers/user.controller.js";

const router = Router();
router.get("/", protectRoute, getAllUsers);
router.get("/profile", protectRoute, getCurrentUser);
router.put("/settings", protectRoute, updateUserSettings);
router.post("/like", protectRoute, toggleLike);
router.get("/liked-songs", protectRoute, getLikedSongs);
router.post(
  "/request-password-change",
  protectRoute,
  passwordChangeLimiter,
  requestPasswordChange,
);
router.get("/password-change-requests", protectRoute, async (req, res) => {
  try {
    const start = Date.now();
    const requests = await PasswordChangeRequest.find({ clerkId: req.userId })
      .select("-currentPassword -newPassword")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    console.log(`Password requests query took ${Date.now() - start}ms`);
    res.status(200).json(requests);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch password change requests" });
  }
});
router.post("/wallet-pin", protectRoute, setWalletPin);
router.post("/verify-pin", protectRoute, pinLimiter, verifyWalletPin);
router.get("/pin-status", protectRoute, getPinStatus);
router.post("/verify-password", protectRoute, verifyPassword);

export default router;
