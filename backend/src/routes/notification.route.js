import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

const router = Router();

router.get("/", protectRoute, async (req, res) => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const notifications = await Notification.find({
      clerkId: req.userId,
      createdAt: { $gt: threeDaysAgo },
      $or: [
        { expiresAt: { $gt: new Date() } },
        { expiresAt: { $exists: false } },
        { expiresAt: null },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

router.post("/", protectRoute, async (req, res) => {
  try {
    const { title, message, type } = req.body;
    const user = await User.findOne({ clerkId: req.userId });
    const notification = new Notification({
      userId: user?._id || null,
      clerkId: req.userId,
      title,
      message,
      type: type || "info",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await notification.save();
    global.broadcastEvent?.("new-notification", {
      id: notification._id.toString(),
      title: notification.title,
      message: notification.message,
      type: notification.type,
      read: notification.read,
      createdAt: notification.createdAt.toISOString(),
    });
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: "Failed to create notification" });
  }
});

router.put("/:id/read", protectRoute, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, clerkId: req.userId },
      { read: true },
      { new: true },
    );
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: "Failed to update notification" });
  }
});

router.put("/read-all", protectRoute, async (req, res) => {
  try {
    await Notification.updateMany({ clerkId: req.userId }, { read: true });
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notifications" });
  }
});

router.delete("/:id", protectRoute, async (req, res) => {
  try {
    await Notification.findOneAndDelete({
      _id: req.params.id,
      clerkId: req.userId,
    });
    res.status(200).json({ message: "Notification deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete notification" });
  }
});

export default router;
